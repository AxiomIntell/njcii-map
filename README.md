# NJ-CII Industrial Base Map

An interactive, searchable, filterable web application for exploring New Jersey's critical industrial base. Built for the New Jersey Critical Industries Initiative (NJ-CII).

## Overview

The Industrial Base Map is NJ-CII's core analytical tool. It provides stakeholders — including state economic development leadership, defense program managers, and workforce planners — with an interactive view of New Jersey's critical industries ecosystem.

### Key Features

- **351 verified firms** sourced from USAspending.gov, SBIR.gov, and public federal databases
- **Interactive map** with Leaflet/OpenStreetMap, marker clustering, and color-coded sectors
- **Advanced filtering**: sector, county, geographic cluster, congressional district, contract value tier, certifications, NAICS codes
- **Firm detail pages** with complete records for each entity
- **Sector overview pages** with charts, geographic distribution, and NAICS analysis
- **Dashboard** with summary statistics, charts, and searchable/sortable firm table
- **Readiness scoring** — 100-point composite score (A–F grade) based on federal engagement, revenue diversity, growth signal, certifications, and data quality
- **Trend classification** — Growing, Active, Stable, Historical, Declining, or New Entry based on year-over-year obligation data
- **Entity-wide flags** for large primes whose values reflect nationwide obligations
- **Source URLs** for every firm enabling independent verification
- **CSV export** from the Map Explorer
- **Access code gate** to prevent casual discovery

### Dataset Summary (v2.0)

| Metric | Value |
|--------|------:|
| Total firms | 351 |
| Verified | 221 (63%) |
| Multi-agency | 33 |
| SBIR/STTR firms | 180 |
| With geocoordinates | 184 |

### Readiness Grade Distribution

| Grade | Count | Description |
|-------|------:|-------------|
| A | 5 | Strong across most dimensions |
| B | 33 | Solid engagement with some gaps |
| C | 145 | Moderate engagement |
| D | 126 | Limited verifiable engagement |
| F | 42 | Minimal verifiable activity |

### Sectors Covered

| Sector | Count |
|--------|------:|
| Defense & Aerospace | 166 |
| Advanced Manufacturing & Logistics | 170 |
| Life Sciences & Pharmaceutical Manufacturing | 9 |
| Energy & Critical Infrastructure | 6 |

### Geographic Clusters

- **North NJ**: Picatinny Arsenal / Port Newark corridor
- **Central NJ**: Joint Base McGuire-Dix-Lakehurst / Trenton corridor
- **South NJ**: NJ Wind Port / Camden shipyard corridor

## Data Architecture

### Firm Record Schema

Each firm in `firms_data.json` contains:

**Identity**: `firm_name`, `dba_name`, `address`, `city`, `county`, `zip`, `latitude`, `longitude`, `slug`

**Classification**: `sector`, `subsector`, `naics_primary`, `naics_description`, `geographic_cluster`, `congressional_district`

**Federal Engagement**: `total_dod_contract_value`, `total_federal_contract_value`, `total_federal_value_by_agency`, `total_federal_value_by_year`, `federal_agency_count`, `is_multi_agency`, `awarding_agencies`, `contract_descriptions`

**SBIR/STTR**: `sbir_sttr_awards` (array of individual awards), `sbir_sttr_total`, `sbir_sttr_award_count`

**Scoring**: `readiness_score` (total, grade, components), `trend_direction`, `confidence_score`

**Metadata**: `certifications`, `employee_count`, `cage_code`, `duns_uei`, `website`, `entity_wide_flag`, `source_urls`, `verification_status`, `verification_notes`, `data_source`, `parent_company`, `alternate_names`, `duplicate_group_id`, `is_primary_entity`, `last_updated`

### Data Files

| File | Description |
|------|-------------|
| `firms_data.json` | Complete enriched dataset (351 firms) |
| `DATA_SOURCES.md` | All data sources with URLs and methodology |
| `METHODOLOGY.md` | Scoring rubrics, trend calculations, classification rules |
| `VERIFICATION_AUDIT.md` | Record completeness, entity-wide flags, duplicate groups |

## Tech Stack

- **Framework**: Single-page application (vanilla JS with hash routing)
- **Styling**: Tailwind CSS (CDN)
- **Map**: Leaflet 1.9.4 with OpenStreetMap tiles and MarkerCluster plugin
- **Charts**: Chart.js 4.x
- **Data**: Static JSON — no database required
- **Deployment**: Static files (Vercel, S3, Netlify, or any static host)

## Quick Start

### Local Development

1. Clone this repository
2. Serve the files with any static file server:

```bash
python3 -m http.server 8080
```

3. Open http://localhost:8080
4. Enter access code: `NJCII2026`

### Deploy to Vercel (via GitHub)

1. Import the repository at [vercel.com/new](https://vercel.com/new)
2. Settings: Framework = Other, Build Command = (blank), Output Directory = `.`
3. Deploy

## Access Code

The application is protected by a simple access code: `NJCII2026`

This is a client-side gate for preventing casual discovery. It is not a security mechanism.

## Documentation

- [DATA_SOURCES.md](DATA_SOURCES.md) — Complete data provenance
- [METHODOLOGY.md](METHODOLOGY.md) — Scoring, trends, classification methodology
- [VERIFICATION_AUDIT.md](VERIFICATION_AUDIT.md) — Data quality audit

## License

Proprietary — NJ-CII / Axiom Intelligence
