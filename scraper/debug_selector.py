import time
from playwright.sync_api import sync_playwright

URL = "https://chaldal.com/fresh-fruit"

def inspect_page():
    with sync_playwright() as p:
        print("Launching browser for inspection...")
        browser = p.chromium.launch(headless=False)
        
        # 1. Fake Location (Dhaka) to skip popup
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            permissions=['geolocation'], 
            geolocation={'latitude': 23.8103, 'longitude': 90.4125}, 
            locale='en-US'
        )
        page = context.new_page()
        page.goto(URL, timeout=60000)

        # 2. Scroll to load items
        print("Scrolling...")
        for _ in range(5):
            page.keyboard.press("PageDown")
            time.sleep(2)

        # 3. DEBUG: Find all elements that contain the price symbol '৳'
        # This is the most reliable anchor because it MUST exist on every product.
        price_elements = page.query_selector_all(':text("৳")')
        print(f"\n--- DEBUG REPORT ---")
        print(f"Found {len(price_elements)} price tags on the page.")

        if len(price_elements) > 0:
            print("\nAnalyzing the structure of the first 3 items...")
            
            # Look at the first few items to see their container structure
            for i, price_el in enumerate(price_elements[:3]):
                print(f"\n[Item {i+1}]")
                
                # Walk UP the HTML tree 3-4 levels to find the main card container
                parent = price_el
                for level in range(1, 5):
                    parent = parent.query_selector('xpath=..') # Go to parent
                    if parent:
                        tag = parent.evaluate("el => el.tagName")
                        cls = parent.get_attribute("class")
                        html_preview = parent.inner_html()[:100].replace('\n', '') # First 100 chars
                        
                        print(f"  Level {level} UP: <{tag} class='{cls}'>")
                        
                        # Heuristic: If it has 'product' in the class, it's likely the winner
                        if cls and 'product' in cls.lower():
                            print(f"  ^^^ THIS LOOKS LIKE THE WINNER: .{cls}")
        else:
            print("ERROR: Could not find any prices with symbol '৳'.")

        print("\nKeep browser open for 30s so you can inspect manually if needed...")
        time.sleep(30)
        browser.close()

if __name__ == "__main__":
    inspect_page()