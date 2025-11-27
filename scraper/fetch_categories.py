import json
import os
import time
from playwright.sync_api import sync_playwright

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "categories.json")

# Level 1 Roots (The starting points)
ROOTS = [
    "Flash Sales", "Popular", "Food", "Cleaning Supplies", "Personal Care", 
    "Health & Wellness", "Baby Care", "Home & Kitchen", "Stationery & Office", 
    "Pet Care", "Toys & Sports", "Beauty & MakeUp"
]

def fetch_categories():
    final_links = []
    seen_urls = set()

    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            permissions=['geolocation'], 
            geolocation={'latitude': 23.8103, 'longitude': 90.4125}
        )
        page = context.new_page()
        page.goto("https://chaldal.com", timeout=60000)
        time.sleep(3) # Let page settle

        # Helper to get all visible text in sidebar
        def get_sidebar_items():
            # Get all elements that look like menu items
            # We grab text to compare "Before" vs "After"
            elements = page.locator(".menu-item, li div, .category-name").all()
            items = {}
            for el in elements:
                try:
                    if not el.is_visible(): continue
                    box = el.bounding_box()
                    if not box or box['x'] > 350: continue # Strict Sidebar check
                    
                    text = el.inner_text().strip()
                    if text and text not in ["Offers", "Help", "More"]:
                        items[text] = el # Save the element so we can click it later
                except:
                    pass
            return items

        # --- THE RECURSIVE WALKER ---
        for root in ROOTS:
            print(f"\n--- Root: {root} ---")
            
            # 1. Get Baseline (What is visible BEFORE clicking?)
            before_items = get_sidebar_items()
            
            if root not in before_items:
                print(f"Skipping {root} (Not found)")
                continue

            # 2. Click Root
            try:
                before_items[root].click()
                time.sleep(1) # Wait for expansion
            except:
                continue

            # 3. Get New State (What is visible AFTER clicking?)
            after_items = get_sidebar_items()
            
            # 4. Calculate Difference (These are the Level 2 items!)
            new_level_2 = [key for key in after_items if key not in before_items]
            print(f"  > Revealed {len(new_level_2)} sub-categories: {new_level_2}")

            # 5. Process Level 2
            for l2_text in new_level_2:
                # Click Level 2 to see if Level 3 exists
                try:
                    after_items[l2_text].click()
                    time.sleep(1)
                    
                    # Check for Level 3 (Did new items appear?)
                    l3_check_items = get_sidebar_items()
                    new_level_3 = [key for key in l3_check_items if key not in after_items]
                    
                    if new_level_3:
                        print(f"    > Found Leaves (L3): {new_level_3}")
                        # These are likely the final categories.
                        # Since we can't get URLs from DIVs easily, we use the URL bar!
                        
                        for l3_text in new_level_3:
                            # Click the leaf to load the page
                            l3_check_items[l3_text].click()
                            time.sleep(2) # Wait for URL update
                            
                            curr_url = page.url
                            if "chaldal.com/" in curr_url and "-" in curr_url:
                                if curr_url not in seen_urls:
                                    final_links.append({"category": l3_text, "url": curr_url})
                                    seen_urls.add(curr_url)
                                    print(f"      + Saved: {curr_url}")
                    else:
                        # No new items appeared? Then L2 was the leaf!
                        # We are already on the page (since we clicked it)
                        curr_url = page.url
                        if "chaldal.com/" in curr_url and "-" in curr_url:
                             if curr_url not in seen_urls:
                                final_links.append({"category": l2_text, "url": curr_url})
                                seen_urls.add(curr_url)
                                print(f"    + Saved (L2): {curr_url}")

                except Exception as e:
                    print(f"    Error clicking {l2_text}: {e}")

        browser.close()

    # Save
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(final_links, f, indent=2)
    print(f"\nSUCCESS! Scraped {len(final_links)} categories.")

if __name__ == "__main__":
    fetch_categories()