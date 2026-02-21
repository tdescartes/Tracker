"""
SYSTEM DOCUMENTATION:
- Engine: PaddleOCR (CPU Mobile v4) + Gemini 1.5 Flash.
- Strategy: Hybrid Metadata/OCR + LLM Structuring.
- Goal: Convert messy financial docs into Analysis-ready CSVs.
"""

import os
import json
import csv
import pdfplumber
from paddleocr import PaddleOCR
import google.generativeai as genai
import pandas as pd

# --- CONFIGURATION ---
GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# Optimized for CPU (no GPU required)
ocr_engine = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False, show_log=False)

def extract_raw_text(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        with pdfplumber.open(file_path) as pdf:
            text = "\n".join([p.extract_text() for p in pdf.pages if p.extract_text()])
            if text.strip(): return text # Return if digital text found
    
    # Run OCR if image or scanned PDF
    print(f"--- Running CPU-OCR on {os.path.basename(file_path)} ---")
    result = ocr_engine.ocr(file_path, cls=True)
    return " ".join([line[1][0] for res in result for line in res])

def get_structured_data(raw_text):
    # Keyword check for classification
    is_bank = any(x in raw_text.lower() for x in ['statement', 'balance', 'account', 'iban', 'bic'])

    if is_bank:
        role = "Bank Statement Parser"
        example = '[{"date": "2023-01-01", "description": "Starbucks", "amount": -5.50, "balance": 1200.00}]'
        instructions = "Extract the transaction table. Ensure amounts are negative for debits and positive for credits."
    else:
        role = "Store Receipt Parser"
        example = '{"merchant": "Walmart", "date": "2023-01-01", "total": 45.99, "tax": 3.20, "items": "List items as comma string"}'
        instructions = "Extract merchant name, date, total, and tax. Flatten the items list into a single string."

    prompt = f"""
    Role: {role}
    Task: {instructions}
    Output Format: Return ONLY a JSON object/list matching this example: {example}
    
    Rules:
    1. No currency symbols (e.g., use 10.50 not $10.50).
    2. Dates must be YYYY-MM-DD.
    3. Fix OCR typos (e.g. 'S10' to 10.00).

    RAW TEXT:
    {raw_text}
    """
    
    response = model.generate_content(prompt)
    return response.text.replace("```json", "").replace("```", "").strip()

def save_to_analysis_file(json_data, filename="financial_data.csv"):
    try:
        data = json.loads(json_data)
        # Handle both single objects (Receipts) and lists (Bank Statements)
        if isinstance(data, dict): data = [data]
        
        df = pd.DataFrame(data)
        
        # Append to existing file or create new
        if not os.path.isfile(filename):
            df.to_csv(filename, index=False)
        else:
            df.to_csv(filename, mode='a', header=False, index=False)
        print(f"--- Successfully saved to {filename} ---")
    except Exception as e:
        print(f"Error saving to CSV: {e}")

# --- MAIN EXECUTION ---
def process_document(path):
    # 1. Get Text
    raw_text = extract_raw_text(path)
    
    # 2. Structure with Gemini
    print("--- Structuring with Gemini API... ---")
    json_output = get_structured_data(raw_text)
    
    # 3. Save to Table
    save_to_analysis_file(json_output)

if __name__ == "__main__":
    # Replace with your actual file
    my_file = "receipt_test.jpg" 
    process_document(my_file)