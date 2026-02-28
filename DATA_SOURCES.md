# NJ-CII Industrial Base Map — Data Sources

**Last Updated**: February 28, 2026
**Dataset Version**: Tier 1 Data Foundation (v2.0)

## Primary Data Sources

### 1. USAspending.gov — Federal Contract & Grant Data

- **URL**: https://api.usaspending.gov/api/v2/search/spending_by_award/
- **Method**: API queries for all federal awards (contracts + grants) to NJ-based recipients
- **Scope**: All federal awarding agencies (expanded from DOD-only in v1)
- **Fiscal Years**: FY2021–FY2025
- **Filtering**: Place of performance = New Jersey; no minimum dollar threshold
- **Records**: 1,391 unique NJ recipients extracted
- **Match Rate**: 139 of 184 original firms (76%) matched via name normalization
- **Fields**: Legal business name, DBA, address (street/city/county/ZIP), UEI, CAGE code, NAICS code, awarding agency, award amounts by fiscal year, contract descriptions, small business flags
- **Notes**: Contract values represent obligations (committed amounts), not disbursements. Multi-year and IDIQ contracts may show large single-year values. Entity-wide values for large primes (Lockheed, BAE, etc.) reflect parent-level nationwide obligations.

### 2. SBIR.gov — Small Business Innovation Research Awards

- **URL**: https://www.sbir.gov/api/awards.csv (bulk download)
- **Method**: Bulk CSV download (85MB), filtered to State = NJ
- **Records**: 180 unique NJ firms, 492 individual awards
- **Total Value**: $329,695,730
- **Match Rate**: 13 of 180 SBIR firms matched to existing dataset (7%)
- **Fields**: Firm name, city, ZIP, award year, amount, program (SBIR/STTR), phase (I/II/III), awarding agency, award title, topic, proposal date, contract/grant number
- **Notes**: SBIR.gov data is published by SBA. Award amounts represent funded amounts per phase. Phase I awards are typically $150K–$275K; Phase II awards are typically $500K–$1.75M.

### 3. Manual Research — Installations & Known Primes

- **Method**: Web research to identify major military installations and prime contractor NJ facilities
- **Sources**: Official installation websites (army.mil, navy.mil), corporate facility pages, defense trade publications, DEVCOM/NAWCAD vendor lists
- **Records**: 17 entities (installations, large primes, life sciences, energy firms)
- **Verification Level**: Unverified (no direct API match to contract data)

## Secondary / Validation Sources

### SAM.gov — System for Award Management
- **URL**: https://sam.gov
- **Use**: Entity verification, UEI validation, address confirmation
- **Note**: Source URLs reference SAM.gov entity pages for verification

### OLDCC Defense Spending Report
- **URL**: https://oldcc.gov
- **Use**: Cross-reference for top NJ contractor values (FY2023)

### DCAA Active Contractor Listing
- **URL**: https://www.dcaa.mil
- **Use**: Confirm firms with active DCAA audit relationships

### Company Websites & Press Releases
- **Use**: Verify addresses, employee counts, business descriptions

## Geocoding Sources

### US Census Bureau Geocoder (Primary)
- **API**: https://geocoding.geo.census.gov/geocoder/locations/onelineaddress
- **Success Rate**: ~40% of addresses geocoded precisely
- **Accuracy**: Address-level (within meters)

### City Centroid Lookup (Fallback)
- **Source**: Pre-compiled centroids for 44 NJ cities from Census geographic data
- **Accuracy**: City-level (1–3 miles of actual location)

### ZIP-to-County Lookup
- **Use**: County assignment verification and correction
- **Source**: USPS ZIP code to county mappings

## Data Pipeline Summary

```
USAspending.gov API ──┐
                      ├── Name normalization & matching ──> Merge ──> Enrichment ──> firms_data.json
SBIR.gov bulk CSV ────┘                                                    │
                                                                           ├── Readiness scoring
Manual research ─────────────────────────────────────────────────> Preserve ├── Trend classification
                                                                           ├── Entity-wide flagging
Census geocoder ─────────────────────────────────────────────────> Geocode  └── Verification audit
```

## Dataset Statistics

| Metric | Value |
|--------|------:|
| Total firms | 351 |
| From USAspending.gov | 148 |
| From SBIR.gov (exclusive) | 185 |
| From manual research (exclusive) | 17 |
| Overlapping sources | 17 |
| Multi-agency firms | 33 |
| Entity-wide flagged | 27 |
| SBIR/STTR firms | 180 |
| Total SBIR/STTR awards | 506 |
| Geocoded firms | 184 |
| Verified | 221 |
| Partially Verified | 97 |
| Unverified | 33 |
