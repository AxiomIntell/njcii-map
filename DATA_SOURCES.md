# NJ-CII Industrial Base Map — Data Sources & Methodology

## Data Collection Date

All data was collected on **February 27, 2026**.

## Primary Data Source

### USAspending.gov

- **URL**: https://api.usaspending.gov/api/v2/search/spending_by_award/
- **Method**: API queries for all DOD contract awards to New Jersey-based recipient firms
- **Fiscal Years**: FY2022–FY2025 (trailing 3-year window from FY2023 forward)
- **Fields Extracted**: Legal business name, recipient address (city, county, ZIP), NAICS codes, award amounts, awarding agency/sub-agency, contract descriptions, small business certification flags, UEI, DUNS, CAGE code
- **Filtering**: Firms with >$500K in trailing 3-year DOD contract obligations were prioritized
- **Records**: 151 firms extracted from this source
- **Notes**: Contract values represent obligations (amounts the government has committed to spend), not disbursements (actual payments made). Multi-year contracts may inflate apparent annual spending.

### OLDCC Defense Spending Report

- **URL**: https://oldcc.gov/sites/default/files/2024-12/FY2023%20Defense%20Spending_NJ.pdf
- **Method**: Referenced for validation and supplementary contract value data
- **Fiscal Year**: FY2023
- **Notes**: The Office of Local Defense Community Cooperation (OLDCC) publishes annual defense spending by state reports. Used to cross-reference top contractor values.

## Secondary Data Sources

### Manual Research — Major Defense Installations & Prime Contractors

- **Method**: Web research to identify and verify major military installations and prime contractor facilities in New Jersey
- **Sources**: 
  - Official installation websites (army.mil, navy.mil)
  - Corporate facility pages (lockheedmartin.com, l3harris.com, baesystems.com, etc.)
  - Defense industry trade publications
  - DEVCOM Armaments Center (Picatinny Arsenal) vendor lists
  - Naval Air Warfare Center Aircraft Division (NAWCAD) Lakehurst information
- **Entities Documented**: 33 entities including:
  - 7 military installations (Picatinny Arsenal, JB McGuire-Dix-Lakehurst, NWS Earle, NAWCAD Lakehurst, DEVCOM AC, ACC-NJ, Fort Monmouth/FMERA)
  - 13 prime contractor NJ facilities (Lockheed Martin, L3Harris, BAE Systems, Northrop Grumman, General Dynamics, SAIC, Leidos, Peraton Labs, Booz Allen Hamilton, Curtiss-Wright, etc.)
  - 6 life sciences/pharmaceutical firms (J&J, Merck, BMS, Novo Nordisk, Sanofi, Janssen)
  - 3 energy/infrastructure firms (PSEG, PSEG Nuclear, Atlantic Shores)
  - Research institutions (SRI International Princeton)
- **Notes**: Military installations were documented for context but excluded from the final firm dataset (installations are not "firms"). Only companies with NJ facilities were included.

### SBIR.gov

- **URL**: https://www.sbir.gov
- **Method**: Searched for NJ-based SBIR/STTR award recipients with DOD awards
- **Records**: Identified firms including MaXentric Technologies, Princeton Infrared Technologies, Inaedis Inc., Magneton Inc., AeroDefense
- **Notes**: SBIR/STTR award amounts were documented where available but may represent Phase I/II values, not full contract lifecycle values.

### GovCon in a Box

- **URL**: https://govconinabox.com
- **Method**: Referenced for NJ-based 8(a) certified defense contractors and contract volume estimates
- **Records**: Supplementary data for firms like EHS Technologies, Envision Innovative Solutions, A3 Technology, Parts Life Inc.

### HigherGov

- **URL**: https://www.highergov.com
- **Method**: Referenced for additional NJ defense contractor identification and contract data validation
- **Notes**: Used for cross-referencing, not as a primary data source.

### DCAA Active Contractor Listing

- **URL**: https://www.dcaa.mil/Portals/88/FY%202022%20Active%20Contractor%20Listing.pdf
- **Fiscal Year**: FY2022
- **Method**: Referenced to identify NJ-based firms with active DCAA audit relationships
- **Notes**: The Defense Contract Audit Agency (DCAA) listing confirms firms actively performing under DOD contracts.

