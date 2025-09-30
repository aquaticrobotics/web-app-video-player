const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { exec } = require('child_process');
const { promisify } = require('util');
const config = require('../../config/config.json');

const execAsync = promisify(exec);

class ThumbnailService {
  constructor() {
    this.thumbnailCache = new Map();
    this.useFaceDetection = true; // Enable face detection by default
    this.pythonAvailable = null; // Will be checked lazily
  }

  /**
   * Check if Python and OpenCV are available
   */
  async checkPythonAvailability() {
    if (this.pythonAvailable !== null) {
      return this.pythonAvailable;
    }

    try {
      // Try python3 first, then python
      try {
        await execAsync('python3 --version');
        await execAsync('python3 -c "import cv2"');
        this.pythonCommand = 'python3';
        this.pythonAvailable = true;
        console.log('✅ Python3 with OpenCV available for face detection');
      } catch (e) {
        await execAsync('python --version');
        await execAsync('python -c "import cv2"');
        this.pythonCommand = 'python';
        this.pythonAvailable = true;
        console.log('✅ Python with OpenCV available for face detection');
      }
      return true;
    } catch (error) {
      console.warn('⚠️  Python/OpenCV not available. Install with: pip install opencv-python');
      console.warn('💡 Falling back to standard first-frame thumbnails');
      this.pythonAvailable = false;
      this.useFaceDetection = false;
      return false;
    }
  }

  async generateThumbnail(videoPath, videoId) {
    try {
      const thumbnailPath = path.join(config.thumbnailFolder, `${videoId}.jpg`);
      
      // Check if thumbnail already exists and is recent
      if (await this.isThumbnailValid(thumbnailPath)) {
        console.log(`Using existing thumbnail for: ${videoId}`);
        return thumbnailPath;
      }

      // Check if we've already failed to generate this thumbnail
      const failedKey = `failed_${videoId}`;
      if (this.thumbnailCache.has(failedKey)) {
        console.log(`Skipping thumbnail generation for ${videoId} - previously failed`);
        return null;
      }

      console.log(`Generating thumbnail for video: ${videoId}`);
      
      // Ensure thumbnail directory exists
      await fs.ensureDir(config.thumbnailFolder);

      // Try Python-based face detection first
      if (this.useFaceDetection && await this.checkPythonAvailability()) {
        try {
          console.log('🔍 Attempting face detection for thumbnail...');
          const scriptPath = path.join(__dirname, '../../scripts/face_detect_thumbnail.py');
          const command = `${this.pythonCommand} "${scriptPath}" "${videoPath}" "${thumbnailPath}"`;
          
          await execAsync(command, { timeout: 30000 }); // 30 second timeout
          
          // Check if thumbnail was created
          if (await fs.pathExists(thumbnailPath)) {
            console.log(`✓ Face-detected thumbnail generated: ${videoId}.jpg`);
            this.thumbnailCache.set(videoId, thumbnailPath);
            return thumbnailPath;
          }
        } catch (faceError) {
          console.warn(`⚠️  Face detection failed for ${videoId}, falling back to standard thumbnail:`, faceError.message);
        }
      }

      // Fallback to standard thumbnail generation
      console.log('📸 Generating standard thumbnail...');
      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            count: 1,
            folder: config.thumbnailFolder,
            filename: `${videoId}.jpg`,
            size: config.thumbnailSize || '320x180'
          })
          .on('end', () => {
            console.log(`✓ Standard thumbnail generated: ${videoId}.jpg`);
            this.thumbnailCache.set(videoId, thumbnailPath);
            resolve(thumbnailPath);
          })
          .on('error', (err) => {
            console.log(`✗ Failed to generate thumbnail for ${videoId}: ${err.message}`);
            // Mark this video as failed to prevent repeated attempts
            this.thumbnailCache.set(failedKey, true);
            resolve(null); // Don't reject, return null instead
          });
      });
    } catch (error) {
      console.error(`Thumbnail generation error for ${videoId}:`, error);
      return null; // Return null instead of throwing
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