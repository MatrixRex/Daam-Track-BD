import os
import sys
import time
import hashlib
import datetime
import json
import pandas as pd
from playwright.sync_api import sync_playwright
from PIL import Image
from io import BytesIO

# --- CONFIGURATION ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)
DATA_DIR = os.path.join(BASE_DIR, "public", "data")
IMAGE_DIR = os.path.join(BASE_DIR, "public", "images")
PRICES_DIR = os.path.join(DATA_DIR, "prices")
CATEGORIES_FILE = os.path.join(CURRENT_DIR, "categories.json")

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

if not URLS:
    print("Warning: Using default fallback categories.")
    URLS = [
        {"url": "https://chaldal.com/fresh-fruit", "category": "Fruits"},
        {"url": "https://chaldal.com/fresh-vegetable", "category": "Vegetables"},
    ]

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
    except Exception:
        pass 

# --- CONFIGURATION ---
# No longer using API constants, back to Browser automation for reliability

def scrape():
    # 1. START TIMER
    start_time = time.time()
    print(f"--- Starting Scraper at {datetime.datetime.now().strftime('%H:%M:%S')} ---")

    scraped_data = []
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    current_year = datetime.datetime.now().year

    # Validation Counters
    total_cats = len(URLS)
    categories_with_data = 0
    total_items_scraped = 0

    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True) 
        
        # specific context setup
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            permissions=['geolocation'], 
            geolocation={'latitude': 23.8103, 'longitude': 90.4125}, 
            locale='en-US'
        )
        
        for index, entry in enumerate(URLS):
            print(f"[{index+1}/{total_cats}] Scraping: {entry['category']}...")
            
            try:
                page = context.new_page()
                page.goto(entry['url'], timeout=60000)

                # Wait for any product container to load (Multi-selector wait)
                container_selectors = ['.productV2Catalog', '.product', '.productsContent > div', '.product-pane div']
                found_container = None
                for selector in container_selectors:
                    try:
                        page.wait_for_selector(selector, timeout=8000)
                        found_container = selector
                        break
                    except:
                        continue

                if not found_container:
                    print(f"  > Warning: No product containers found for {entry['category']} (Final URL: {page.url})")
                    page.close()
                    continue

                # Scroll down with more breathing room for infinite scroll
                for i in range(16): 
                    page.keyboard.press("PageDown")
                    time.sleep(0.8) # Increased wait for loading
                
                # Final settle wait
                time.sleep(1.5)

                products = page.query_selector_all(found_container)
                count_for_page = 0

                for product in products:
                    try:
                        # 1. NAME SELECTORS
                        name_el = product.query_selector('.nameTextWithEllipsis') or \
                                  product.query_selector('.pvName p') or \
                                  product.query_selector('.name')
                        
                        # 2. PRICE SELECTORS
                        # Note: Some use .productV2discountedPrice, some use .price
                        price_el = product.query_selector('.productV2discountedPrice span') or \
                                   product.query_selector('.price span') or \
                                   product.query_selector('.price')
                        
                        if not name_el or not price_el: continue

                        name = name_el.inner_text().strip()
                        price_text = price_el.inner_text().replace('৳', '').replace(',', '').strip()
                        
                        if not price_text: continue
                        price = float(price_text)

                        # 3. UNIT SELECTORS
                        # Note: Case sensitivity matters in CSS (.subText vs .subtext)
                        unit_el = product.query_selector('.subText span') or \
                                  product.query_selector('.subtext span') or \
                                  product.query_selector('.subText') or \
                                  product.query_selector('.subtext') or \
                                  product.query_selector('.sub-text')
                        
                        unit = unit_el.inner_text().strip() if unit_el else "N/A"

                        # Composition logic
                        display_name = name
                        if unit and unit != "N/A" and unit.lower() not in name.lower():
                            display_name = f"{name} {unit}"

                        # 4. IMAGE SELECTORS
                        img_el = product.query_selector('.imageWrapperWrapper img') or \
                                 product.query_selector('.imageWrapper img') or \
                                 product.query_selector('img')
                        
                        img_url = img_el.get_attribute('src') if img_el else None
                        
                        img_filename = get_image_filename(display_name)
                        if img_url:
                            process_image(img_url, img_filename)

                        scraped_data.append({
                            "date": today,
                            "name": display_name,
                            "price": price,
                            "unit": unit,
                            "category": entry['category'],
                            "image": img_filename
                        })
                        print(f"    + {display_name}: ৳{price}") 
                        count_for_page += 1
                    except Exception:
                        continue
                
                if count_for_page > 0:
                    categories_with_data += 1
                    total_items_scraped += count_for_page

                print(f"  > Found {count_for_page} items.")
                page.close()
                
            except Exception as e:
                print(f"  > Error scraping {entry['category']}: {e}")

        browser.close()

    # --- VALIDATION CHECK ---
    print(f"\n--- Scraping Summary ---")
    print(f"Total Categories Attempted: {total_cats}")
    print(f"Categories with Data: {categories_with_data}")
    print(f"Total Items Scraped: {total_items_scraped}")
    
    # 1. Fatal: No data at all
    if total_items_scraped == 0:
        print("\n[!] FATAL ERROR: No products found across ALL categories.")
        print("This usually means the site structure or selector ('.product') has changed.")
        sys.exit(1)
        
    # 2. Fatal: High failure rate (e.g., > 95% of categories empty)
    # We expect some categories to be empty occasionally, but not most of them.
    success_rate = categories_with_data / total_cats
    if success_rate < 0.05: # Adjust this threshold as needed
        print(f"\n[!] FATAL ERROR: High failure rate ({success_rate:.1%} success).")
        print(f"Only {categories_with_data} out of {total_cats} categories returned data.")
        sys.exit(1)

    print(f"Data validation passed (Success Rate: {success_rate:.1%})\n")

    # --- DATA SAVING LOGIC ---
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

        # ---------------------------------------------------------
        # ### FIX: DUPLICATE PROTECTION
        # Because 'name' is now unique per variant (e.g. "Oil 1L" vs "Oil 5L"),
        # we can safely drop duplicates based on just Date + Name.
        # We also added 'unit' to the subset just to be explicit/safe.
        # ---------------------------------------------------------
        df_final = df_final.drop_duplicates(subset=['date', 'name', 'unit'], keep='first')
        
        # Sort for optimization
        df_final = df_final.sort_values(by=['name', 'date'])
        
        df_final.to_parquet(parquet_file, index=False, compression='snappy')
        
        # Update Meta JSON for search suggestions
        # We keep the LAST seen price/details for the frontend search
        meta_df = df_final.sort_values('date').drop_duplicates('name', keep='last')
        meta_df = meta_df[['name', 'category', 'unit', 'image', 'price']]
        meta_df.to_json(os.path.join(DATA_DIR, "meta.json"), orient='records')
        
        print(f"DONE! Database contains {len(df_final)} records.")
    else:
        print("No data scraped.")

    # 2. STOP TIMER & REPORT
    end_time = time.time()
    duration = end_time - start_time
    minutes = int(duration // 60)
    seconds = int(duration % 60)
    
    print(f"--- Finished in {minutes}m {seconds}s ---")

if __name__ == "__main__":
    scrape()