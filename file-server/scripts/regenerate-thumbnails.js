#!/usr/bin/env node
/**
 * Regenerate all video thumbnails with face detection
 */

const fs = require('fs-extra');
const path = require('path');
const thumbnailService = require('../src/services/thumbnailService');
const videoService = require('../src/services/videoService');

async function regenerateThumbnails() {
  console.log('🎬 Starting thumbnail regeneration with face detection...\n');
  
  // Initialize video service
  console.log('🔄 Initializing video service...');
  await videoService.initialize();
  
  // Get all videos
  const videos = videoService.getAllVideos();
  console.log(`📹 Found ${videos.length} videos\n`);
  
  // Delete existing thumbnails
  const thumbnailDir = path.join(__dirname, '../thumbnails');
  console.log(`🗑️  Clearing existing thumbnails from: ${thumbnailDir}`);
  await fs.emptyDir(thumbnailDir);
  console.log('✅ Thumbnails cleared\n');
  
  let generated = 0;
  let failed = 0;
  
  // Generate new thumbnails with face detection
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    console.log(`[${i + 1}/${videos.length}] Processing: ${video.title}`);
    
    try {
      const thumbnailPath = await thumbnailService.generateThumbnail(video.path, video.id);
      if (thumbnailPath) {
        console.log(`  ✅ Generated thumbnail\n`);
        generated++;
      } else {
        console.log(`  ⚠️  Failed to generate thumbnail\n`);
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
      failed++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`  ✅ Generated: ${generated}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📹 Total: ${videos.length}`);
}

// Run if called directly
if (require.main === module) {
  regenerateThumbnails()
    .then(() => {
      console.log('\n🎉 Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { regenerateThumbnails };