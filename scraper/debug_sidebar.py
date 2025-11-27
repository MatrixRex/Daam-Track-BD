from playwright.sync_api import sync_playwright

def inspect_sidebar():
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            permissions=['geolocation'], 
            geolocation={'latitude': 23.8103, 'longitude': 90.4125}, 
            locale='en-US'
        )
        page = context.new_page()
        page.goto("https://chaldal.com", timeout=60000)
        
        print("Clicking 'Food'...")
        # Try different ways to click 'Food' to be sure it opens
        try:
            page.click("text=Food", timeout=2000)
        except:
            print("Could not click 'Food' text directly.")

        print("Waiting for menu to expand...")
        page.wait_for_timeout(3000)

        # NOW: Find "Fresh Fruits" (Level 2 Item) and inspect it
        print("\n--- DETECTIVE REPORT ---")
        
        # We look for the text "Fresh Fruits" which should be visible now
        element = page.locator("text=Fresh Fruits").first
        
        if element.is_visible():
            print("FOUND 'Fresh Fruits'!")
            
            # Get the HTML of this element
            html = element.evaluate("el => el.outerHTML")
            print(f"HTML: {html}")
            
            # Get the Parent (The container)
            parent_html = element.locator("..").evaluate("el => el.outerHTML")
            print(f"PARENT HTML: {parent_html}")
            
            # Get the Class Name
            cls = element.get_attribute("class")
            print(f"CLASS: {cls}")
            
            print("\nThis tells us exactly what selector to use for Level 2 items!")
        else:
            print("ERROR: Could not find 'Fresh Fruits'. Did 'Food' expand?")
            # Print whatever IS visible in the sidebar to help debug
            print("Visible items in sidebar:")
            visible = page.locator(".menu-item, li").all_inner_texts()
            print(visible[:10]) # First 10 items

        browser.close()

if __name__ == "__main__":
    inspect_sidebar()