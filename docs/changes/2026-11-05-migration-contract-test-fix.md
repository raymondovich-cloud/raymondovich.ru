# Migration contract test correction

**Date:** 05.11.2026

- Corrected the transaction-boundary assertion for the restored planning migration.
- The SQL contains two descriptive comment lines before its explicit `BEGIN`; the test now permits those leading comments while still requiring a terminal `COMMIT`.
- The migration SQL itself was not changed.

No production database or migration history was modified.
