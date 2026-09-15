import time

from playwright.sync_api import sync_playwright

PAGES = [
    ("http://localhost:5173/", "dashboard.png"),
    ("http://localhost:5173/movimientos/nuevo", "movimiento-nuevo.png"),
    ("http://localhost:5173/obras", "obras.png"),
    ("http://localhost:5173/materiales", "materiales.png"),
    ("http://localhost:5173/movimientos", "historial.png"),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    for url, filename in PAGES:
        page.goto(url, wait_until="networkidle")
        time.sleep(1.0)
        page.screenshot(path=f"docs/screenshots/{filename}")
        print(f"OK {filename}")
    browser.close()
