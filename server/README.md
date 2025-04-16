---
title: Dna Backend
emoji: 🐠
colorFrom: yellow
colorTo: pink
sdk: docker
pinned: false
short_description: backend for fastapi project
---

Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference

# DNA Detective Bloom - Backend

Backend server for the DNA Detective Bloom application.

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

Create a `.env` file in the server directory with the following content:

```
MONGODB_URI=mongodb://localhost:27017
```

You can modify the MongoDB URI if you're using a different MongoDB setup.

### 3. Start the Server

Run the following command to start the server:

```bash
uvicorn app:app --reload
```

Or use the provided scripts:
- Windows: `run_server.bat`
- macOS/Linux: `./run_server.sh` (make sure to make it executable with `chmod +x run_server.sh`)

The server will be available at http://localhost:8000

## API Endpoints

- `GET /`: Health check endpoint
- `POST /api/analyze`: Analyze a DNA sequence
- `GET /api/samples`: Get sample DNA sequences

## Troubleshooting

If you encounter MongoDB connection issues:

1. Make sure MongoDB is installed and running
2. Check the MongoDB connection string in the `.env` file
3. Run `python check_mongodb.py` to diagnose connection issues
