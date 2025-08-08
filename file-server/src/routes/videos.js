const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const videoService = require('../services/videoService');
const thumbnailService = require('../services/thumbnailService');

const router = express.Router();

// Get all videos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const videos = videoService.getAllVideos();
    
    // Generate thumbnails for videos that don't have them
    const videosWithThumbnails = await Promise.all(
      videos.map(async (video) => {
        try {
          let thumbnailPath = await thumbnailService.getThumbnailPath(video.id);
          
          if (!thumbnailPath) {
            thumbnailPath = await thumbnailService.generateThumbnail(video.path, video.id);
          }
          
          return {
            ...video,
            thumbnail: thumbnailPath ? `/thumbnails/${video.id}.jpg` : null,
            hasThumb: !!thumbnailPath
          };
        } catch (error) {
          console.error(`Error processing thumbnail for ${video.id}:`, error.message);
          return {
            ...video,
            thumbnail: null,
            hasThumb: false
          };
        }
      })
    );

    res.json({
      success: true,
      videos: videosWithThumbnails,
      count: videosWithThumbnails.length
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch videos',
        status: 500
      }
    });
  }
});

// Get video by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const video = videoService.getVideoById(id);

    if (!video) {
      return res.status(404).json({
        error: {
          message: 'Video not found',
          status: 404
        }
      });
    }

    // Ensure thumbnail exists
    let thumbnailPath = await thumbnailService.getThumbnailPath(video.id);
    
    if (!thumbnailPath) {
      try {
        thumbnailPath = await thumbnailService.generateThumbnail(video.path, video.id);
      } catch (thumbError) {
        console.error(`Thumbnail generation failed for ${video.id}:`, thumbError.message);
      }
    }

    res.json({
      success: true,
      video: {
        ...video,
        thumbnail: thumbnailPath ? `/thumbnails/${video.id}.jpg` : null,
        hasThumb: !!thumbnailPath
      }
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch video',
        status: 500
      }
    });
  }
});

// Search videos
router.get('/search/:query', authenticateToken, async (req, res) => {
  try {
    const { query } = req.params;
    const videos = videoService.searchVideos(decodeURIComponent(query));

    // Add thumbnail information
    const videosWithThumbnails = await Promise.all(
      videos.map(async (video) => {
        const thumbnailPath = await thumbnailService.getThumbnailPath(video.id);
        return {
          ...video,
          thumbnail: thumbnailPath ? `/thumbnails/${video.id}.jpg` : null,
          hasThumb: !!thumbnailPath
        };
      })
    );

    res.json({
      success: true,
      videos: videosWithThumbnails,
      count: videosWithThumbnails.length,
      query: decodeURIComponent(query)
    });
  } catch (error) {
    console.error('Error searching videos:', error);
    res.status(500).json({
      error: {
        message: 'Failed to search videos',
        status: 500
      }
    });
  }
});

// Get videos by category
router.get('/categories/all', authenticateToken, async (req, res) => {
  try {
    const categories = videoService.getVideosByCategory();
    
    // Add thumbnail information to each category
    const categoriesWithThumbnails = {};
    
    for (const [category, videos] of Object.entries(categories)) {
      categoriesWithThumbnails[category] = await Promise.all(
        videos.map(async (video) => {
          const thumbnailPath = await thumbnailService.getThumbnailPath(video.id);
          return {
            ...video,
            thumbnail: thumbnailPath ? `/thumbnails/${video.id}.jpg` : null,
            hasThumb: !!thumbnailPath
          };
        })
      );
    }

    res.json({
      success: true,
      categories: categoriesWithThumbnails
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch categories',
        status: 500
      }
    });
  }
});

// Generate thumbnail for specific video
router.post('/:id/thumbnail', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const video = videoService.getVideoById(id);

    if (!video) {
      return res.status(404).json({
        error: {
          message: 'Video not found',
          status: 404
        }
      });
    }

    const thumbnailPath = await thumbnailService.generateThumbnail(video.path, video.id);

    res.json({
      success: true,
      thumbnail: `/thumbnails/${video.id}.jpg`,
      message: 'Thumbnail generated successfully'
    });
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate thumbnail',
        status: 500
      }
    });
  }
});

// Generate thumbnail at specific time
router.post('/:id/thumbnail/:time', authenticateToken, async (req, res) => {
  try {
    const { id, time } = req.params;
    const timeInSeconds = parseInt(time);
    
    if (isNaN(timeInSeconds)) {
      return res.status(400).json({
        error: {
          message: 'Invalid time parameter',
          status: 400
        }
      });
    }

    const video = videoService.getVideoById(id);

    if (!video) {
      return res.status(404).json({
        error: {
          message: 'Video not found',
          status: 404
        }
      });
    }

    const thumbnailPath = await thumbnailService.generateThumbnailAtTime(
      video.path, 
      video.id, 
      timeInSeconds
    );

    res.json({
      success: true,
      thumbnail: `/thumbnails/${video.id}_${timeInSeconds}s.jpg`,
      message: `Thumbnail generated at ${timeInSeconds}s`
    });
  } catch (error) {
    console.error('Error generating thumbnail at time:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate thumbnail at specified time',
        status: 500
      }
    });
  }
});

// Refresh video library
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    await videoService.refreshVideoLibrary();
    const stats = videoService.getStats();

    res.json({
      success: true,
      message: 'Video library refreshed successfully',
      stats
    });
  } catch (error) {
    console.error('Error refreshing video library:', error);
    res.status(500).json({
      error: {
        message: 'Failed to refresh video library',
        status: 500
      }
    });
  }
});

// Get library statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const videoStats = videoService.getStats();
    const thumbnailStats = await thumbnailService.getThumbnailStats();

    res.json({
      success: true,
      stats: {
        videos: videoStats,
        thumbnails: thumbnailStats
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch statistics',
        status: 500
      }
    });
  }
});

module.exports = router;