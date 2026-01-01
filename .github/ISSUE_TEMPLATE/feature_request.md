---
name: 'Feature: Add index or rule'
about: Request to add Firestore index or rule changes
labels: enhancement
---

**Describe the change**
Add an index for querying rifas by status and timerExpiresAt

**Why**
The scheduled worker requires a composite index on (status, timerExpiresAt) to query rifas in contagem efficiently.

**Files to update**
- firestore.indexes.json
- README / deploy instructions
