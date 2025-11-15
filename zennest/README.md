# Zennest - Home Stay Booking Platform

A React + Vite application for booking home stays, experiences, and services.

## Database Migration & Backfill Scripts

### Backfilling Missing Listing Fields

If listings are missing `completedBookingsCount`, `province`, or `coords` fields, use the backfill script to safely add them without deleting any documents.

#### Prerequisites

1. **Firebase Admin SDK Setup:**
   - Install Firebase Admin SDK: `npm install firebase-admin`
   - Get your Firebase service account key from Firebase Console
   - Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable

#### Running the Backfill Script

```bash
# Set service account credentials
export GOOGLE_APPLICATION_CREDENTIALS="./path/to/serviceAccountKey.json"

# Run the backfill script
node scripts/backfill_listings.js
```

The script will:
- Scan all listings in the `listings` collection
- Add `completedBookingsCount: 0` if missing
- Add `province: ''` if missing (or infer from location string if possible)
- Add `coords: null` if missing
- Generate a report at `scripts/backfill_report.json`

**Important:** This script does NOT delete any documents. It only adds missing fields.

### Recovering Deleted Documents

If documents were accidentally deleted from Firestore, recovery depends on available backups:

#### Option 1: Firestore Backups (Recommended)

If you have Firestore backups enabled:

```bash
# List available backups
gcloud firestore backups list --project=YOUR_PROJECT_ID

# Restore from backup (replace BACKUP_NAME with actual backup name)
gcloud firestore backups restore BACKUP_NAME --project=YOUR_PROJECT_ID
```

#### Option 2: Manual Recovery from Exports

If you have exported data:

```bash
# Import from JSON export
gcloud firestore import gs://YOUR_BUCKET/backup_folder --project=YOUR_PROJECT_ID
```

#### Option 3: Soft-Archived Listings

If listings were soft-archived (using `softArchiveListing`), they can be restored:

1. Query Firestore for documents with `archived: true`
2. Update the document to set `archived: false` and `status: 'published'`

Example query:
```javascript
// In Firebase Console or Admin SDK
const archivedListings = await db.collection('listings')
  .where('archived', '==', true)
  .get();

// Restore each listing
archivedListings.forEach(doc => {
  doc.ref.update({
    archived: false,
    status: 'published',
    archivedAt: admin.firestore.FieldValue.delete()
  });
});
```

### Safety Features

- **Soft Archive:** Listings are archived (not deleted) when removed, allowing recovery
- **No Auto-Deletion:** Listings are never automatically deleted due to missing fields
- **Safe Defaults:** All new fields have safe defaults (empty string, null, or 0)

## Development

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
```
