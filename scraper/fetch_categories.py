import json
import os
import re
import sys
import requests

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "categories.json")

# Target top-level roots for price tracking
TARGET_ROOT_NAMES = [
    "Popular", "Flash Sales", "Food", "Cleaning Supplies", "Personal Care",
    "Health & Wellness", "Baby Care", "Home & Kitchen", "Stationery & Office",
    "Pet Care", "Toys & Sports", "Beauty & MakeUp"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1"
}

def fetch_categories():
    print("Fetching live category tree from Chaldal...")
    url = "https://chaldal.com"
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=20)
        if response.status_code != 200:
            print(f"[!] Error fetching {url}: Status code {response.status_code}")
            sys.exit(1)
        html = response.text
    except Exception as e:
        print(f"[!] Network error fetching Chaldal homepage: {e}")
        sys.exit(1)

    # Extract window.__serviceState JSON
    match = re.search(r'<script>window\.__serviceState\s*=\s*([\s\S]*?)</script>', html)
    if not match:
        print("[!] Fatal: window.__serviceState not found in Chaldal HTML.")
        sys.exit(1)

    try:
        service_state = json.loads(match.group(1))
    except Exception as e:
        print(f"[!] Failed to parse service state JSON: {e}")
        sys.exit(1)

    category_service = service_state.get("CategoryService", {})
    categories_by_store = category_service.get("categories", {})
    all_categories = categories_by_store.get("1") or next(iter(categories_by_store.values()), [])

    router_service = service_state.get("RouterService", {})
    routes = router_service.get("categoryRoutes", {})

    print(f"Found {len(all_categories)} total categories and {len(routes)} routes in service state.")

    # Build parent -> children map
    children_map = {}
    for cat in all_categories:
        p_id = cat.get("ParentCategoryId", 0)
        children_map.setdefault(p_id, []).append(cat)

    # Collect leaf/target categories
    leaf_categories = []
    seen_ids = set()

    def collect_leaves(cat, parent_chain=None):
        if parent_chain is None:
            parent_chain = []
        
        cat_id = cat.get("Id")
        cat_name = cat.get("Name", "").strip()
        children = children_map.get(cat_id, [])
        current_chain = parent_chain + [cat_name]

        # A category is a scraping target if it has no subcategories (leaf) OR is explicitly marked ContainsProducts
        if not children or cat.get("ContainsProducts", False):
            if cat_id not in seen_ids and cat_name:
                seen_ids.add(cat_id)
                slug = routes.get(str(cat_id)) or routes.get(cat_id) or ""
                url = f"https://chaldal.com/{slug}" if slug else f"https://chaldal.com/{cat_id}"
                
                leaf_categories.append({
                    "id": cat_id,
                    "category": cat_name,
                    "categoryBn": cat.get("NameBn", ""),
                    "parentCategoryId": cat.get("ParentCategoryId", 0),
                    "hierarchy": " > ".join(current_chain),
                    "topCategory": parent_chain[0] if parent_chain else cat_name,
                    "slug": slug,
                    "url": url
                })

        for child in children:
            collect_leaves(child, current_chain)

    roots = children_map.get(0, [])
    for root in roots:
        root_name = root.get("Name", "").strip()
        # Filter for relevant roots if TARGET_ROOT_NAMES is defined
        if not TARGET_ROOT_NAMES or any(t.lower() in root_name.lower() for t in TARGET_ROOT_NAMES):
            collect_leaves(root)

    print(f"Extracted {len(leaf_categories)} leaf categories for scraping.")

    if not leaf_categories:
        print("[!] FATAL ERROR: No categories extracted.")
        sys.exit(1)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(leaf_categories, f, indent=2, ensure_ascii=False)

    print(f"SUCCESS: Saved {len(leaf_categories)} categories to {OUTPUT_FILE}")

if __name__ == "__main__":
    fetch_categories()