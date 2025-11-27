import os
import time
import hashlib
import datetime
import requests
import json
import pandas as pd
from playwright.sync_api import sync_playwright
from PIL import Image
from io import BytesIO

# --- CONFIGURATION ---
# Base Paths
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR) # Go up one level to project root
DATA_DIR = os.path.join(BASE_DIR, "public", "data")
IMAGE_DIR = os.path.join(BASE_DIR, "public", "images")
PRICES_DIR = os.path.join(DATA_DIR, "prices")
CATEGORIES_FILE = os.path.join(CURRENT_DIR, "categories.json")

# Ensure directories exist
os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(PRICES_DIR, exist_ok=True)

# --- LOAD CATEGORIES ---
URLS = []
if os.path.exists(CATEGORIES_FILE):
    try:
        with open(CATEGORIES_FILE, "r", encoding="utf-8") as f:
            URLS = json.load(f)
        print(f"Loaded {len(URLS)} categories from {CATEGORIES_FILE}")
    except Exception as e:
        print(f"Error reading categories file: {e}")

# Fallback if file is missing or empty
if not URLS:
    print("Warning: Using default fallback categories.")
    URLS = [
        {"url": "https://chaldal.com/fresh-fruit", "category": "Fruits"},
        {"url": "https://chaldal.com/fresh-vegetable", "category": "Vegetables"},
    ]

def get_image_filename(product_name):
    """Generates a consistent filename using MD5 hash of the name."""
    hash_object = hashlib.md5(product_name.encode())
    return f"{hash_object.hexdigest()}.webp"

def process_image(image_url, filename):
    """Downloads and saves image ONLY if it doesn't exist."""
    filepath = os.path.join(IMAGE_DIR, filename)
    
    if os.path.exists(filepath):
        return 

    try:
        response = requests.get(image_url, timeout=10)
        if response.status_code == 200:
            img = Image.open(BytesIO(response.content))
            img.thumbnail((256, 256)) # Optimize size
            img.save(filepath, "WEBP", quality=80)
    except Exception:
        pass 

def scrape():
    scraped_data = []
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    current_year = datetime.datetime.now().year

    with sync_playwright() as p:
        print("Launching browser...")
        # SET HEADLESS=TRUE FOR GITHUB ACTIONS / PRODUCTION
        browser = p.chromium.launch(headless=True) 
        
        # Context with Location Spoofing (Dhaka)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            permissions=['geolocation'], 
            geolocation={'latitude': 23.8103, 'longitude': 90.4125}, 
            locale='en-US'
        )
        
        total_cats = len(URLS)
        
        for index, entry in enumerate(URLS):
            print(f"[{index+1}/{total_cats}] Scraping: {entry['category']}...")
            
            try:
                page = context.new_page()
                page.goto(entry['url'], timeout=60000)

                # Wait for grid
                try:
                    page.wait_for_selector('.product', timeout=10000)
                except:
                    print(f"  > Warning: No items found for {entry['category']} (Timeout)")
                    page.close()
                    continue

                # Aggressive Scroll (15 times)
                for i in range(15): 
                    page.keyboard.press("PageDown")
                    time.sleep(0.5) # Faster scroll for production

                products = page.query_selector_all('.product')
                count_for_page = 0

                for product in products:
                    try:
                        class_attr = product.get_attribute("class")
                        if "total" in class_attr or "shoppingCart" in class_attr:
                            continue

                        name_el = product.query_selector('.name')
                        price_el = product.query_selector('.price')
                        
                        if not name_el or not price_el: continue

                        name = name_el.inner_text()
                        price_text = price_el.inner_text().replace('৳', '').replace(',', '').strip()
                        if not price_text: continue
                        price = float(price_text)

                        unit_el = product.query_selector('.subText')
                        unit = unit_el.inner_text() if unit_el else "N/A"

                        img_el = product.query_selector('img')
                        img_url = img_el.get_attribute('src') if img_el else None
                        
                        # Image Handling
                        img_filename = get_image_filename(name)
                        if img_url:
                            process_image(img_url, img_filename)

                        scraped_data.append({
                            "date": today,
                            "name": name,
                            "price": price,
                            "unit": unit,
                            "category": entry['category'],
                            "image": img_filename
                        })
                        count_for_page += 1
                    except Exception:
                        continue
                
                print(f"  > Found {count_for_page} items.")
                page.close()
                
            except Exception as e:
                print(f"  > Error scraping {entry['category']}: {e}")

        browser.close()

    # --- SAVE & DEDUPLICATE ---
    if scraped_data:
        df_new = pd.DataFrame(scraped_data)
        
        year_path = os.path.join(PRICES_DIR, f"year={current_year}")
        os.makedirs(year_path, exist_ok=True)
        parquet_file = os.path.join(year_path, "data.parquet")

        if os.path.exists(parquet_file):
            print("Merging with existing database...")
            df_old = pd.read_parquet(parquet_file)
            df_final = pd.concat([df_old, df_new], ignore_index=True)
        else:
            print("Creating new database...")
            df_final = df_new

        # Deduplicate: Keep 1 entry per product per day
        initial_count = len(df_final)
        df_final = df_final.drop_duplicates(subset=['date', 'name'], keep='first')
        
        # Save Parquet
        df_final.to_parquet(parquet_file, index=False, compression='snappy')
        
        # Save Search Index (Meta JSON)
        meta_df = df_final.sort_values('date').drop_duplicates('name', keep='last')
        meta_df = meta_df[['name', 'category', 'unit', 'image', 'price']]
        meta_df.to_json(os.path.join(DATA_DIR, "meta.json"), orient='records')
        
        print(f"DONE! Database contains {len(df_final)} records.")
    else:
        print("No data scraped.")

if __name__ == "__main__":
    scrape()