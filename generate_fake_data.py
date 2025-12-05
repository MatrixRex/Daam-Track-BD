import pandas as pd
import numpy as np
import os
import shutil
from datetime import datetime, timedelta

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "public", "data")
PRICES_DIR = os.path.join(DATA_DIR, "prices")

# Clean up old data to ensure a fresh start
if os.path.exists(DATA_DIR):
    shutil.rmtree(DATA_DIR)
os.makedirs(PRICES_DIR, exist_ok=True)

# Fake Products List
# (Name, Base Price, Category, Unit)
products = [
    ("Green Apple", 220, "Fruits", "1 kg"),
    ("Malta (Imported)", 180, "Fruits", "1 kg"),
    ("Banana (Sagor)", 110, "Fruits", "1 dozen"),
    ("Pineapple", 60, "Fruits", "each"),
    ("Potato (Regular)", 45, "Vegetables", "1 kg"),
    ("Tomato", 80, "Vegetables", "1 kg"),
    ("Onion (Local)", 90, "Vegetables", "1 kg"),
    ("Egg (Chicken)", 150, "Eggs", "12 pcs"),
    ("Beef (Bone In)", 750, "Meat", "1 kg"),
    ("Chicken (Broiler)", 210, "Meat", "1 kg"),
    ("Hilsha Fish", 1200, "Fish", "1 kg"),
    ("Rui Fish", 450, "Fish", "1 kg"),
    ("Miniket Rice", 75, "Rice", "1 kg"),
    ("Soybean Oil", 190, "Oil", "1 liter"),
    ("Milk (Liquid)", 90, "Dairy", "1 liter"),
    ("Dishwashing Liquid", 120, "Cleaning", "500 ml"),
    ("Laundry Detergent", 150, "Cleaning", "1 kg"),
    ("Hand Wash", 80, "Personal Care", "250 ml"),
    ("Sugar", 130, "Grocery", "1 kg"),
    ("Salt", 40, "Grocery", "1 kg"),
]

print("Generating 90 days of fake history...")

data_rows = []
today = datetime.now()
dates = [today - timedelta(days=x) for x in range(90)]
dates.reverse() # Start from 90 days ago

for product in products:
    name, price, category, unit = product
    current_price = price
    
    # Generate a random "Image Hash" filename
    img_hash = f"{abs(hash(name))}.webp"

    for date in dates:
        # Random Walk: Price fluctuates by -5 to +5 taka per day
        change = np.random.randint(-5, 6) 
        
        # Occasionally a big jump (Inflation/Discount)
        if np.random.random() > 0.95:
            change = np.random.randint(-20, 21)

        current_price += change
        current_price = max(10, current_price) # Price can't be negative

        data_rows.append({
            "date": date.strftime("%Y-%m-%d"),
            "name": name,
            "price": current_price,
            "unit": unit,
            "category": category,
            "image": img_hash # Placeholder image name
        })

# Create DataFrame
df = pd.DataFrame(data_rows)

# --- CRITICAL: Match Production Sorting ---
# We sort by Name first to optimize DuckDB queries
df = df.sort_values(by=['name', 'date'])

# --- Save Partitioned Parquet ---
# We simulate the current year
current_year = today.year
year_path = os.path.join(PRICES_DIR, f"year={current_year}")
os.makedirs(year_path, exist_ok=True)
parquet_file = os.path.join(year_path, "data.parquet")

df.to_parquet(parquet_file, index=False, compression='snappy')
print(f"Saved Parquet: {parquet_file}")

# --- Save Meta JSON ---
# Latest entry for each product
meta_df = df.drop_duplicates(subset=['name'], keep='last')
meta_df = meta_df[['name', 'category', 'unit', 'image', 'price']]
meta_json_path = os.path.join(DATA_DIR, "meta.json")
meta_df.to_json(meta_json_path, orient='records')
print(f"Saved Meta JSON: {meta_json_path}")

print("\nFake Data Generation Complete! You are ready to code the frontend.")