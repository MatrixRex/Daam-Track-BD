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

URLS = [
    {"url": "https://chaldal.com/fresh-fruit", "category": "Fruits"},
    {"url": "https://chaldal.com/fresh-vegetable", "category": "Vegetables"},
]

os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(PRICES_DIR, exist_ok=True)

def get_image_filename(product_name):
    hash_object = hashlib.md5(product_name.encode())
    return f"{hash_object.hexdigest()}.webp"

def process_image(image_url, filename):
    filepath = os.path.join(IMAGE_DIR, filename)
    if os.path.exists(filepath): return 
    try:
        response = requests.get(image_url, timeout=10)
        if response.status_code == 200:
            img = Image.open(BytesIO(response.content))
            img.thumbnail((256, 256))
            img.save(filepath, "WEBP", quality=80)
    except:
        pass

def scrape():
    scraped_data = []
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    current_year = datetime.datetime.now().year

    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=False)
        
        # Fake Location (Dhaka)
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
                # Wait for the products to appear
                page.wait_for_selector('.product', timeout=15000)
            except:
                print("Grid didn't load fast enough, trying anyway...")

            # Aggressive scroll to load ~100 items
            for i in range(15): 
                page.keyboard.press("PageDown")
                time.sleep(1)

            # --- CORRECTED SELECTOR: .product ---
            products = page.query_selector_all('.product')
            print(f"Found {len(products)} potential items...")

            for product in products:
                try:
                    # 1. Skip if it's the Shopping Cart (check for 'total' class)
                    class_attr = product.get_attribute("class")
                    if "total" in class_attr or "shoppingCart" in class_attr:
                        continue

                    # 2. Extract Data
                    # Name is usually directly inside .name
                    name_el = product.query_selector('.name')
                    price_el = product.query_selector('.price')
                    
                    if not name_el or not price_el: 
                        continue

                    name = name_el.inner_text()
                    price_text = price_el.inner_text().replace('৳', '').replace(',', '').strip()
                    
                    if not price_text: continue
                    price = float(price_text)

                    unit_el = product.query_selector('.subText')
                    unit = unit_el.inner_text() if unit_el else "N/A"

                    img_el = product.query_selector('img')
                    img_url = img_el.get_attribute('src') if img_el else None
                    
                    # 3. Clean Data & Save
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
                except Exception as e:
                    # silently skip errors to keep scraping fast
                    continue

            print(f"-> Successfully extracted {len(scraped_data)} valid items so far.")
            page.close()
        browser.close()

    # --- SAVE ---
    if scraped_data:
        df_new = pd.DataFrame(scraped_data)
        
        # Save Parquet
        year_path = os.path.join(PRICES_DIR, f"year={current_year}")
        os.makedirs(year_path, exist_ok=True)
        parquet_file = os.path.join(year_path, "data.parquet")

        if os.path.exists(parquet_file):
            print("Updating existing database...")
            df_old = pd.read_parquet(parquet_file)
            df_final = pd.concat([df_old, df_new], ignore_index=True)
            df_final = df_final.drop_duplicates(subset=['date', 'name'])
        else:
            print("Creating new database...")
            df_final = df_new

        df_final.to_parquet(parquet_file, index=False, compression='snappy')
        
        # Save Meta Index
        meta_df = df_final.sort_values('date').drop_duplicates('name', keep='last')
        meta_df = meta_df[['name', 'category', 'unit', 'image', 'price']]
        meta_df.to_json(os.path.join(DATA_DIR, "meta.json"), orient='records')
        
        print(f"DONE! Total items in database: {len(df_final)}")
        print(f"Files saved to: {DATA_DIR}")
    else:
        print("No data scraped.")

if __name__ == "__main__":
    scrape()