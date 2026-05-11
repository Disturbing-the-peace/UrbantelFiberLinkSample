/**
 * Cleanup Script: Remove duplicate signature files from Supabase Storage
 * 
 * Context: Before migration 031, we stored the same image twice:
 * - government_id_url: Government ID with signatures
 * - signature_url: Same image (duplicate)
 * 
 * This script:
 * 1. Lists all files in customer-documents bucket with 'signature' in the path
 * 2. Deletes them since they're duplicates of government_id files
 * 
 * Run this AFTER running the SQL migration 031_remove_signature_column.sql
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET_NAME = 'customer-documents';

async function cleanupSignatureFiles() {
  console.log('🧹 Starting cleanup of duplicate signature files...\n');

  try {
    // List all files in the bucket
    console.log('📂 Listing all files in customer-documents bucket...');
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        limit: 10000, // Adjust if you have more files
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      throw new Error(`Failed to list files: ${listError.message}`);
    }

    if (!files || files.length === 0) {
      console.log('✅ No files found in bucket. Nothing to clean up.');
      return;
    }

    console.log(`📊 Found ${files.length} total files in bucket\n`);

    // Find all signature files (files with 'signature' in the path)
    const signatureFiles: string[] = [];
    
    for (const file of files) {
      // Check if this is a folder (application ID)
      if (file.id === null) {
        // This is a folder, list files inside it
        const { data: subFiles, error: subListError } = await supabase.storage
          .from(BUCKET_NAME)
          .list(file.name, {
            limit: 100
          });

        if (subListError) {
          console.warn(`⚠️  Failed to list files in ${file.name}: ${subListError.message}`);
          continue;
        }

        if (subFiles) {
          for (const subFile of subFiles) {
            const fullPath = `${file.name}/${subFile.name}`;
            if (subFile.name.toLowerCase().includes('signature')) {
              signatureFiles.push(fullPath);
            }
          }
        }
      } else {
        // This is a file at root level
        if (file.name.toLowerCase().includes('signature')) {
          signatureFiles.push(file.name);
        }
      }
    }

    console.log(`🔍 Found ${signatureFiles.length} signature files to delete\n`);

    if (signatureFiles.length === 0) {
      console.log('✅ No signature files found. Cleanup complete!');
      return;
    }

    // Show files that will be deleted
    console.log('📋 Files to be deleted:');
    signatureFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log('');

    // Delete files in batches of 100 (Supabase limit)
    const batchSize = 100;
    let deletedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < signatureFiles.length; i += batchSize) {
      const batch = signatureFiles.slice(i, i + batchSize);
      
      console.log(`🗑️  Deleting batch ${Math.floor(i / batchSize) + 1} (${batch.length} files)...`);
      
      const { data, error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(batch);

      if (deleteError) {
        console.error(`   ❌ Error deleting batch: ${deleteError.message}`);
        failedCount += batch.length;
      } else {
        deletedCount += batch.length;
        console.log(`   ✅ Deleted ${batch.length} files`);
      }
    }

    console.log('\n📊 Cleanup Summary:');
    console.log(`   ✅ Successfully deleted: ${deletedCount} files`);
    if (failedCount > 0) {
      console.log(`   ❌ Failed to delete: ${failedCount} files`);
    }
    console.log(`   💾 Storage space freed: ~${(deletedCount * 0.5).toFixed(2)} MB (estimated)`);
    console.log('\n✨ Cleanup complete!');

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupSignatureFiles()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
