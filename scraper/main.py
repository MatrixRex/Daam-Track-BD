import os
import sys
import time
import hashlib
import datetime
import json
from concurrent.futures import ThreadPoolExecutor
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import pandas as pd
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

# API Constants
API_ENDPOINT = "https://catalog.chaldal.com/searchOld"
API_KEY = "e964fc2d51064efa97e94db7c64bf3d044279d4ed0ad4bdd9dce89fecc9156f0"

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Origin": "https://chaldal.com",
    "Referer": "https://chaldal.com/"
}

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
        {"id": 11, "category": "Fresh Fruits", "url": "https://chaldal.com/fresh-fruit"},
        {"id": 12, "category": "Fresh Vegetables", "url": "https://chaldal.com/fresh-vegetable"},
        {"id": 80, "category": "Rice", "url": "https://chaldal.com/rices"},
        {"id": 108, "category": "Oil", "url": "https://chaldal.com/oil"},
        {"id": 107, "category": "Spices", "url": "https://chaldal.com/spices"},
        {"id": 198, "category": "Dal or Lentil", "url": "https://chaldal.com/dal-or-lentil"},
        {"id": 1696, "category": "Meat", "url": "https://chaldal.com/meat-new"},
        {"id": 1593, "category": "Chicken & Poultry", "url": "https://chaldal.com/chicken-poultry"},
        {"id": 1235, "category": "Frozen Fish", "url": "https://chaldal.com/frozen-fish"},
        {"id": 111, "category": "Salt & Sugar", "url": "https://chaldal.com/salt-sugar"}
    ]

def get_image_filename(product_name):
    hash_object = hashlib.md5(product_name.encode('utf-8'))
    return f"{hash_object.hexdigest()}.webp"

def process_image(image_url, filename, session=None):
    if not image_url:
        return
    filepath = os.path.join(IMAGE_DIR, filename)
    if os.path.exists(filepath):
        return
    try:
        client = session or requests
        response = client.get(image_url, timeout=10)
        if response.status_code == 200:
            img = Image.open(BytesIO(response.content))
            img.thumbnail((256, 256))
            img.save(filepath, "WEBP", quality=80)
    except Exception:
        pass

def create_http_session():
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=0.5, status_forcelist=[500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retries, pool_connections=20, pool_maxsize=20)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session

def fetch_category_products(session, category_id, page_size=500):
    """Fetches all product items for a category ID via Chaldal catalog API."""
    payload = {
        "apiKey": API_KEY,
        "storeId": 1,
        "warehouseId": 8,
        "pageSize": page_size,
        "currentPageIndex": 0,
        "metropolitanAreaId": 1,
        "query": "",
        "productVariantId": -1,
        "bundleId": {"case": "None"},
        "canSeeOutOfStock": "false",
        "filters": [f"categories={category_id}"],
        "maxOutOfStockCount": {"case": "Some", "fields": [5]},
        "shouldShowAlternateProductsForAllOutOfStock": {"case": "Some", "fields": [True]},
        "customerGuid": {"case": "None"}
    }

    try:
        response = session.post(API_ENDPOINT, json=payload, headers=HEADERS, timeout=15)
        if response.status_code == 200:
            data = response.json()
            hits = data.get("hits", [])
            total_hits = data.get("nbHits", len(hits))
            
            # If total_hits exceeds page_size, fetch remaining pages
            all_hits = list(hits)
            current_page = 0
            while len(all_hits) < total_hits and len(hits) == page_size:
                current_page += 1
                payload["currentPageIndex"] = current_page
                p_resp = session.post(API_ENDPOINT, json=payload, headers=HEADERS, timeout=15)
                if p_resp.status_code == 200:
                    hits = p_resp.json().get("hits", [])
                    if not hits:
                        break
                    all_hits.extend(hits)
                else:
                    break

            return all_hits
        else:
            return []
    except Exception as e:
        print(f"    [!] Error requesting category {category_id}: {e}")
        return []

