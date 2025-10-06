Online Notes Sharing System - Setup Guide
Follow these steps to set up the project on your local system:

Install Python 3.11 or newer

Download from https://www.python.org/downloads/
Clone or copy the project folder to your local machine

Open a terminal in the project directory

Install all required Python libraries

Run:
pip install -r requirements.txt
Run the Flask app

Start the server:
python main.py
Access the website

Open your browser and go to: http://127.0.0.1:5000/
Default folders and files

Uploaded documents will be saved in src/uploads/
Database file will be auto-created as notes.db in src/uploads/
Troubleshooting

If you change the database model, delete notes.db and restart the app.
For any errors, check the terminal output for details.
