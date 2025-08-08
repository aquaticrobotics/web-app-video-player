const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const config = require('../../config/config.json');

class ThumbnailService {
  constructor() {
    this.thumbnailCache = new Map();
  }

  async generateThumbnail(videoPath, videoId) {
    try {
      const thumbnailPath = path.join(config.thumbnailFolder, `${videoId}.jpg`);
      
      // Check if thumbnail already exists and is recent
      if (await this.isThumbnailValid(thumbnailPath)) {
        return thumbnailPath;
      }

      console.log(`Generating thumbnail for video: ${videoId}`);
      
      // Ensure thumbnail directory exists
      await fs.ensureDir(config.thumbnailFolder);

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            count: 1,
            folder: config.thumbnailFolder,
            filename: `${videoId}.jpg`,
            size: config.thumbnailSize || '320x180'
          })
          .on('end', () => {
            console.log(`Thumbnail generated: ${videoId}.jpg`);
            this.thumbnailCache.set(videoId, thumbnailPath);
            resolve(thumbnailPath);
          })
          .on('error', (err) => {
            console.error(`Error generating thumbnail for ${videoId}:`, err.message);
            // Create a placeholder thumbnail or return null
            reject(err);
          });
      });
    } catch (error) {
      console.error(`Thumbnail generation error for ${videoId}:`, error);
      throw error;
    }
  }

  async isThumbnailValid(thumbnailPath) {
    try {
      const stats = await fs.stat(thumbnailPath);
      const age = Date.now() - stats.mtime.getTime();
      
      // Check if thumbnail exists and is not too old
      return age < config.maxThumbnailAge;
    } catch (error) {
      // File doesn't exist
      return false;
    }
  }

  async getThumbnailPath(videoId) {
    const thumbnailPath = path.join(config.thumbnailFolder, `${videoId}.jpg`);
    
    if (await fs.pathExists(thumbnailPath)) {
      return thumbnailPath;
    }
    
    return null;
  }

  async generateMultipleThumbnails(videoPath, videoId, count = 3) {
    try {
      const thumbnailDir = path.join(config.thumbnailFolder, videoId);
      await fs.ensureDir(thumbnailDir);

      console.log(`Generating ${count} thumbnails for video: ${videoId}`);

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            count: count,
            folder: thumbnailDir,
            filename: `thumb_%i.jpg`,
            size: config.thumbnailSize || '320x180'
          })
          .on('end', () => {
            console.log(`${count} thumbnails generated for: ${videoId}`);
            resolve(thumbnailDir);
          })
          .on('error', (err) => {
            console.error(`Error generating thumbnails for ${videoId}:`, err.message);
            reject(err);
          });
      });
    } catch (error) {
      console.error(`Multiple thumbnail generation error for ${videoId}:`, error);
      throw error;
    }
  }

  async generateThumbnailAtTime(videoPath, videoId, timeInSeconds) {
    try {
      const thumbnailPath = path.join(config.thumbnailFolder, `${videoId}_${timeInSeconds}s.jpg`);
      
      // Check if this specific thumbnail already exists
      if (await fs.pathExists(thumbnailPath)) {
        return thumbnailPath;
      }

      console.log(`Generating thumbnail at ${timeInSeconds}s for video: ${videoId}`);
      
      await fs.ensureDir(config.thumbnailFolder);

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .seekInput(timeInSeconds)
          .screenshots({
            count: 1,
            folder: config.thumbnailFolder,
            filename: `${videoId}_${timeInSeconds}s.jpg`,
            size: config.thumbnailSize || '320x180'
          })
          .on('end', () => {
            console.log(`Thumbnail at ${timeInSeconds}s generated: ${videoId}`);
            resolve(thumbnailPath);
          })
          .on('error', (err) => {
            console.error(`Error generating thumbnail at ${timeInSeconds}s for ${videoId}:`, err.message);
            reject(err);
          });
      });
    } catch (error) {
      console.error(`Thumbnail at time generation error for ${videoId}:`, error);
      throw error;
    }
  }

  async cleanupOldThumbnails() {
    try {
      console.log('Cleaning up old thumbnails...');
      const thumbnailDir = config.thumbnailFolder;
      
      if (!await fs.pathExists(thumbnailDir)) {
        return;
      }

      const files = await fs.readdir(thumbnailDir);
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(thumbnailDir, file);
        const stats = await fs.stat(filePath);
        const age = Date.now() - stats.mtime.getTime();

        if (age > config.maxThumbnailAge) {
          await fs.remove(filePath);
          cleanedCount++;
        }
      }

      console.log(`Cleaned up ${cleanedCount} old thumbnails`);
    } catch (error) {
      console.error('Error cleaning up thumbnails:', error);
    }
  }

  async getThumbnailStats() {
    try {
      const thumbnailDir = config.thumbnailFolder;
      
      if (!await fs.pathExists(thumbnailDir)) {
        return { count: 0, totalSize: 0 };
      }

      const files = await fs.readdir(thumbnailDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(thumbnailDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }

      return {
        count: files.length,
        totalSize,
        averageSize: files.length > 0 ? totalSize / files.length : 0
      };
    } catch (error) {
      console.error('Error getting thumbnail stats:', error);
      return { count: 0, totalSize: 0 };
    }
  }

  async createPlaceholderThumbnail(videoId) {
    // Create a simple placeholder thumbnail if video thumbnail generation fails
    const placeholderPath = path.join(config.thumbnailFolder, `${videoId}_placeholder.jpg`);
    
    try {
      // You could generate a simple colored rectangle or use a default image
      // For now, we'll just return null to indicate no thumbnail available
      return null;
    } catch (error) {
      console.error('Error creating placeholder thumbnail:', error);
      return null;
    }
  }
}

module.exports = new ThumbnailService();