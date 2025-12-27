import pandas as pd
import os
import datetime

# --- CONFIGURATION ---
# Script is in 'scraper/', so we go up one level to find the root
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)

# We will mount the database branch into the 'public' folder
# So the data path will be: root/public/data
DATA_DIR = os.path.join(BASE_DIR, "public", "data")
PRICES_DIR = os.path.join(DATA_DIR, "prices")

# Target current year
current_year = datetime.datetime.now().year
PARQUET_PATH = os.path.join(PRICES_DIR, f"year={current_year}", "data.parquet")

def fix_database():
    print(f"📂 Looking for database at: {PARQUET_PATH}")
    
    if not os.path.exists(PARQUET_PATH):
        print(f"❌ Error: Database not found.")
        return

    print(f"Loading database...")
    df = pd.read_parquet(PARQUET_PATH)
    old_count = len(df)
    
    # 1. FIX NAMES (Append Unit)
    def fix_name(row):
        name = row['name']
        unit = row['unit']
        # If unit is valid and not already in name
        if unit and unit != "N/A" and str(unit) not in name:
            return f"{name} {unit}"
        return name

    df['name'] = df.apply(fix_name, axis=1)

    # 2. DROP DUPLICATES
    # Now that names are unique ("Oil 1L", "Oil 5L"), we can drop true duplicates
    df = df.drop_duplicates(subset=['date', 'name', 'unit'], keep='first')
    df = df.sort_values(by=['name', 'date'])

    print(f"Rows: {old_count} -> {len(df)}")

    # 3. SAVE PARQUET
    df.to_parquet(PARQUET_PATH, index=False, compression='snappy')

    # 4. REGENERATE META.JSON
    # We use the LAST seen price for the search index
    meta_df = df.sort_values('date').drop_duplicates('name', keep='last')
    meta_df = meta_df[['name', 'category', 'unit', 'image', 'price']]
    
    meta_path = os.path.join(DATA_DIR, "meta.json")
    meta_df.to_json(meta_path, orient='records')

    print("✅ Fix Complete.")

if __name__ == "__main__":
    fix_database()