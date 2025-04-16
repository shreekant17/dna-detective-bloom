# DNA Detective Bloom

A web application for DNA barcode analysis and plant identification.

## Features

- DNA sequence analysis
- Barcode scanning
- Database comparison
- Sample sequence library

## Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- MongoDB (v4.4 or higher)

## Setup Instructions

### 1. Install MongoDB

#### Windows
1. Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the instructions
3. MongoDB will be installed as a service and will start automatically

#### macOS
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Linux (Ubuntu)
```bash
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### 2. Set up the Backend

1. Navigate to the server directory:
```bash
cd dna-detective-bloom/server
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Set up environment variables:
   - Create a `.env` file in the server directory with the following content:
   ```
   MONGODB_URI=mongodb://localhost:27017
   ```
   - You can modify the MongoDB URI if you're using a different MongoDB setup

6. Initialize the database with sample data:
```bash
python init_db.py
```

7. Start the backend server:
   - Windows: Run `run_server.bat`
   - macOS/Linux: Run `./run_server.sh` (make sure to make it executable with `chmod +x run_server.sh`)
   - Or manually: `uvicorn app:app --reload`

### 3. Set up the Frontend

1. Navigate to the project directory:
```bash
cd dna-detective-bloom
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **DNA Sequence Analysis**: Enter a DNA sequence or upload a file containing a sequence
2. **Barcode Scanning**: Use your camera to scan a DNA barcode
3. **Database Comparison**: Compare your sequence with the database
4. **Sample Library**: Browse and use sample sequences

## Troubleshooting

### MongoDB Connection Issues

If you encounter MongoDB connection issues:

1. Make sure MongoDB is running:
   - Windows: Check Services app for "MongoDB"
   - macOS/Linux: `brew services list` or `sudo systemctl status mongodb`

2. Verify the connection string in `server/.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017
   ```

3. Run the MongoDB connection check:
   ```bash
   cd server
   python check_mongodb.py
   ```

## License

MIT
