import pandas as pd
import numpy as np
import os
import shutil
from datetime import datetime, timedelta
import random

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
    # Fruits
    ("Green Apple", 220, "Fruits", "1 kg"),
    ("Malta (Imported)", 180, "Fruits", "1 kg"),
    ("Banana (Sagor)", 110, "Fruits", "1 dozen"),
    ("Pineapple", 60, "Fruits", "each"),
    ("Watermelon", 50, "Fruits", "1 kg"),
    ("Guava", 80, "Fruits", "1 kg"),
    ("Pomegranate", 350, "Fruits", "1 kg"),
    ("Orange (Sweet)", 250, "Fruits", "1 kg"),
    ("Papaya", 120, "Fruits", "1 kg"),
    ("Mango (Langra)", 140, "Fruits", "1 kg"),
    ("Lychee", 400, "Fruits", "100 pcs"),
    ("Dragon Fruit", 300, "Fruits", "1 kg"),
    
    # Vegetables
    ("Potato (Regular)", 45, "Vegetables", "1 kg"),
    ("Tomato", 80, "Vegetables", "1 kg"),
    ("Onion (Local)", 90, "Vegetables", "1 kg"),
    ("Onion (Imported)", 70, "Vegetables", "1 kg"),
    ("Garlic (Local)", 160, "Vegetables", "1 kg"),
    ("Ginger", 200, "Vegetables", "1 kg"),
    ("Green Chili", 120, "Vegetables", "1 kg"),
    ("Eggplant (Long)", 60, "Vegetables", "1 kg"),
    ("Cucumber", 50, "Vegetables", "1 kg"),
    ("Cauliflower", 40, "Vegetables", "each"),
    ("Cabbage", 35, "Vegetables", "each"),
    ("Spinach", 20, "Vegetables", "bundle"),
    ("Carrot", 60, "Vegetables", "1 kg"),
    ("Lemon", 30, "Vegetables", "4 pcs"),
    
    # Eggs & Meat
    ("Egg (Chicken)", 150, "Eggs", "12 pcs"),
    ("Egg (Duck)", 180, "Eggs", "12 pcs"),
    ("Beef (Bone In)", 750, "Meat", "1 kg"),
    ("Beef (Boneless)", 950, "Meat", "1 kg"),
    ("Chicken (Broiler)", 210, "Meat", "1 kg"),
    ("Chicken (Sonali)", 320, "Meat", "1 kg"),
    ("Chicken (Local)", 550, "Meat", "1 kg"),
    ("Mutton", 1100, "Meat", "1 kg"),
    
    # Fish
    ("Hilsha Fish", 1200, "Fish", "1 kg"),
    ("Rui Fish", 450, "Fish", "1 kg"),
    ("Katla Fish", 400, "Fish", "1 kg"),
    ("Tilapia", 200, "Fish", "1 kg"),
    ("Pangash", 160, "Fish", "1 kg"),
    ("Shrimp (Bagda)", 800, "Fish", "1 kg"),
    ("Shrimp (Galda)", 1000, "Fish", "1 kg"),
    ("Dried Fish (Shutki)", 600, "Fish", "1 kg"),
    
    # Rice & Grains
    ("Miniket Rice", 75, "Rice", "1 kg"),
    ("Nazirshail Rice", 85, "Rice", "1 kg"),
    ("Basmati Rice", 250, "Rice", "1 kg"),
    ("Chinigura Rice", 140, "Rice", "1 kg"),
    ("Paizam Rice", 60, "Rice", "1 kg"),
    ("Lentil (Mosur)", 140, "Dal", "1 kg"),
    ("Lentil (Mug)", 160, "Dal", "1 kg"),
    ("Chickpeas (Chola)", 95, "Dal", "1 kg"),
    
    # Oil & Spices
    ("Soybean Oil", 190, "Oil", "1 liter"),
    ("Mustard Oil", 280, "Oil", "1 liter"),
    ("Olive Oil", 900, "Oil", "1 liter"),
    ("Turmeric Powder", 350, "Spices", "1 kg"),
    ("Chili Powder", 450, "Spices", "1 kg"),
    ("Cumin Seeds", 800, "Spices", "1 kg"),
    ("Coriander Powder", 300, "Spices", "1 kg"),
    
    # Dairy
    ("Milk (Liquid)", 90, "Dairy", "1 liter"),
    ("Powder Milk", 850, "Dairy", "1 kg"),
    ("Butter", 600, "Dairy", "200 gm"),
    ("Cheese", 500, "Dairy", "200 gm"),
    ("Yogurt", 220, "Dairy", "1 kg"),
    
    # Cleaning & Personal Care
    ("Dishwashing Liquid", 120, "Cleaning", "500 ml"),
    ("Laundry Detergent", 150, "Cleaning", "1 kg"),
    ("Floor Cleaner", 180, "Cleaning", "1 liter"),
    ("Toilet Cleaner", 130, "Cleaning", "750 ml"),
    ("Hand Wash", 80, "Personal Care", "250 ml"),
    ("Bath Soap", 60, "Personal Care", "150 gm"),
    ("Shampoo", 450, "Personal Care", "380 ml"),
    ("Toothpaste", 150, "Personal Care", "200 gm"),
    
    # Grocery & Others
    ("Sugar", 130, "Grocery", "1 kg"),
    ("Salt", 40, "Grocery", "1 kg"),
    ("Tea Leaves", 500, "Grocery", "400 gm"),
    ("Coffee", 600, "Grocery", "100 gm"),
    ("Biscuits (Pack)", 50, "Snacks", "1 pack"),
    ("Noodles", 250, "Snacks", "8 pack"),
    ("Chips", 20, "Snacks", "1 pack"),
    ("Chocolate Bar", 100, "Snacks", "1 bar"),
    ("Soft Drink", 80, "Beverages", "1 liter"),
    ("Water", 20, "Beverages", "1 liter"),
]

