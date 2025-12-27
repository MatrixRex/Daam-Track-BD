import pandas as pd
import os

def fix_database():
    # We are running from the root 'main_code' directory
    base_path = os.getcwd() 
    
    # Construct the exact path: public/data/prices/year=2025/data.parquet
    parquet_path = os.path.join(base_path, "public", "data", "prices", "year=2025", "data.parquet")
    
    print(f"Target Database Path: {parquet_path}")

    if not os.path.exists(parquet_path):
        print(f"Error: File not found at {parquet_path}")
        # Debugging: check if public/data even exists
        public_data = os.path.join(base_path, "public", "data")
        if os.path.exists(public_data):
            print(f"Contents of public/data: {os.listdir(public_data)}")
        else:
            print("Folder public/data does not exist.")
        return

    print("File found. Loading database...")
    
    try:
        df = pd.read_parquet(parquet_path)
        old_count = len(df)
        print(f"Loaded {old_count} rows.")

        # --- APPLY FIX ---
        print("Applying name and unit fix...")
        def fix_name(row):
            name = row['name']
            unit = row['unit']
            # If unit exists, is not N/A, and is not already in the name
            if unit and unit != "N/A" and str(unit) not in name:
                return f"{name} {unit}"
            return name

        df['name'] = df.apply(fix_name, axis=1)
        
        # Deduplicate based on the new unique names
        df = df.drop_duplicates(subset=['date', 'name', 'unit'], keep='first')
        df = df.sort_values(by=['name', 'date'])
        # -----------------

        print(f"New row count: {len(df)} (Removed {old_count - len(df)} duplicates)")

        # SAVE PARQUET
        df.to_parquet(parquet_path, index=False, compression='snappy')
        print("Saved fixed parquet file.")

        # REGENERATE META.JSON
        # Path: public/data/meta.json
        meta_path = os.path.join(base_path, "public", "data", "meta.json")
        print(f"Regenerating meta.json at {meta_path}...")
        
        # We use the LAST seen price for the search index
        meta_df = df.sort_values('date').drop_duplicates('name', keep='last')
        meta_df = meta_df[['name', 'category', 'unit', 'image', 'price']]
        meta_df.to_json(meta_path, orient='records')

        print("SUCCESS: Database repair finished.")
        
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

if __name__ == "__main__":
    fix_database()
