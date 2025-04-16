from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import re

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# MongoDB connection
MONGO_URI = ""  # Change this to your MongoDB connection string
client = MongoClient(MONGO_URI)
db = client["dna"]  # Database name
collection = db["barcodes"]  # Collection name

# Reference DNA barcode regions (mock data for comparison)
BARCODE_REGIONS = {
    "ITS": "CGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTG",
    "RBCL": "ATGTCACCACAAACAGAGACTAAAGCAAGT",
    "MATK": "ACCCAGTCCATCTGGAAATCTTGGTTCAGG"
}

def validate_dna_sequence(sequence):
    """Validates if a sequence contains only A, T, G, C"""
    clean_sequence = re.sub(r'\s', '', sequence.upper())
    return bool(re.match(r'^[ATGC]+$', clean_sequence))

def identify_barcode_region(sequence):
    """Determines which barcode region a sequence most likely belongs to"""
    best_match = ''
    highest_score = 0
    
    for region, reference_sequence in BARCODE_REGIONS.items():
        score = calculate_similarity(sequence, reference_sequence)
        if score > highest_score:
            highest_score = score
            best_match = region
    
    return best_match

def calculate_similarity(seq1, seq2):
    """Calculates similarity score between two sequences"""
    shortest_length = min(len(seq1), len(seq2))
    matches = sum(1 for i in range(shortest_length) if seq1[i] == seq2[i])
    return matches / shortest_length if shortest_length > 0 else 0

def analyze_dna_sequence(sequence):
    """Analyzes a DNA sequence and returns the best match from the database"""
    if not validate_dna_sequence(sequence):
        return None
    
    clean_sequence = re.sub(r'\s', '', sequence.upper())
    barcode_region = identify_barcode_region(clean_sequence)
    
    best_match = None
    highest_score = 0

    # Fetch plant barcodes from MongoDB
    plant_barcodes = collection.find({}, {"species": 1, "commonName": 1, "barcodes": 1, "authenticity": 1})

    for plant in plant_barcodes:
        plant_barcode = plant["barcodes"].get(barcode_region)
        if plant_barcode:
            score = calculate_similarity(clean_sequence, plant_barcode)
            if score > highest_score:
                highest_score = score
                best_match = {
                    "matchedSpecies": plant["species"],
                    "commonName": plant["commonName"],
                    "confidenceScore": plant["authenticity"] * score,
                    "matchPercentage": score * 100,
                    "barcodeRegion": barcode_region,
                    "sequence": clean_sequence
                }
    
    return best_match

@app.route('/api/analyze', methods=['POST'])
def analyze_sequence():
    data = request.json
    if not data or 'sequence' not in data:
        return jsonify({"error": "No sequence provided"}), 400
    
    sequence = data['sequence']
    result = analyze_dna_sequence(sequence)
    
    if not result:
        return jsonify({"error": "Invalid DNA sequence or no match found"}), 400
    
    return jsonify(result)

@app.route('/api/samples', methods=['GET'])
def get_samples():
    samples = {}
    plants = collection.find({}, {"commonName": 1, "barcodes": 1})

    for plant in plants:
        for barcode_type, sequence in plant["barcodes"].items():
            samples[plant["commonName"]] = sequence
            break  # Only take the first barcode for each plant
    
    return jsonify(samples)

if __name__ == '__main__':
    app.run(debug=True)
