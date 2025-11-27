import os
import time
import hashlib
import datetime
import requests
import pandas as pd
from playwright.sync_api import sync_playwright
from PIL import Image
from io import BytesIO

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "public", "data")
IMAGE_DIR = os.path.join(BASE_DIR, "public", "images")
PRICES_DIR = os.path.join(DATA_DIR, "prices")

# Full Category List for a complete catalog
URLS = [
    {"url": "https://chaldal.com/fresh-fruit", "category": "Fruits"},
    {"url": "https://chaldal.com/fresh-vegetable", "category": "Vegetables"},
]

# Ensure directories exist
os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(PRICES_DIR, exist_ok=True)

def get_image_filename(product_name):
    """Generates a consistent filename using MD5 hash of the name."""
    hash_object = hashlib.md5(product_name.encode())
    return f"{hash_object.hexdigest()}.webp"

def process_image(image_url, filename):
    """Downloads and saves image ONLY if it doesn't exist."""
    filepath = os.path.join(IMAGE_DIR, filename)
    
    # 1. SMART CHECK: If file exists, skip download to save bandwidth
    if os.path.exists(filepath):
        return 

    try:
        response = requests.get(image_url, timeout=10)
        if response.status_code == 200:
            img = Image.open(BytesIO(response.content))
            img.thumbnail((256, 256)) # Optimize size
            img.save(filepath, "WEBP", quality=80)
    except Exception:
        pass # Ignore image errors to keep scraper running

def scrape():
    scraped_data = []
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    current_year = datetime.datetime.now().year

    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=False) # Change to True for GitHub Actions
        
        # 2. CONTEXT SETUP: Grant Location Permissions & Set to Dhaka
        # This prevents the "Select City" popup from blocking the script
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            permissions=['geolocation'], 
            geolocation={'latitude': 23.8103, 'longitude': 90.4125}, 
            locale='en-US'
        )
        
        for entry in URLS:
            print(f"--- Scraping {entry['category']} ---")
            page = context.new_page()
            page.goto(entry['url'], timeout=60000)

            print("Scrolling to load items...")
            try:
                page.wait_for_selector('.product', timeout=15000)
            except:
                print("Grid didn't load fast enough, trying anyway...")

            # 3. AGGRESSIVE SCROLL: Scroll 15 times to load ~100+ items
            for i in range(15): 
                page.keyboard.press("PageDown")
                time.sleep(1)

            # 4. SELECTOR: Use '.product' which we verified works
            products = page.query_selector_all('.product')
            print(f"Found {len(products)} potential items...")

            for product in products:
                try:
                    # Filter out Shopping Cart / Total bar
                    class_attr = product.get_attribute("class")
                    if "total" in class_attr or "shoppingCart" in class_attr:
                        continue

                    name_el = product.query_selector('.name')
                    price_el = product.query_selector('.price')
                    
                    if not name_el or not price_el: continue

                    name = name_el.inner_text()
                    # Clean Price: "৳ 1,200" -> 1200.0
                    price_text = price_el.inner_text().replace('৳', '').replace(',', '').strip()
                    if not price_text: continue
                    price = float(price_text)

                    unit_el = product.query_selector('.subText')
                    unit = unit_el.inner_text() if unit_el else "N/A"

                    img_el = product.query_selector('img')
                    img_url = img_el.get_attribute('src') if img_el else None
                    
                    # Process Image (Incremental)
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
                except Exception:
                    continue

            page.close()
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

        # 5. DEDUPLICATION LOGIC
        # If "Mango" is found in Fruits AND Summer Special, keep only one.
        initial_count = len(df_final)
        df_final = df_final.drop_duplicates(subset=['date', 'name'], keep='first')
        final_count = len(df_final)
        
        if initial_count > final_count:
            print(f"Cleaned up {initial_count - final_count} duplicate items.")

        # Save History (Parquet)
        df_final.to_parquet(parquet_file, index=False, compression='snappy')
        
        # Save Search Index (JSON) - Only unique items, latest info
        meta_df = df_final.sort_values('date').drop_duplicates('name', keep='last')
        meta_df = meta_df[['name', 'category', 'unit', 'image', 'price']]
        meta_df.to_json(os.path.join(DATA_DIR, "meta.json"), orient='records')
        
        print(f"DONE! Database updated with {len(df_new)} new entries.")
        print(f"Total Unique Items Tracked: {len(meta_df)}")
    else:
        print("No data scraped.")

if __name__ == "__main__":
    scrape()