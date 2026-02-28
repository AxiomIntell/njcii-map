# NJCII Industrial Base Map — Methodology

**Version**: Tier 1 Data Foundation (v2.0)
**Date**: February 28, 2026

## Overview

This document describes the methodology used to build, enrich, and score the NJCII Industrial Base Map dataset. All data is sourced from public federal databases. No synthetic data, estimated contract values, or fabricated entities are included.

## Data Collection

### Phase 1: USAspending.gov Expanded Pull

**Source**: USAspending.gov Award Search API (`/api/v2/search/spending_by_award/`)

**Parameters**:
- Fiscal Years: FY2021 through FY2025
- All federal awarding agencies (expanded from DOD-only in v1)
- New Jersey place of performance
- Award types: Contracts (A, B, C, D) and Grants (02, 03, 04, 05)
- No minimum threshold (v1 used $500K cutoff)

**Result**: 1,391 unique NJ recipients identified across all agencies.

**Fields Extracted**: Legal business name, DBA name, address (street, city, county, state, ZIP), UEI, CAGE code, NAICS code, awarding agency, award amounts by fiscal year, contract descriptions.

**Matching to Existing Firms**: Name normalization (lowercase, strip suffixes like LLC/Inc/Corp, remove punctuation) was used to match against the 184 existing firms. 139 of 184 (76%) matched. Unmatched firms were retained in the dataset with their original data.

### Phase 2: SBIR/STTR Bulk Data

**Source**: SBIR.gov bulk CSV download (`award_data.csv`, 85MB)

**Filtering**: State = NJ

**Result**: 180 unique NJ firms with 492 SBIR/STTR awards totaling $329,695,730.

**Fields Extracted**: Firm name, city, state, ZIP, award year, award amount, program (SBIR/STTR), phase (I/II/III), agency, award title, topic number, proposal award date, contract/grant number.

**Matching**: Name normalization matched 13 of 180 SBIR firms to existing dataset entries. 167 new SBIR-only firms were added to the dataset.

### Phase 3: Manual Research (Preserved from v1)

17 entities from manual research (installations, known primes, energy firms, life sciences) were preserved from the original v1 dataset. These include major defense installations and prime contractor NJ facilities documented from corporate websites, installation directories, and defense trade publications.

## Data Cleaning

### ZIP Code Fills

99 firms were missing ZIP codes. These were filled using a city-to-ZIP lookup table for 44 NJ cities. 98 of 99 were successfully filled (1 had an unrecognized city).

### County Verification

County assignments were verified against a ZIP-to-county lookup. 181 of 184 original firms had verified or confirmable county assignments. 2 Renova entities showed a mismatch (listed as Ocean County, but ZIP 07712 maps to Monmouth County).

### Duplicate Detection

Fuzzy name matching identified 7 duplicate groups (16 firms total). Groups include: American Water (2 entities), GSI/Flemington JVs (3), Renova (2), INSAP/Centurum (2), A3/Enterprise (2), Lockheed Martin (3), L3Harris (2). One entity per group is marked as primary.

## Enrichment Fields

### Agency Attribution

For firms matched in USAspending.gov, federal contract values are broken down by:
- **Awarding agency** (`total_federal_value_by_agency`): DOD, DHS, DOE, HHS, NASA, etc.
- **Fiscal year** (`total_federal_value_by_year`): FY2021 through FY2025
- **Agency count** (`federal_agency_count`): Number of distinct federal agencies

### Entity-Wide Flags

27 large prime contractors have `entity_wide_flag: true`. USAspending.gov reports obligations at the parent entity level for large contractors, meaning the `total_federal_contract_value` for firms like Lockheed Martin reflects nationwide obligations, not NJ-specific work. This flag alerts users to interpret values cautiously.

Detection criteria: Firms with total federal value exceeding $500M AND known nationwide operations were manually flagged.

## Readiness Scoring

### Rubric (100-point scale)

