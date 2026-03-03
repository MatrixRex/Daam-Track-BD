import pandas as pd
import json
import os

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRICES_DIR = os.path.join(BASE_DIR, "public", "data", "prices")
META_FILE = os.path.join(BASE_DIR, "public", "data", "meta.json")

def check_data():
    print("--- DATA INSPECTION TOOL ---")
    
    # 1. Check Parquet Database
    print("\n[1] Checking Parquet Database...")
    found_any = False
    for root, dirs, files in os.walk(PRICES_DIR):
        for file in files:
            if file.endswith(".parquet"):
                path = os.path.join(root, file)
                df = pd.read_parquet(path)
                print(f"File: {os.path.relpath(path, BASE_DIR)}")
                print(f"  > Total Records: {len(df)}")
                print(f"  > Columns: {list(df.columns)}")
                print(f"  > Date Range: {df['date'].min()} to {df['date'].max()}")
                print(f"  > Unique Products: {df['name'].nunique()}")
                
                print("\nSample Data (First 5 items):")
                print(df[['name', 'category', 'price']].head())
                found_any = True
                
    if not found_any:
        print("  > No Parquet files found!")

    # 2. Check Meta JSON (Search Index)
    print("\n[2] Checking Search Index (meta.json)...")
    if os.path.exists(META_FILE):
        with open(META_FILE, 'r', encoding='utf-8') as f:
            meta = json.load(f)
            print(f"  > Total Items in Index: {len(meta)}")
            if meta:
                print("  > First entry sample:")
                print(json.dumps(meta[0], indent=2))
    else:
        print("  > meta.json not found!")

if __name__ == "__main__":
    check_data()