### Company Websites & Press Releases

- **Method**: Individual company websites, press releases, and LinkedIn profiles were consulted to verify addresses, employee counts, and business descriptions
- **Notes**: Website URLs and employee count ranges were collected where publicly available.

## Geocoding Methodology

### Primary Method: US Census Bureau Geocoder

- **API**: https://geocoding.geo.census.gov/geocoder/locations/onelineaddress
- **Method**: Full street addresses were submitted to the Census Bureau's geocoding API for precise latitude/longitude coordinates
- **Success Rate**: Approximately 40% of addresses were geocoded via this method

### Fallback Method: City Centroid Lookup

- **Method**: For addresses where the Census geocoder failed or returned no results, pre-compiled city centroid coordinates for 44 NJ cities were used
- **Source**: City centroids derived from US Census Bureau geographic data
- **Accuracy**: City-level (typically within 1-3 miles of actual location)
- **Flag**: Firms geocoded via centroid fallback are marked with "Medium" confidence scores

### County Centroid Fallback

- **Method**: For firms with no specific address or unrecognized city, county geographic centroids were used
- **Flag**: These firms are marked with "Low" confidence scores

## Sector Classification Methodology

Firms were classified into one of four NJ-CII sectors based on:

1. **Primary NAICS code** — The first/primary NAICS code from USAspending.gov
2. **Contract type** — The nature of DOD contracts (weapons systems vs. pharmaceuticals vs. construction)
3. **Manual review** — Known industry classification for major firms

### Classification Rules

| Sector | NAICS Codes | Description |
|--------|-------------|-------------|
| Defense & Aerospace | 334xxx, 336xxx, 541330, 541712, 541715, 236220 (military construction) | Firms primarily engaged in defense R&D, electronics, aerospace, or military construction |
| Life Sciences & Pharmaceutical Manufacturing | 325xxx, 339xxx, biotech | Pharmaceutical manufacturers, biotech firms, medical device companies |
| Energy & Critical Infrastructure | 221xxx, 237xxx (non-military), telecom | Utilities, grid technology, renewable energy, critical infrastructure |
| Advanced Manufacturing & Logistics | 315xxx, 332xxx, 483xxx | Precision manufacturing, specialty chemicals, logistics |

## Geographic Cluster Assignment

Firms were assigned to geographic clusters based on county:

| Cluster | Counties |
|---------|----------|
| North | Bergen, Essex, Hudson, Morris, Passaic, Sussex, Warren |
| Central | Hunterdon, Mercer, Middlesex, Monmouth, Ocean, Somerset, Union |
| South | Atlantic, Burlington, Camden, Cape May, Cumberland, Gloucester, Salem |

## Congressional District Assignment

Congressional districts were approximated from county using a primary-county mapping. This is an approximation — many counties span multiple districts. Production data would use Census block-level district assignment.

## Confidence Scoring

| Score | Criteria |
|-------|----------|
| High | USAspending data with specific address and contract values verified |
| Medium | Data from secondary sources, or city-level geocoding used |
| Low | Manually added entries, estimated data, or county-level geocoding |

### Distribution in Dataset

- **High**: 154 firms (84%)
- **Medium**: 21 firms (11%)
- **Low**: 9 firms (5%)

## Data Limitations

1. **Subcontractor gap**: USAspending.gov primarily captures prime contracts. The vast majority of NJ's defense supply chain consists of subcontractors (Tier 2+) that do not appear directly in federal procurement databases.

2. **Registration address vs. performance location**: Some firms are registered at addresses outside NJ but perform work in NJ (and vice versa). The dataset uses the recipient address from USAspending.gov, which may not always reflect the NJ performance location.

3. **COVID-era distortion**: FY2022–FY2023 data includes significant COVID-related procurement (e.g., Merck's $2.2B molnupiravir contract) that may not represent ongoing defense-industrial base activity.

4. **Certification currency**: Small business certifications (8(a), SDVOSB, etc.) have expiration dates and may not be current. The data reflects certifications at the time of contract award.

5. **Employee count estimates**: Employee counts are approximate ranges, often derived from company self-reporting rather than verified counts.

6. **NAICS code limitations**: Firms often operate across multiple NAICS codes. The primary NAICS code may not fully represent the firm's defense-relevant capabilities.