print("Generating 10 years of fake history...")

data_rows = []
today = datetime.now()
# 10 years simulation
dates_full = [today - timedelta(days=x) for x in range(365 * 10)]
dates_full.reverse() # Start from 10 years ago

for product in products:
    name, price, category, unit = product
    
    # --- 1. Random Start Date (Staggered Entry) ---
    # 70% chance to start from beginning, 30% chance to be introduced later
    if random.random() > 0.7:
        # Introduces randomly within the first 7 years
        days_skip = random.randint(30, 365 * 7)
        product_dates = dates_full[days_skip:]
    else:
        product_dates = dates_full[:]
        
    # --- 2. Random End Date (Discontinued Items) ---
    # 5% chance to be discontinued
    active = True
    if random.random() > 0.95:
        # Ends randomly within the last 2 years
        days_cut = random.randint(30, 365 * 2)
        if days_cut < len(product_dates):
            product_dates = product_dates[:-days_cut]
            active = False

    # Skip if no dates left
    if not product_dates:
        continue

    # Initial price logic simulation (work backwards from current price or random?)
    # The original script started at 'price' and walked.
    # To make 'price' the CURRENT price, it's safer to start randomly and aim for 'price',
    # OR just start at 'price' - variation and walk forward.
    # Let's start at roughly price * 0.6 (inflation over 10 years)
    current_price = int(price * (0.6 + random.uniform(-0.1, 0.1)))
    
    # Generate a random "Image Hash" filename
    img_hash = f"{abs(hash(name))}.webp"

    for date in product_dates:
        # --- 3. Missing Data (Missing Days) ---
        # 5% chance of missing data for a specific day
        if random.random() > 0.95:
            continue
            
        # Random Walk: Price fluctuates
        change = np.random.randint(-2, 4) # General upward trend
        
        # Occasional big jump
        if np.random.random() > 0.99:
            change = np.random.randint(-20, 25)

        current_price += change
        current_price = max(10, current_price) 

        data_rows.append({
            "year": date.year, # For partitioning
            "date": date.strftime("%Y-%m-%d"),
            "name": name,
            "price": current_price,
            "unit": unit,
            "category": category,
            "image": img_hash
        })

# Create DataFrame
df = pd.DataFrame(data_rows)

# --- CRITICAL: Match Production Sorting ---
df = df.sort_values(by=['name', 'date'])

# --- Save Partitioned Parquet ---
# We generally want 'data.parquet' inside 'year=2024' etc.
# Pandas partition_cols does not let us control the filename easily (it uses part-xxxx).
# So we manually iterate and save.
print("Saving partitioned parquet files...")

years = df['year'].unique()
for y in years:
    year_path = os.path.join(PRICES_DIR, f"year={y}")
    os.makedirs(year_path, exist_ok=True)
    parquet_file = os.path.join(year_path, "data.parquet")
    
    # Filter data for this year
    df_year = df[df['year'] == y].copy()
    
    # Optional: Drop the year column from the file itself if valid, 
    # but keeping it is fine and helpful for some readers.
    # The scraper keeps it implicitly or explicitly? 
    # Scraper adds 'date', 'name' etc. 
    # Scraper code: df_final.to_parquet(parquet_file, ...)
    # Scraper does NOT seem to add a 'year' column to the dataframe explicitly before saving,
    # but it saves into a year folder.
    # If we want to be EXACTLY like scraper, we can drop 'year' col relative to the file content
    # if the scraper implementation doesn't have it.
    # Scraper `scraped_data` has: date, name, price, unit, category, image. NO year.
    # So we should drop 'year' col from the saved file.
    
    df_year_save = df_year.drop(columns=['year'])
    df_year_save.to_parquet(parquet_file, index=False, compression='snappy')
    print(f"  > Saved: {parquet_file}")

print(f"Saved Year Partitions to: {PRICES_DIR}")

# --- Save Meta JSON ---
# Latest entry for each product (filter by the ACTIVE ones first? No, just last available data)
# Use the last row for each product name
meta_df = df.drop_duplicates(subset=['name'], keep='last')
meta_df = meta_df[['name', 'category', 'unit', 'image', 'price']]
meta_json_path = os.path.join(DATA_DIR, "meta.json")
meta_df.to_json(meta_json_path, orient='records')
print(f"Saved Meta JSON: {meta_json_path}")

print("\nFake Data Generation Complete!")