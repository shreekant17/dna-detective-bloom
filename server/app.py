from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
import os
import re
from dotenv import load_dotenv
import socket
import uvicorn

# Load environment variables from .env file
load_dotenv()

# FastAPI app initialization
app = FastAPI()

# Enable CORS for all origins and routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection with Atlas
MONGO_URI = os.getenv("MONGODB_URI")
if not MONGO_URI:
    raise ValueError("MONGODB_URI environment variable is not set")

# Configure socket timeout to prevent DNS resolution issues
socket.setdefaulttimeout(30)

# Connect to MongoDB Atlas with appropriate timeout settings
client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=30000,
    connectTimeoutMS=30000,
    socketTimeoutMS=30000,
    retryWrites=True
)

# Test the connection
try:
    # Force a connection attempt
    client.server_info()
    print("Successfully connected to MongoDB Atlas!")
except Exception as e:
    print(f"Error connecting to MongoDB Atlas: {e}")
    # Continue anyway, the connection might succeed later

db = client["dna"]
collection = db["barcodes"]

# Reference DNA barcode regions
BARCODE_REGIONS = {
    "ITS": "CGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTG",
    "RBCL": "ATGTCACCACAAACAGAGACTAAAGCAAGT",
    "MATK": "ACCCAGTCCATCTGGAAATCTTGGTTCAGG"
}

# Pydantic model for request
class DNASequenceRequest(BaseModel):
    sequence: str

# Utility Functions
def validate_dna_sequence(sequence: str) -> bool:
    clean_sequence = re.sub(r'\s', '', sequence.upper())
    return bool(re.match(r'^[ATGC]+$', clean_sequence))

def calculate_similarity(seq1: str, seq2: str) -> float:
    shortest_length = min(len(seq1), len(seq2))
    matches = sum(1 for i in range(shortest_length) if seq1[i] == seq2[i])
    return matches / shortest_length if shortest_length > 0 else 0

def identify_barcode_region(sequence: str) -> str:
    best_match = ''
    highest_score = 0
    for region, reference_sequence in BARCODE_REGIONS.items():
        score = calculate_similarity(sequence, reference_sequence)
        if score > highest_score:
            highest_score = score
            best_match = region
    return best_match

def analyze_dna_sequence(sequence: str):
    if not validate_dna_sequence(sequence):
        return None

    clean_sequence = re.sub(r'\s', '', sequence.upper())
    barcode_region = identify_barcode_region(clean_sequence)

    best_match = None
    highest_score = 0

    plant_barcodes = collection.find({}, {"species": 1, "commonName": 1, "barcodes": 1, "authenticity": 1})

    for plant in plant_barcodes:
        plant_barcode = plant.get("barcodes", {}).get(barcode_region)
        if plant_barcode:
            score = calculate_similarity(clean_sequence, plant_barcode)
            if score > highest_score:
                highest_score = score
                best_match = {
                    "matchedSpecies": plant["species"],
                    "commonName": plant["commonName"],
                    "confidenceScore": plant.get("authenticity", 1) * score,
                    "matchPercentage": score * 100,
                    "barcodeRegion": barcode_region,
                    "sequence": clean_sequence
                }

    return best_match

# API Endpoints
@app.post("/api/analyze")
async def analyze_sequence(request: DNASequenceRequest):
    result = analyze_dna_sequence(request.sequence)
    if not result:
        raise HTTPException(status_code=400, detail="Invalid DNA sequence or no match found")
    return result

@app.get("/api/samples")
async def get_samples():
    samples = {}
    plants = collection.find({}, {"commonName": 1, "barcodes": 1})
    for plant in plants:
        for barcode_type, sequence in plant["barcodes"].items():
            samples[plant["commonName"]] = sequence
            break  # Only take the first barcode for each plant
    return samples

@app.get("/")
def greet_json():
    return {"Hello": "World!"}

# Start the server when run directly
if __name__ == "__main__":
    print("Starting FastAPI server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
