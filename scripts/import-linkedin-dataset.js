/**
 * LinkedIn Dataset Import Script
 * Imports the large LinkedIn posts dataset into Supabase
 *
 * Usage: node scripts/import-linkedin-dataset.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://baurjucvzdboavbcuxjh.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdXJqdWN2emRib2F2YmN1eGpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc3MjU4MiwiZXhwIjoyMDg1MzQ4NTgyfQ.i-x3sbd_-nWslacIQauf0--nIiinGQDyXbyQ52alqf0';

// Batch size for inserts
const BATCH_SIZE = 100;

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Transform a raw post object to match our table schema
 */
function transformPost(post) {
  return {
    // URN identifiers
    activity_urn: post.urn?.activity_urn || null,
    share_urn: post.urn?.share_urn || null,
    ugc_post_urn: post.urn?.ugcPost_urn || null,
    full_urn: post.full_urn || null,

    // Post content
    text: post.text || null,
    url: post.url || null,
    post_type: post.post_type || null,

    // Posted at info
    posted_date: post.posted_at?.date ? new Date(post.posted_at.date).toISOString() : null,
    posted_relative: post.posted_at?.relative || null,
    posted_timestamp: post.posted_at?.timestamp || null,

    // Author info
    author_first_name: post.author?.first_name || null,
    author_last_name: post.author?.last_name || null,
    author_headline: post.author?.headline || null,
    author_username: post.author?.username || null,
    author_profile_url: post.author?.profile_url || null,
    author_profile_picture: post.author?.profile_picture || null,

    // Stats
    total_reactions: post.stats?.total_reactions || 0,
    likes: post.stats?.like || 0,
    supports: post.stats?.support || 0,
    loves: post.stats?.love || 0,
    insights: post.stats?.insight || 0,
    celebrates: post.stats?.celebrate || 0,
    funny: post.stats?.funny || 0,
    comments: post.stats?.comments || 0,
    reposts: post.stats?.reposts || 0,

    // Media
    media_type: post.media?.type || null,
    media_url: post.media?.url || null,
    media_images: post.media?.images || null,

    // Source
    profile_input: post.profile_input || null,

    // Raw data
    raw_data: post
  };
}

/**
 * Insert a batch of posts into Supabase
 */
async function insertBatch(posts, batchNumber, totalBatches) {
  const transformedPosts = posts.map(transformPost);

  const { data, error } = await supabase
    .from('linkedin_research_posts')
    .upsert(transformedPosts, {
      onConflict: 'activity_urn',
      ignoreDuplicates: true
    });

  if (error) {
    console.error(`Batch ${batchNumber}/${totalBatches} failed:`, error.message);
    return { success: false, count: 0, error: error.message };
  }

  console.log(`Batch ${batchNumber}/${totalBatches} inserted successfully (${posts.length} posts)`);
  return { success: true, count: posts.length };
}

/**
 * Main import function
 */
async function importDataset() {
  console.log('='.repeat(60));
  console.log('LinkedIn Dataset Import Script');
  console.log('='.repeat(60));

  // Read the dataset file
  const datasetPath = path.join(__dirname, '..', 'linkedin-dataset.json');
  console.log(`\nReading dataset from: ${datasetPath}`);

  if (!fs.existsSync(datasetPath)) {
    console.error('Dataset file not found!');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(datasetPath, 'utf-8');
  const posts = JSON.parse(fileContent);

  console.log(`Total posts to import: ${posts.length}`);

  // Calculate batches
  const totalBatches = Math.ceil(posts.length / BATCH_SIZE);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Total batches: ${totalBatches}`);
  console.log('\nStarting import...\n');

  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    const result = await insertBatch(batch, batchNumber, totalBatches);

    if (result.success) {
      successCount += result.count;
    } else {
      failCount += batch.length;
    }

    // Small delay to avoid rate limiting
    if (batchNumber < totalBatches) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('Import Complete!');
  console.log('='.repeat(60));
  console.log(`Total posts processed: ${posts.length}`);
  console.log(`Successfully imported: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Duration: ${duration} seconds`);
  console.log('='.repeat(60));
}

// Run the import
importDataset().catch(console.error);