def scrape():
    # 1. START TIMER
    start_time = time.time()
    print(f"--- Starting Scraper at {datetime.datetime.now().strftime('%H:%M:%S')} ---")

    scraped_data = []
    image_download_tasks = []
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    current_year = datetime.datetime.now().year

    # Validation Counters
    total_cats = len(URLS)
    categories_with_data = 0
    total_items_scraped = 0

    session = create_http_session()

    for index, entry in enumerate(URLS):
        cat_name = entry.get("category", "Unknown")
        cat_id = entry.get("id")

        # Extract ID from URL if id field is missing
        if not cat_id and "url" in entry:
            url_part = entry["url"].rstrip("/").split("/")[-1]
            if url_part.isdigit():
                cat_id = int(url_part)

        if not cat_id:
            print(f"[{index+1}/{total_cats}] Skipping {cat_name}: No valid category ID.")
            continue

        products = fetch_category_products(session, cat_id)
        count_for_page = 0

        for product in products:
            try:
                name = (product.get("name") or product.get("nameWithoutSubText") or "").strip()
                price = float(product.get("price") or product.get("discountedPrice") or product.get("mrp") or 0)
                unit = (product.get("subText") or "N/A").strip()

                if not name or price <= 0:
                    continue

                # Composition logic for display name
                display_name = name
                if unit and unit != "N/A" and unit.lower() not in name.lower():
                    display_name = f"{name} {unit}"

                # Image extraction
                pictures = product.get("picturesUrls") or product.get("pictureUrls") or []
                img_url = pictures[0] if pictures else None
                img_filename = get_image_filename(display_name)

                if img_url:
                    image_download_tasks.append((img_url, img_filename))

                scraped_data.append({
                    "date": today,
                    "name": display_name,
                    "price": price,
                    "unit": unit,
                    "category": cat_name,
                    "image": img_filename
                })
                count_for_page += 1
            except Exception:
                continue

        if count_for_page > 0:
            categories_with_data += 1
            total_items_scraped += count_for_page
            print(f"[{index+1}/{total_cats}] {cat_name} (ID: {cat_id}) -> {count_for_page} items")
        else:
            print(f"[{index+1}/{total_cats}] {cat_name} (ID: {cat_id}) -> 0 items")

    # Download new product images concurrently
    if image_download_tasks:
        print(f"\nProcessing {len(image_download_tasks)} product images...")
        unique_tasks = list({fname: (url, fname) for url, fname in image_download_tasks}.values())
        with ThreadPoolExecutor(max_workers=10) as executor:
            executor.map(lambda task: process_image(task[0], task[1], session), unique_tasks)
        print("Images processing complete.")

    # --- VALIDATION CHECK ---
    print(f"\n--- Scraping Summary ---")
    print(f"Total Categories Attempted: {total_cats}")
    print(f"Categories with Data: {categories_with_data}")
    print(f"Total Items Scraped: {total_items_scraped}")

    # 1. Fatal: No data at all
    if total_items_scraped == 0:
        print("\n[!] FATAL ERROR: No products found across ALL categories.")
        print("This indicates an API failure or network issue.")
        sys.exit(1)

    # 2. Fatal: High failure rate (e.g. > 90% of categories empty)
    success_rate = categories_with_data / total_cats if total_cats > 0 else 0
    if success_rate < 0.10:
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
            print(f"Merging with existing database ({parquet_file})...")
            df_old = pd.read_parquet(parquet_file)
            df_final = pd.concat([df_old, df_new], ignore_index=True)
        else:
            print(f"Creating new database ({parquet_file})...")
            df_final = df_new

        # Duplicate protection on Date + Name + Unit
        df_final = df_final.drop_duplicates(subset=['date', 'name', 'unit'], keep='first')

        # Sort for DuckDB indexing optimization
        df_final = df_final.sort_values(by=['name', 'date'])

        df_final.to_parquet(parquet_file, index=False, compression='snappy')
        print(f"Parquet database updated: {len(df_final)} total records.")

        # Update Meta JSON for frontend search index
        meta_df = df_final.sort_values('date').drop_duplicates('name', keep='last')
        meta_df = meta_df[['name', 'category', 'unit', 'image', 'price']]
        meta_df.to_json(os.path.join(DATA_DIR, "meta.json"), orient='records', force_ascii=False)
        print(f"Search index (meta.json) updated with {len(meta_df)} unique items.")

    # STOP TIMER & REPORT
    end_time = time.time()
    duration = end_time - start_time
    minutes = int(duration // 60)
    seconds = int(duration % 60)
    print(f"--- Finished in {minutes}m {seconds}s ({duration:.2f}s total) ---")

def push_to_database():
    """Clones the database branch into a temporary directory, copies scraped data, and pushes."""
    import subprocess
    import tempfile
    import shutil
    import stat

    print("\n--- Pushing Scraped Data to GitHub 'database' Branch ---")
    try:
        origin_url = subprocess.check_output(
            ["git", "remote", "get-url", "origin"],
            cwd=BASE_DIR,
            text=True
        ).strip()
    except Exception as e:
        print(f"[!] Failed to get git origin URL: {e}")
        return

    temp_dir = tempfile.mkdtemp(prefix="daamtrack_db_")
    try:
        print(f"Cloning 'database' branch into temporary workspace...")
        subprocess.check_call(
            ["git", "clone", "--depth", "1", "--branch", "database", origin_url, temp_dir]
        )

        dest_data = os.path.join(temp_dir, "data")
        dest_images = os.path.join(temp_dir, "images")

        if os.path.exists(DATA_DIR):
            print("Syncing data files...")
            shutil.copytree(DATA_DIR, dest_data, dirs_exist_ok=True)
        if os.path.exists(IMAGE_DIR):
            print("Syncing image files...")
            shutil.copytree(IMAGE_DIR, dest_images, dirs_exist_ok=True)

        # Stage changes
        subprocess.check_call(["git", "add", "."], cwd=temp_dir)
        status_proc = subprocess.run(["git", "diff", "--staged", "--quiet"], cwd=temp_dir)

        if status_proc.returncode == 0:
            print("No new changes detected on 'database' branch.")
        else:
            today = datetime.datetime.now().strftime("%Y-%m-%d")
            commit_msg = f"Manual Scrape Update: {today}"
            subprocess.check_call(["git", "commit", "-m", commit_msg], cwd=temp_dir)
            print(f"Pushing commit '{commit_msg}' to origin/database...")
            subprocess.check_call(["git", "push", "origin", "database"], cwd=temp_dir)
            print("Successfully pushed updated dataset to GitHub 'database' branch!")
    except Exception as e:
        print(f"[!] Error while pushing to database branch: {e}")
    finally:
        def on_rm_error(func, path, exc_info):
            try:
                os.chmod(path, stat.S_IWRITE)
                func(path)
            except Exception:
                pass
        shutil.rmtree(temp_dir, onerror=on_rm_error)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="DaamTrack Chaldal Scraper")
    parser.add_argument("--push", action="store_true", help="Push scraped data directly to database branch on GitHub")
    args = parser.parse_args()

    scrape()

    if args.push:
        push_to_database()