| Component | Max Points | Description |
|-----------|----------:|-------------|
| Federal Engagement | 30 | Recent contract/SBIR activity (FY2023-2025 weighted highest), SBIR Phase II/III bonus |
| Revenue Diversity | 20 | Multi-agency breadth + dual-track (contracts + SBIR) |
| Growth Signal | 15 | Trend direction: Growing (15), Active (12), New Entry (11), Stable (10), Historical (5), Declining (3), Inactive (1), Unknown (0) |
| Certifications | 15 | Set-aside certifications (4 pts each, max 12) + SBIR Phase II/III achievement (3 pts) |
| Data Quality | 20 | Identity fields (8), enrichment fields (6), verification status (6) |

### Grade Thresholds

| Grade | Score Range | Interpretation |
|-------|-----------|----------------|
| A | 70–100 | Strong across most dimensions. Active, diversified, well-documented. |
| B | 55–69 | Solid federal engagement with some gaps in data or diversification. |
| C | 40–54 | Moderate engagement. May be single-agency or have limited recent activity. |
| D | 25–39 | Limited verifiable engagement or data. May be SBIR-only with older awards. |
| F | 0–24 | Minimal verifiable federal activity or very incomplete data. |

### Current Distribution

| Grade | Count | Percentage |
|-------|------:|------------|
| A | 5 | 1.4% |
| B | 33 | 9.4% |
| C | 145 | 41.3% |
| D | 126 | 35.9% |
| F | 42 | 12.0% |

## Trend Classification

Trend direction is computed from year-over-year federal obligation data (USAspending) or SBIR award recency.

### USAspending Trend (Primary)
For firms with 2+ years of non-zero obligations, the first-half average is compared to the second-half average:
- **Growing**: Second-half average > 15% above first-half average
- **Stable**: Within +/- 15%
- **Declining**: Second-half average > 15% below first-half average

Special cases:
- **New Entry**: Only 1 year of data and that year is FY2024 or FY2025
- **Inactive**: Has USAspending records but all years show $0 obligations

### SBIR Trend (Fallback)
For firms without USAspending time-series data:
- **Growing**: 2+ SBIR awards since 2023
- **Active**: 1 SBIR award since 2023
- **Historical**: Only SBIR awards before 2023

### Current Distribution

| Trend | Count | Percentage |
|-------|------:|------------|
| Growing | 74 | 21.1% |
| Active | 70 | 19.9% |
| New Entry | 5 | 1.4% |
| Stable | 61 | 17.4% |
| Historical | 63 | 17.9% |
| Declining | 34 | 9.7% |
| Inactive | 1 | 0.3% |
| Unknown | 43 | 12.3% |

## Sector Classification

Firms are classified into four NJ-CII sectors based on primary NAICS code:

| Sector | Count | Key NAICS Ranges |
|--------|------:|-----------------|
| Defense & Aerospace | 166 | 334xxx, 336xxx, 541330, 541712, 541715, 236220 |
| Advanced Manufacturing & Logistics | 170 | 332xxx, 315xxx, 483xxx, and unlisted NAICS codes |
| Life Sciences & Pharmaceutical Manufacturing | 9 | 325xxx, 339xxx, biotech |
| Energy & Critical Infrastructure | 6 | 221xxx, 237xxx, telecom |

SBIR-only firms without NAICS data are classified as "Advanced Manufacturing & Logistics" (default) pending future enrichment.

## Geographic Assignment

- **Geographic Cluster**: Assigned by county (North/Central/South NJ)
- **Congressional District**: Approximated from county using a primary-county mapping
- **Coordinates**: 184 firms have geocoded coordinates (Census Bureau API + city centroid fallback). 167 SBIR-only firms lack coordinates pending future geocoding.

## Data Limitations

1. **Entity-wide values**: 27 large primes show nationwide, not NJ-specific, contract values
2. **Subcontractor gap**: Only prime contracts and SBIR awards are captured — Tier 2+ suppliers are invisible
3. **SBIR-only firms**: 167 firms have SBIR data only, without USAspending contract records or geocoordinates
4. **Certification currency**: Set-aside certifications may have expired since the contract award date
5. **NAICS classification**: SBIR-only firms often lack NAICS codes; sector assignment may be approximate
6. **COVID distortion**: FY2021-2023 data includes pandemic-era procurement that may not reflect ongoing activity
