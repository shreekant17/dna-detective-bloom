
# DNA Detective Backend

This is a Flask-based backend for the DNA Detective application, which provides API endpoints for DNA sequence analysis.

## Setup

1. Create a virtual environment:
   ```
   python -m venv venv
   ```

2. Activate the virtual environment:
   - On Windows:
     ```
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```
     source venv/bin/activate
     ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Run the Flask application:
   ```
   python app.py
   ```

The server will start at `http://localhost:5000`

## API Endpoints

### 1. Analyze DNA Sequence
- **URL**: `/api/analyze`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "sequence": "ATGCATGCATGC"
  }
  ```
- **Response**:
  ```json
  {
    "matchedSpecies": "Panax ginseng",
    "commonName": "Asian Ginseng",
    "confidenceScore": 0.85,
    "matchPercentage": 92.5,
    "barcodeRegion": "ITS",
    "sequence": "ATGCATGCATGC"
  }
  ```

### 2. Get Sample Sequences
- **URL**: `/api/samples`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "Asian Ginseng": "CGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTGTCGAAACCTGCATAGCAGAA",
    "Sweet Basil": "ATGTCACCACAAACAGAGACTAAAGCAAGTGTTGGATTCAAAGCTGGTGT",
    "Turmeric": "CGTAACAAGGTTTCCGTAGGTGAACCTGCGGAAGGATCATTGAGTGAAACCTGC"
  }
  ```
