
from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import random

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Mock DNA barcode regions for demonstration
BARCODE_REGIONS = {
    "ITS": "CGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTG",
    "RBCL": "ATGTCACCACAAACAGAGACTAAAGCAAGT",
    "MATK": "ACCCAGTCCATCTGGAAATCTTGGTTCAGG"
}

# Sample database of plant species DNA
DNA_DATABASE = [
    { 
        "id": 1, 
        "species": "Panax ginseng", 
        "commonName": "Asian Ginseng",
        "barcodes": { 
            "ITS": "CGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTGTCGAAACCTGCATAGCAGAA",
            "RBCL": "ATGTCACCACAAACAGAGACTAAAGCAAGTGTTGGATTCAAAGCTGGTGTTAAA",
            "MATK": "ACCCAGTCCATCTGGAAATCTTGGTTCAGGACTCCCCTTCTTATATAATTCT"
        },
        "authenticity": 0.97
    },
    { 
        "id": 2, 
        "species": "Ocimum basilicum", 
        "commonName": "Sweet Basil",
        "barcodes": { 
            "ITS": "CGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTGTCGAAACCTGCATAGCAGA",
            "RBCL": "ATGTCACCACAAACAGAGACTAAAGCAAGTGTTGGATTCAAAGCTGGTGT",
            "MATK": "ACCCAGTCCATCTGGAAATCTTGGTTCAGGACTCCCCCTATATAATTCT"
        },
        "authenticity": 0.95
    },
    { 
        "id": 3, 
        "species": "Curcuma longa", 
        "commonName": "Turmeric",
        "barcodes": { 
            "ITS": "CGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTGAGTGAAACCTGC",
            "RBCL": "ATGTCACCACAAACAGAGACTAAAGCAAGTGTTGGATTTAAAGCTGGTGTT",
            "MATK": "ACCCAGTCCATCTGGAAATCTTGGTTCAGGACTCCCTTCTATATAATTCTCATG"
        },
        "authenticity": 0.92
    }
]

def validate_dna_sequence(sequence):
    """Validates if a sequence is a proper DNA sequence (contains only A, T, G, C)"""
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
    # For demonstration, using a simple matching algorithm
    shortest_length = min(len(seq1), len(seq2))
    matches = 0
    
    for i in range(shortest_length):
        if seq1[i] == seq2[i]:
            matches += 1
    
    return matches / shortest_length

def analyze_dna_sequence(sequence):
    """Analyzes a DNA sequence and returns the best match from the database"""
    if not validate_dna_sequence(sequence):
        return None
    
    clean_sequence = re.sub(r'\s', '', sequence.upper())
    barcode_region = identify_barcode_region(clean_sequence)
    
    best_match = None
    highest_score = 0
    
    for plant in DNA_DATABASE:
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
    for plant in DNA_DATABASE:
        # Just use the first barcode we find for each plant
        for barcode_type, sequence in plant["barcodes"].items():
            samples[plant["commonName"]] = sequence
            break
    
    return jsonify(samples)

if __name__ == '__main__':
    app.run(debug=True)
