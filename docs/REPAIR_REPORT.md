# TORONGO automated repair report

Original archive SHA-256 manifest verified.

## Source patch results

- APPLIED: Monthly calendar selected-area validation
- APPLIED: Remove fabricated monthly granule IDs
- APPLIED: Remove unsupported monthly full-coverage claim
- APPLIED: Reject monthly records without real IDs
- APPLIED: Remove global CMR fallback
- APPLIED: Remove fabricated main-query granule IDs
- APPLIED: Preserve selected area ID
- APPLIED: Remove unsupported main-query coverage claims
- APPLIED: Reject records without actual granule IDs
- REVIEW: Pass selected area ID into CMR helper (expected 1 match, found 3)
- APPLIED: Update CMR helper signature
- APPLIED: Add English unverified coverage label

## Important limitations

- CMR bounding-box matches are not full AOI coverage calculations.
- No SAR raster processing was added.
- No flood-area measurements were fabricated.
- No independent validation or IoU/kappa results were invented.
- NASA GIBS layer identifiers were not blindly renamed.
- Runtime and Android interaction testing remain necessary.
