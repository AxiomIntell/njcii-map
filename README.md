# NJ-CII Industrial Base Map

An interactive, searchable, filterable web application for exploring New Jersey's critical industrial base. Built for the New Jersey Critical Industries Initiative (NJ-CII).

## Overview

The Industrial Base Map is NJ-CII's core analytical tool. It provides stakeholders — including state economic development leadership, defense program managers, and workforce planners — with an interactive view of New Jersey's critical industries ecosystem.

### Key Features

- **184 real firms** seeded from USAspending.gov and other public federal data sources
- **Interactive map** with Leaflet/OpenStreetMap, marker clustering, and color-coded sectors
- **Advanced filtering**: sector, county, geographic cluster, congressional district, contract value tier, certifications, NAICS codes
- **Firm detail pages** with complete records for each entity
- **Sector overview pages** with charts, geographic distribution, and NAICS analysis
- **Dashboard** with summary statistics, charts, and searchable/sortable firm table
- **CSV export** from the Map Explorer
- **Access code gate** to prevent casual discovery

### Sectors Covered

1. **Defense & Aerospace** (166 firms, $32.9B DOD contract value)
2. **Life Sciences & Pharmaceutical Manufacturing** (9 firms)
3. **Energy & Critical Infrastructure** (6 firms)
4. **Advanced Manufacturing & Logistics** (3 firms)

### Geographic Clusters

- **North NJ**: Picatinny Arsenal / Port Newark corridor (48 firms)
- **Central NJ**: Joint Base McGuire-Dix-Lakehurst / Trenton corridor (88 firms)
- **South NJ**: NJ Wind Port / Camden shipyard corridor (48 firms)

## Tech Stack

- **Framework**: Single-page application (vanilla JS with hash routing)
- **Styling**: Tailwind CSS (CDN)
- **Map**: Leaflet 1.9.4 with OpenStreetMap tiles and MarkerCluster plugin
- **Charts**: Chart.js 4.x
- **Data**: Static JSON (firms_seed_data.json) — no database required
- **Deployment**: Static files, deployable to any hosting (Vercel, S3, Netlify, etc.)

## Quick Start

### Local Development

1. Clone or download this directory
2. Serve the files with any static file server:

```bash
# Python
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# Or any other static server
```

3. Open http://localhost:8080 in your browser
4. Enter access code: `NJCII2026`

### Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. From this directory, run: `vercel`
3. Follow the prompts (no framework, no build command, output directory: `.`)
4. Your site will be live at the provided URL

### Deploy to Netlify

1. Drag and drop this folder into [Netlify Drop](https://app.netlify.com/drop)
2. Or use Netlify CLI: `netlify deploy --prod`

### Deploy to AWS S3

1. Create an S3 bucket with static website hosting enabled
2. Upload all files to the bucket
3. Set index.html as the index document

## Access Code

The default access code is `NJCII2026`. To change it:

1. Open `app.js`
2. Find the `ACCESS_CODE` constant (search for "NJCII2026")
3. Change the value
4. Redeploy

## Project Structure

```
njcii-map/
├── index.html              # Main HTML (single page with all views)
├── style.css               # Custom styles
├── app.js                  # Application logic (routing, state, maps, charts)
├── firms_seed_data.json    # Seed dataset (184 firms)
├── README.md               # This file
└── DATA_SOURCES.md         # Data collection methodology
```

## Data Model

Each firm record contains 27 fields:

| Field | Type | Description |
|-------|------|-------------|
| firm_name | string | Legal business name |
| dba_name | string | Doing-business-as name |
| address | string | Street address |
| city | string | City |
| county | string | NJ county |
| zip | string | ZIP code (5-digit) |
| latitude | float | Geocoded latitude |
| longitude | float | Geocoded longitude |
| naics_primary | string | Primary NAICS code |
| naics_description | string | NAICS description |
| sector | enum | One of 4 NJ-CII sectors |
| subsector | string | More specific classification |
| total_dod_contract_value_3yr | float | Trailing 3-year DOD obligations |
| total_federal_contract_value_3yr | float | Trailing 3-year federal obligations |
| awarding_agencies | array | Federal agencies |
| certifications | array | Small business certifications |
| employee_count | string | Size range |
| cage_code | string | CAGE code |
| duns_uei | string | UEI number |
| website | string | Company website |
| congressional_district | string | NJ congressional district |
| geographic_cluster | enum | North / Central / South |
| data_source | array | Data provenance |
| confidence_score | enum | High / Medium / Low |
| last_updated | date | Record date |
| slug | string | URL-friendly identifier |
| contract_descriptions | array | Top contract descriptions |

## Known Limitations

1. **Prototype data**: The 184-firm dataset is seeded from publicly available federal procurement data and may not be comprehensive. Many NJ defense firms are subcontractors and do not appear directly in USAspending.gov.

2. **Contract values**: Values represent obligations, not disbursements. Some firms have $0 contract value because they were added from secondary sources (installations research, SBIR data) without specific dollar amounts from USAspending.

3. **Geocoding**: Firm locations use a combination of Census Bureau geocoding and city centroid fallback. Some coordinates are approximate.

4. **Sector classification**: Automated based on NAICS codes and contract types. Some firms may be better classified in a different sector.

5. **No real-time data**: Data is static as of February 2026. A production version would integrate live API feeds from USAspending.gov and SAM.gov.

6. **Access code**: The access code gate is a simple deterrent, not real security. It uses an in-memory JavaScript variable and does not persist across page reloads in all environments.

## Future Enhancements

- Airtable or Supabase backend for live data management
- SAM.gov API integration for real-time entity data
- SBIR/STTR award tracking
- Supply chain dependency mapping
- Workforce analytics integration
- State certification (DVOB, SBE) database integration
- Export to PDF/Excel reports
- Admin interface for data management

## License

Proprietary — New Jersey Critical Industries Initiative. For authorized use only.
