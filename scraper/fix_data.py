import pandas as pd
import os
import datetime

# --- CONFIGURATION ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(CURRENT_DIR, "public", "data")
PRICES_DIR = os.path.join(DATA_DIR, "prices")

# Target the current year's data
current_year = datetime.datetime.now().year
PARQUET_PATH = os.path.join(PRICES_DIR, f"year={current_year}", "data.parquet")

def fix_database():
    if not os.path.exists(PARQUET_PATH):
        print(f"❌ No database found at {PARQUET_PATH}")
        return

    print(f"Loading database from {PARQUET_PATH}...")
    df = pd.read_parquet(PARQUET_PATH)
    old_count = len(df)
    print(f"Original Row Count: {old_count}")

    # --- 1. APPLY THE NAME FIX ---
    def fix_name(row):
        name = row['name']
        unit = row['unit']
        # If unit exists, isn't N/A, and isn't already in the name
        if unit and unit != "N/A" and str(unit) not in name:
            return f"{name} {unit}"
        return name

    df['name'] = df.apply(fix_name, axis=1)

    # --- 2. REMOVE DUPLICATES ---
    # Now that names are unique (e.g., "Oil 1L", "Oil 5L"), we can safely drop dupes
    df = df.drop_duplicates(subset=['date', 'name', 'unit'], keep='first')
    
    # Sort nicely
    df = df.sort_values(by=['name', 'date'])

    new_count = len(df)
    print(f"New Row Count: {new_count} (Removed {old_count - new_count} duplicates)")

    # --- 3. SAVE BACK TO PARQUET ---
    print("Saving fixed database...")
    df.to_parquet(PARQUET_PATH, index=False, compression='snappy')

    # --- 4. REGENERATE META.JSON ---
    print("Regenerating meta.json...")
    meta_df = df.sort_values('date').drop_duplicates('name', keep='last')
    meta_df = meta_df[['name', 'category', 'unit', 'image', 'price']]
    
    meta_path = os.path.join(DATA_DIR, "meta.json")
    meta_df.to_json(meta_path, orient='records')

    print("✅ Database Fixed Successfully!")

if __name__ == "__main__":
    fix_database()