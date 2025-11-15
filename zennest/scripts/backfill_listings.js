#!/usr/bin/env node
/**
 * Backfill Migration Script for Listings
 * 
 * This script safely backfills missing fields in listings collection:
 * - completedBookingsCount: set to 0 if missing
 * - province: set to empty string if missing (or infer from location if possible)
 * - coords: set to null if missing
 * 
 * IMPORTANT: This script does NOT delete any documents. It only adds missing fields.
 * 
 * Usage:
 *   node scripts/backfill_listings.js
 * 
 * Requirements:
 *   - GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to Firebase service account JSON
 *   - Or use Firebase Admin SDK with default credentials
 * 
 * Example:
 *   export GOOGLE_APPLICATION_CREDENTIALS="./path/to/serviceAccountKey.json"
 *   node scripts/backfill_listings.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Try to use service account from environment variable
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(path.resolve(serviceAccountPath));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Initialized Firebase Admin with service account');
    } else {
      // Try default credentials (for Firebase CLI or GCP environments)
      admin.initializeApp();
      console.log('✅ Initialized Firebase Admin with default credentials');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    console.error('Please set GOOGLE_APPLICATION_CREDENTIALS or use Firebase CLI login');
    process.exit(1);
  }
}

const db = admin.firestore();

// Province patterns for inference from location string
const PROVINCE_PATTERNS = [
  'Metro Manila', 'Bulacan', 'Cavite', 'Laguna', 'Rizal', 'Pampanga',
  'Batangas', 'Quezon', 'Nueva Ecija', 'Tarlac', 'Zambales', 'Bataan',
  'Aurora', 'Albay', 'Cebu', 'Davao del Sur', 'Iloilo', 'Negros Occidental',
  'Pangasinan'
];

/**
 * Try to infer province from location string
 */
function inferProvinceFromLocation(location) {
  if (!location || typeof location !== 'string') return '';
  
  const locationLower = location.toLowerCase();
  for (const province of PROVINCE_PATTERNS) {
    if (locationLower.includes(province.toLowerCase())) {
      return province;
    }
  }
  return '';
}

/**
 * Main backfill function
 */
async function backfillListings() {
  console.log('🚀 Starting listings backfill migration...\n');
  
  const report = {
    startTime: new Date().toISOString(),
    totalScanned: 0,
    modified: [],
    errors: [],
    summary: {
      completedBookingsCountAdded: 0,
      provinceAdded: 0,
      provinceInferred: 0,
      coordsSetToNull: 0
    }
  };

  try {
    // Get all listings
    const listingsRef = db.collection('listings');
    const snapshot = await listingsRef.get();
    
    report.totalScanned = snapshot.size;
    console.log(`📊 Found ${snapshot.size} listings to process\n`);

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit

    snapshot.forEach((doc) => {
      const data = doc.data();
      const updates = {};
      let modified = false;

      // Check and add completedBookingsCount
      if (data.completedBookingsCount === undefined || data.completedBookingsCount === null) {
        updates.completedBookingsCount = 0;
        report.summary.completedBookingsCountAdded++;
        modified = true;
      }

      // Check and add province
      if (!data.province || data.province.trim() === '') {
        // Try to infer from location
        const inferredProvince = inferProvinceFromLocation(data.location);
        if (inferredProvince) {
          updates.province = inferredProvince;
          report.summary.provinceInferred++;
        } else {
          updates.province = '';
          report.summary.provinceAdded++;
        }
        modified = true;
      }

      // Check and add coords (set to null if missing)
      if (data.coords === undefined) {
        updates.coords = null;
        report.summary.coordsSetToNull++;
        modified = true;
      }

      // Apply updates if any
      if (modified) {
        const docRef = listingsRef.doc(doc.id);
        batch.update(docRef, updates);
        report.modified.push({
          id: doc.id,
          title: data.title || 'Untitled',
          updates: Object.keys(updates)
        });
        batchCount++;

        // Commit batch if it reaches the limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`✅ Committed batch of ${batchCount} updates`);
          // Create new batch for next set of updates
          batch = db.batch();
          batchCount = 0;
        }
      }
    });

    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Committed final batch of ${batchCount} updates`);
    }

    report.endTime = new Date().toISOString();
    report.success = true;

    // Write report to file
    const reportPath = path.join(__dirname, 'backfill_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n✅ Backfill completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Total scanned: ${report.totalScanned}`);
    console.log(`   Modified: ${report.modified.length}`);
    console.log(`   - completedBookingsCount added: ${report.summary.completedBookingsCountAdded}`);
    console.log(`   - province added: ${report.summary.provinceAdded}`);
    console.log(`   - province inferred: ${report.summary.provinceInferred}`);
    console.log(`   - coords set to null: ${report.summary.coordsSetToNull}`);
    console.log(`\n📄 Full report saved to: ${reportPath}`);

    if (report.modified.length > 0) {
      console.log(`\n📋 Modified listing IDs (first 10):`);
      report.modified.slice(0, 10).forEach(item => {
        console.log(`   - ${item.id}: ${item.title} (${item.updates.join(', ')})`);
      });
      if (report.modified.length > 10) {
        console.log(`   ... and ${report.modified.length - 10} more`);
      }
    }

  } catch (error) {
    console.error('\n❌ Error during backfill:', error);
    report.endTime = new Date().toISOString();
    report.success = false;
    report.errors.push({
      message: error.message,
      stack: error.stack
    });

    // Write error report
    const reportPath = path.join(__dirname, 'backfill_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    process.exit(1);
  }
}

// Run the backfill
backfillListings()
  .then(() => {
    console.log('\n✨ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

