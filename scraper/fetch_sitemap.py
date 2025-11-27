import requests
import xml.etree.ElementTree as ET
import json
import os

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "categories.json")

def fetch_from_sitemap():
    print("Fetching Sitemap from Chaldal...")
    # Chaldal's main sitemap
    url = "https://chaldal.com/sitemap.xml"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            print("Sitemap not found!")
            return

        # Parse XML
        root = ET.fromstring(response.content)
        
        categories = []
        # XML namespace is usually required for sitemaps
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        
        for url_tag in root.findall('ns:url', namespace):
            loc = url_tag.find('ns:loc', namespace).text
            
            # Filter for category URLs (usually contain dashes, no numbers)
            if "chaldal.com/" in loc and "-" in loc:
                # Basic cleanup to get a readable name
                name = loc.split("/")[-1].replace("-", " ").title()
                
                # Exclude junk
                if any(x in loc for x in ["t/", "citySelection", "offers", "help"]):
                    continue
                    
                categories.append({
                    "category": name,
                    "url": loc
                })

        # Deduplicate
        unique_cats = {v['url']: v for v in categories}.values()
        
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(list(unique_cats), f, indent=2)
            
        print(f"SUCCESS: Extracted {len(unique_cats)} categories from Sitemap.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fetch_from_sitemap()