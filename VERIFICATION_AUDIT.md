# NJCII Industrial Base Map — Verification Audit

**Generated**: February 28, 2026
**Dataset Version**: Tier 1 Data Foundation (v2.0)
**Total Firms**: 351

## Verification Status Summary

| Status | Count | Percentage |
|--------|------:|------------|
| Verified | 221 | 63.0% |
| Partially Verified | 97 | 27.6% |
| Unverified | 33 | 9.4% |

### Verification Criteria

- **Verified**: Firm appears in USAspending.gov with a confirmed UEI, has NJ address, and contract data matches across sources. 221 firms met this standard.
- **Partially Verified**: Firm has SBIR/STTR award data from SBIR.gov bulk download but no corresponding USAspending.gov contract record for FY2021–2025. Entity exists in federal databases but NJ-specific contract activity could not be cross-referenced. 97 firms are in this category.
- **Unverified**: Firm was added from manual research (installations, known primes) without direct API-sourced contract data. Data relies on corporate websites, press releases, and publicly available defense industry information. 33 firms are in this category.

## Data Source Provenance

| Source Combination | Count |
|-------------------|------:|
| SBIR.gov | 185 |
| USAspending.gov | 132 |
| research_installations_primes | 17 |
| SBIR.gov+USAspending.gov | 12 |
| USAspending.gov+research_installations_primes | 4 |
| SBIR.gov+research_installations_primes | 1 |

## Record Completeness Audit

| Field | Present | Missing | Coverage |
|-------|--------:|--------:|---------:|
| firm_name | 351 | 0 | 100.0% |
| city | 351 | 0 | 100.0% |
| county | 184 | 167 | 52.4% |
| zip | 348 | 3 | 99.1% |
| address | 184 | 167 | 52.4% |
| naics_primary | 166 | 185 | 47.3% |
| cage_code | 12 | 339 | 3.4% |
| duns_uei | 66 | 285 | 18.8% |
| website | 55 | 296 | 15.7% |
| employee_count | 32 | 319 | 9.1% |
| latitude/longitude | 184 | 167 | 52.4% |
| congressional_district | 184 | 167 | 52.4% |

## Entity-Wide Value Flags

27 firms are flagged with `entity_wide_flag: true`. These are large prime contractors (e.g., Lockheed Martin, BAE Systems, L3Harris) whose `total_federal_contract_value` reflects the parent entity's nationwide obligations, not NJ-specific work. Users should interpret these values as indicative of NJ facility presence for a major prime, not as NJ-specific revenue.

### Flagged Firms (Top 10 by Value)

| Firm | Total Federal Value | Agencies |
|------|--------------------:|----------|
| Lockheed Martin Corporation | $132,344,449,663 | DOD, DHS |
| Booz Allen Hamilton | $18,018,851,682 | VA |
| Merck & Co., Inc. (Merck Sharp & Dohme) | $13,802,446,394 | HHS, DOD |
| L3Harris Technologies, Inc. | $10,126,244,699 | DOD |
| Bae Systems Information and Electronic Systems Integration Inc. | $3,850,545,525 | DOD |
| Leidos, Inc. | $2,905,640,334 | DOD |
| L3 Technologies, Inc. | $1,742,484,767 | DOD |
| Lockheed Martin Rotary and Mission Systems (rms) - Moorestown / Mount Laurel | $885,185,076 | DOD |
| Lockheed Martin Rms - Moorestown (cseds/uss Rancocas Site) | $885,185,076 | DOD |
| Lockheed Martin Integrated Systems, LLC | $608,888,487 | DOD |

## Duplicate Entity Groups

7 duplicate groups identified (16 firms total). These represent the same parent entity appearing under different names or subsidiaries in federal data. One firm per group is marked `is_primary_entity: true`.

| Group ID | Firms in Group |
|----------|---------------:|
| a3-enterprise | 2 |
| american-water | 2 |
| gsi-flemington | 4 |
| insap-centurum | 2 |
| l3harris | 2 |
| lockheed-martin | 2 |
| renova | 2 |

## County Verification

- 181 firms have verified county assignments (via ZIP-to-county lookup)
- 183 used ZIP-based verification
- 2 county mismatches were identified and documented (Renova entities: listed Ocean County, ZIP 07712 maps to Monmouth County)

## Source URLs

Every firm record includes a `source_urls` array pointing to its primary federal data source(s):
- USAspending.gov recipient pages: `https://www.usaspending.gov/recipient/[UEI]/latest`
- SAM.gov entity pages: `https://sam.gov/entity/[UEI]`
- SBIR.gov award searches: `https://www.sbir.gov/sbirsearch/award/all?firm=[name]&state=NJ`

These URLs enable independent verification of all data points in the dataset.
