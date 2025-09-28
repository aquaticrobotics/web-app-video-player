const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const config = require('../../config/config.json');

class VideoService {
  constructor() {
    this.videos = new Map();
    this.metadataCache = new Map();
    this.searchCache = new Map();
    this.statsCache = null;
    this.statsCacheTime = 0;
    this.isInitialized = false;
    
    // Cache configuration
    this.CACHE_TTL = {
      search: 5 * 60 * 1000,      // 5 minutes
      stats: 10 * 60 * 1000,     // 10 minutes
      metadata: 60 * 60 * 1000   // 1 hour
    };
    
    // Clean cache periodically
    this.startCacheCleanup();
  }

  startCacheCleanup() {
    setInterval(() => {
      this.cleanExpiredCache();
    }, 5 * 60 * 1000); // Clean every 5 minutes
  }

  cleanExpiredCache() {
    const now = Date.now();
    
    // Clean search cache
    for (const [key, value] of this.searchCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL.search) {
        this.searchCache.delete(key);
      }
    }
    
    // Clean stats cache
    if (this.statsCacheTime && now - this.statsCacheTime > this.CACHE_TTL.stats) {
      this.statsCache = null;
      this.statsCacheTime = 0;
    }
  }

  async initialize() {
    try {
      console.log('Initializing video service...');
      await this.scanVideoFolder();
      this.isInitialized = true;
      console.log(`Found ${this.videos.size} videos`);
    } catch (error) {
      console.error('Failed to initialize video service:', error);
      throw error;
    }
  }

  async scanVideoFolder() {
    try {
      const videoFolder = config.videoFolder;
      
      // Ensure video folder exists
      if (!await fs.pathExists(videoFolder)) {
        console.warn(`Video folder does not exist: ${videoFolder}`);
        return;
      }

      const files = await fs.readdir(videoFolder);
      const videoFiles = files.filter(file => 
        config.supportedFormats.some(format => 
          file.toLowerCase().endsWith(format.toLowerCase())
        )
      );

      console.log(`Scanning ${videoFiles.length} video files...`);

      for (const file of videoFiles) {
        try {
          const filePath = path.join(videoFolder, file);
          const stats = await fs.stat(filePath);
          
          const videoId = this.generateVideoId(file);
          console.log(`🎬 [VIDEO DEBUG] Processing video: ${file} (ID: ${videoId})`);
          
          const metadata = await this.extractMetadata(filePath);
          
          const videoInfo = {
            id: videoId,
            filename: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            ...metadata
          };

          this.videos.set(videoId, videoInfo);
          console.log(`✅ [VIDEO DEBUG] Successfully processed: ${file}`);
        } catch (error) {
          console.error(`🚨 [VIDEO DEBUG] Error processing ${file}:`, error.message);
          if (error.message.includes('Corrupted video file')) {
            console.warn(`🚨 [VIDEO DEBUG] Skipping corrupted file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Error scanning video folder:', error);
      throw error;
    }
  }

  async extractMetadata(filePath) {
    return new Promise((resolve, reject) => {
      console.log(`🎬 [VIDEO DEBUG] Extracting metadata for: ${filePath}`);
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error(`🚨 [VIDEO DEBUG] FFprobe error for ${filePath}:`, err.message);
          
          // Check if it's a corrupted file
          if (err.message.includes('moov atom not found') || err.message.includes('Invalid data found')) {
            console.warn(`🚨 [VIDEO DEBUG] Corrupted file detected: ${filePath} - REJECTING`);
            reject(new Error(`Corrupted video file: ${err.message}`));
            return;
          }
          
          // Return basic metadata if ffprobe fails for other reasons
          console.warn(`⚠️ [VIDEO DEBUG] Using fallback metadata for: ${filePath}`);
          resolve({
            duration: 0,
            width: 0,
            height: 0,
            format: path.extname(filePath).toLowerCase(),
            title: path.basename(filePath, path.extname(filePath))
          });
          return;
        }

        try {
          const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
          const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
          
          const result = {
            duration: parseFloat(metadata.format.duration) || 0,
            format: metadata.format.format_name || path.extname(filePath).toLowerCase(),
            size: parseInt(metadata.format.size) || 0,
            bitrate: parseInt(metadata.format.bit_rate) || 0,
            title: metadata.format.tags?.title || path.basename(filePath, path.extname(filePath)),
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            fps: videoStream ? this.parseFps(videoStream.r_frame_rate) : 0,
            videoCodec: videoStream?.codec_name || 'unknown',
            audioCodec: audioStream?.codec_name || 'unknown',
            hasAudio: !!audioStream,
            hasVideo: !!videoStream
          };

          resolve(result);
        } catch (parseError) {
          console.error(`Error parsing metadata for ${filePath}:`, parseError);
          resolve({
            duration: 0,
            width: 0,
            height: 0,
            format: path.extname(filePath).toLowerCase(),
            title: path.basename(filePath, path.extname(filePath))
          });
        }
      });
    });
  }

  parseFps(frameRate) {
    if (!frameRate) return 0;
    const parts = frameRate.split('/');
    if (parts.length === 2) {
      return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
    return parseFloat(frameRate);
  }

  generateVideoId(filename) {
    // Generate a simple ID based on filename
    return Buffer.from(filename).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  getAllVideos() {
    return Array.from(this.videos.values());
  }

  getVideoById(id) {
    return this.videos.get(id);
  }

  searchVideos(query) {
    if (!query) return this.getAllVideos();
    
    const searchKey = query.toLowerCase();
    const now = Date.now();
    
    // Check cache first
    const cached = this.searchCache.get(searchKey);
    if (cached && now - cached.timestamp < this.CACHE_TTL.search) {
      return cached.results;
    }
    
    // Perform search with enhanced matching
    const searchTerm = searchKey;
    const results = this.getAllVideos().filter(video => {
      const titleMatch = video.title.toLowerCase().includes(searchTerm);
      const filenameMatch = video.filename.toLowerCase().includes(searchTerm);
      const formatMatch = video.format && video.format.toLowerCase().includes(searchTerm);
      const qualityMatch = this.getVideoQuality(video.width, video.height).toLowerCase().includes(searchTerm);
      
      return titleMatch || filenameMatch || formatMatch || qualityMatch;
    });
    
    // Cache results
    this.searchCache.set(searchKey, {
      results,
      timestamp: now
    });
    
    return results;
  }

  getVideoQuality(width, height) {
    if (width >= 1920 || height >= 1080) return 'HD';
    if (width >= 1280 || height >= 720) return '720p';
    if (width >= 854 || height >= 480) return '480p';
    return 'SD';
  }

  getVideosByCategory() {
    // Simple categorization by file extension
    const categories = {};
    
    this.getAllVideos().forEach(video => {
      const ext = path.extname(video.filename).toLowerCase();
      if (!categories[ext]) {
        categories[ext] = [];
      }
      categories[ext].push(video);
    });

    return categories;
  }

  async refreshVideoLibrary() {
    console.log('Refreshing video library...');
    
    // Clear all caches
    this.videos.clear();
    this.metadataCache.clear();
    this.searchCache.clear();
    this.statsCache = null;
    this.statsCacheTime = 0;
    
    await this.scanVideoFolder();
    console.log(`Refreshed: ${this.videos.size} videos found`);
    
    // Pre-calculate stats for faster initial loading
    this.getStats();
  }

  getStats() {
    const now = Date.now();
    
    // Return cached stats if still valid
    if (this.statsCache && now - this.statsCacheTime < this.CACHE_TTL.stats) {
      return this.statsCache;
    }
    
    // Calculate fresh stats
    const videos = this.getAllVideos();
    const totalSize = videos.reduce((sum, video) => sum + (video.size || 0), 0);
    const totalDuration = videos.reduce((sum, video) => sum + (video.duration || 0), 0);
    
    // Group by quality for enhanced stats
    const qualityDistribution = {};
    const formatDistribution = {};
    let hdCount = 0, sdCount = 0;
    
    videos.forEach(video => {
      const quality = this.getVideoQuality(video.width, video.height);
      qualityDistribution[quality] = (qualityDistribution[quality] || 0) + 1;
      
      if (video.format) {
        formatDistribution[video.format] = (formatDistribution[video.format] || 0) + 1;
      }
      
      if (quality === 'HD') hdCount++;
      else sdCount++;
    });
    
    const stats = {
      totalVideos: videos.length,
      totalSize,
      totalDuration,
      averageDuration: videos.length > 0 ? totalDuration / videos.length : 0,
      averageSize: videos.length > 0 ? totalSize / videos.length : 0,
      formats: [...new Set(videos.map(v => v.format).filter(Boolean))],
      qualityDistribution,
      formatDistribution,
      hdCount,
      sdCount,
      lastUpdated: now
    };
    
    // Cache the results
    this.statsCache = stats;
    this.statsCacheTime = now;
    
    return stats;
  }
}

module.exports = new VideoService();