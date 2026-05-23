# Daam Track BD — Agent Guide

## Project
Bangladesh commodity price tracker. React + Vite + DuckDB WASM frontend, Python Playwright scraper.

## Commands (from root)
- `pnpm dev` — start dev server (auto-selects available port)
- `pnpm build` — production build (outputs `dist/`)
- `pnpm lint` — ESLint (only check; no typecheck in this repo)
- `pnpm preview` — preview production build (auto-selects available port)
- `python generate_fake_data.py` — populate `public/data/` with 10yr synthetic data (needed before `pnpm dev` to see charts)

## Architecture
- **Dual-branch data system**: `main` = app code, `database` = Parquet/JSON data only
- CI checks out `database` branch **into `public/`** so scraper writes there, then commits back to `database`
- In dev, `public/` is intentionally gitignored — run `generate_fake_data.py` to create local test data
- **DevSourceToggle**: "Use Remote Data" toggle in dev mode (saves to localStorage, reloads page)
- Data URL logic in `src/config.js`: production → raw GitHub `database` branch; dev → local `BASE_URL` or remote if toggled

## Data format
- Prices: Parquet files partitioned by year at `data/prices/year=YYYY/data.parquet`
- Item index: `data/meta.json` — array of `{name, category, unit, image, price}`
- Images: served from `database` branch at `images/{hash}.webp`
- DuckDB WASM loads all years in parallel on app init, registers as `prices/year_YYYY.parquet`

## Scraper (`scraper/`)
```bash
pip install -r requirements.txt
playwright install chromium
python fetch_categories.py   # discover categories → categories.json
python main.py               # scrape prices
```
- Site-specific (Chaldal.com); `fetch_categories.py` needs updating if target changes
- GitHub Action runs daily at midnight Dhaka time (18:00 UTC)

## Conventions
- No TypeScript — plain JSX only
- Tailwind CSS v4 with `@theme` + `@custom-variant dark` (class-based dark mode)
- Styling: warm cream/blue light theme, purple dark theme
- ESLint with `react-hooks` + `react-refresh` plugins; ignores `dist`
- No test framework configured
- Deploy: push tag `v*` → GitHub Pages (CNAME: `daam.pro.bd`)

## Gotchas
- `meta.json` is the search index source of truth for item lookup
- `public/` is gitignored on `main` (local test data only); scraped data lives on the `database` branch in CI
- Remove `public/data/` before regenerating if the data schema changes
- `useDuckDB` hook is a singleton — initializes once per page load; data source change triggers reload
- `Data Fix`: manual workflow `fix_data.yml` runs `scraper/fix_data.py` on `database` branch
