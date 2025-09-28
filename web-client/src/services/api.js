import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `http://${window.location.hostname}:3001`;

class ApiService {
  constructor() {
    // FIXED: Use global axios instance instead of creating a new one
    // This ensures we get the Authorization headers from AuthService interceptors
    this.api = axios;
    
    // Set base URL and timeout on global instance
    this.api.defaults.baseURL = API_BASE_URL;
    this.api.defaults.timeout = 30000;
    
    // Client-side caching
    this.cache = new Map();
    this.cacheConfig = {
      videos: { ttl: 2 * 60 * 1000, key: 'videos' },           // 2 minutes
      categories: { ttl: 10 * 60 * 1000, key: 'categories' },  // 10 minutes
      stats: { ttl: 5 * 60 * 1000, key: 'stats' },             // 5 minutes
      search: { ttl: 2 * 60 * 1000, prefix: 'search_' },       // 2 minutes per query
      video: { ttl: 30 * 60 * 1000, prefix: 'video_' }         // 30 minutes per video
    };
    
    // Cleanup expired cache entries periodically
    this.startCacheCleanup();
  }
  
  startCacheCleanup() {
    setInterval(() => {
      this.cleanExpiredCache();
    }, 60 * 1000); // Clean every minute
  }
  
  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      console.log('📦 CACHE HIT:', key);
      return cached.data;
    }
    return null;
  }
  
  setCachedData(key, data, ttl) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      timestamp: Date.now()
    });
    console.log('📦 CACHE SET:', key);
  }
  
  invalidateCache(pattern) {
    if (typeof pattern === 'string') {
      // Exact match
      this.cache.delete(pattern);
    } else if (pattern instanceof RegExp) {
      // Pattern match
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
    console.log('🗑️ CACHE INVALIDATED:', pattern);
  }

  // Video endpoints
  async getVideos() {
    const cacheKey = this.cacheConfig.videos.key;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;
    
    try {
      console.log('📡 DEBUG: Making API request to /api/videos');
      console.log('📡 DEBUG: Using global axios instance with interceptors');
      console.log('📡 DEBUG: Base URL:', this.api.defaults.baseURL);
      
      const response = await this.api.get('/api/videos');
      console.log('📡 DEBUG: API Response structure:', response.data);
      console.log('📡 DEBUG: Extracting videos array:', response.data.videos);
      
      // FIXED: Extract videos array from response wrapper
      const videos = response.data.videos || [];
      
      // Cache the result
      this.setCachedData(cacheKey, videos, this.cacheConfig.videos.ttl);
      
      return videos;
    } catch (error) {
      console.error('Error fetching videos:', error);
      console.error('📡 DEBUG: Response status:', error.response?.status);
      console.error('📡 DEBUG: Response data:', error.response?.data);
      throw error;
    }
  }

  async getVideoById(id) {
    console.log('🔗 [API SERVICE DEBUG] ========================================');
    console.log('🔗 [API SERVICE DEBUG] getVideoById called with ID:', id);
    console.log('🔗 [API SERVICE DEBUG] API_BASE_URL:', API_BASE_URL);
    console.log('🔗 [API SERVICE DEBUG] Full URL:', `${API_BASE_URL}/api/videos/${id}`);
    
    const cacheKey = this.cacheConfig.video.prefix + id;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      console.log('🔗 [API SERVICE DEBUG] Returning cached video:', cached);
      return cached;
    }
    
    try {
      console.log('🔗 [API SERVICE DEBUG] Making API request to /api/videos/' + id);
      const response = await this.api.get(`/api/videos/${id}`);
      console.log('🔗 [API SERVICE DEBUG] Response status:', response.status);
      console.log('🔗 [API SERVICE DEBUG] Response data:', response.data);
      
      // FIXED: Extract video from response wrapper
      const video = response.data.video || response.data;
      console.log('🔗 [API SERVICE DEBUG] Extracted video object:', video);
      console.log('🔗 [API SERVICE DEBUG] Video ID in response:', video?.id);
      console.log('🔗 [API SERVICE DEBUG] Video title in response:', video?.title);
      
      // Cache the result
      this.setCachedData(cacheKey, video, this.cacheConfig.video.ttl);
      
      return video;
    } catch (error) {
      console.error('❌ [API SERVICE DEBUG] Error fetching video:', error);
      console.error('❌ [API SERVICE DEBUG] Error response:', error.response?.data);
      console.error('❌ [API SERVICE DEBUG] Error status:', error.response?.status);
      throw error;
    }
  }

  async searchVideos(query) {
    const cacheKey = this.cacheConfig.search.prefix + query.toLowerCase();
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;
    
    try {
      console.log('📡 DEBUG: Making API request to search:', query);
      const response = await this.api.get(`/api/videos/search/${encodeURIComponent(query)}`);
      const results = response.data;
      
      // Cache the search results
      this.setCachedData(cacheKey, results, this.cacheConfig.search.ttl);
      
      return results;
    } catch (error) {
      console.error('Error searching videos:', error);
      throw error;
    }
  }

  async getVideoCategories() {
    const cacheKey = this.cacheConfig.categories.key;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;
    
    try {
      console.log('📡 DEBUG: Making API request to /api/videos/categories/all');
      const response = await this.api.get('/api/videos/categories/all');
      console.log('📡 DEBUG: Categories response structure:', response.data);
      
      // FIXED: Extract categories from response wrapper
      const categories = response.data.categories || {};
      
      // Cache the result
      this.setCachedData(cacheKey, categories, this.cacheConfig.categories.ttl);
      
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  async refreshVideoLibrary() {
    try {
      console.log('📡 DEBUG: Making API request to refresh library');
      const response = await this.api.post('/api/videos/refresh');
      return response.data;
    } catch (error) {
      console.error('Error refreshing library:', error);
      throw error;
    }
  }

  async getLibraryStats() {
    const cacheKey = this.cacheConfig.stats.key;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;
    
    try {
      console.log('📡 DEBUG: Making API request to /api/videos/stats/overview');
      const response = await this.api.get('/api/videos/stats/overview');
      console.log('📡 DEBUG: Stats response structure:', response.data);
      
      // FIXED: Extract stats from response wrapper
      const stats = response.data.stats || null;
      
      // Cache the result
      if (stats) {
        this.setCachedData(cacheKey, stats, this.cacheConfig.stats.ttl);
      }
      
      return stats;
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }

  // Streaming endpoints
  getVideoStreamUrl(id) {
    return `${API_BASE_URL}/api/stream/${id}`;
  }

  async getVideoStreamInfo(id) {
    try {
      const response = await this.api.get(`/api/stream/${id}/info`);
      return response.data;
    } catch (error) {
      console.error('Error fetching stream info:', error);
      throw error;
    }
  }

  getVideoDownloadUrl(id) {
    return `${API_BASE_URL}/api/stream/${id}/download`;
  }

  // Thumbnail endpoints
  getThumbnailUrl(id) {
    return `${API_BASE_URL}/thumbnails/${id}.jpg`;
  }

  async generateThumbnail(id) {
    try {
      const response = await this.api.post(`/api/videos/${id}/thumbnail`);
      return response.data;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      throw error;
    }
  }

  async generateThumbnailAtTime(id, timeInSeconds) {
    try {
      const response = await this.api.post(`/api/videos/${id}/thumbnail/${timeInSeconds}`);
      return response.data;
    } catch (error) {
      console.error('Error generating thumbnail at time:', error);
      throw error;
    }
  }

  // Utility methods
  formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  getVideoQuality(width, height) {
    if (width >= 1920 || height >= 1080) return 'HD';
    if (width >= 1280 || height >= 720) return '720p';
    if (width >= 854 || height >= 480) return '480p';
    return 'SD';
  }
}

export const apiService = new ApiService();