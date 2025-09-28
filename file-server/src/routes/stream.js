const express = require('express');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { authenticateToken } = require('../middleware/auth');
const videoService = require('../services/videoService');

const router = express.Router();

// Streaming configuration
const STREAM_CONFIG = {
  // Optimal chunk size for video streaming (1MB)
  DEFAULT_CHUNK_SIZE: 1024 * 1024,
  // Maximum chunk size for range requests (8MB)
  MAX_CHUNK_SIZE: 8 * 1024 * 1024,
  // Minimum chunk size (64KB)
  MIN_CHUNK_SIZE: 64 * 1024,
  // Cache duration for video content (24 hours)
  CACHE_DURATION: 24 * 60 * 60,
  // Buffer size for fs.createReadStream
  BUFFER_SIZE: 64 * 1024
};

// Utility function to calculate optimal chunk size
function getOptimalChunkSize(fileSize, requestedRange) {
  if (!requestedRange) {
    // For full file requests, use larger chunks for better throughput
    return Math.min(STREAM_CONFIG.MAX_CHUNK_SIZE, Math.max(STREAM_CONFIG.DEFAULT_CHUNK_SIZE, fileSize / 100));
  }
  
  const rangeSize = requestedRange.end - requestedRange.start + 1;
  return Math.min(STREAM_CONFIG.MAX_CHUNK_SIZE, Math.max(STREAM_CONFIG.MIN_CHUNK_SIZE, rangeSize));
}

// Enhanced CORS headers for streaming with Safari/mobile compatibility
function setStreamingHeaders(res, mimeType, cacheControl = true) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization, Content-Type, If-Range, If-Modified-Since');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Content-Type, Accept-Ranges');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', mimeType);
  
  // Safari/iOS specific headers for better video compatibility
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Connection', 'keep-alive');
  
  if (cacheControl) {
    res.setHeader('Cache-Control', `public, max-age=${STREAM_CONFIG.CACHE_DURATION}, immutable`);
    res.setHeader('ETag', `"${Date.now()}"`);
  }
}

// Stream video with enhanced range support and performance optimizations
router.get('/:id', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  console.log(`🎬 [STREAM DEBUG] Starting stream for video ID: ${req.params.id}`);
  
  try {
    const { id } = req.params;
    console.log(`🎬 [STREAM DEBUG] ====== NEW VIDEO STREAM REQUEST ======`);
    console.log(`🎬 [STREAM DEBUG] Raw ID received: "${id}"`);
    console.log(`🎬 [STREAM DEBUG] ID length: ${id.length}`);
    console.log(`🎬 [STREAM DEBUG] Request headers:`, req.headers);
    
    // Try to decode the ID
    let decodedPath;
    try {
      decodedPath = Buffer.from(id, 'base64').toString('utf-8');
      console.log(`🎬 [STREAM DEBUG] Decoded path: "${decodedPath}"`);
    } catch (decodeError) {
      console.log(`🎬 [STREAM DEBUG] Failed to decode ID:`, decodeError);
    }
    
    const video = videoService.getVideoById(id);
    console.log(`🎬 [STREAM DEBUG] Video lookup result:`, video ? 'Found' : 'Not found');
    console.log(`🎬 [STREAM DEBUG] Video details:`, video);

    if (!video) {
      console.log(`🎬 [STREAM DEBUG] Video ${id} not found in service`);
      return res.status(404).json({
        error: {
          message: 'Video not found',
          status: 404
        }
      });
    }

    const videoPath = video.path;
    console.log(`🎬 [STREAM DEBUG] Video path: ${videoPath}`);
    
    // Check if file exists asynchronously
    try {
      await fs.promises.access(videoPath, fs.constants.F_OK);
      console.log(`🎬 [STREAM DEBUG] File exists: ${videoPath}`);
    } catch (error) {
      console.log(`🎬 [STREAM DEBUG] File not found: ${videoPath}`, error.message);
      return res.status(404).json({
        error: {
          message: 'Video file not found on disk',
          status: 404,
          path: videoPath
        }
      });
    }

    const stat = await fs.promises.stat(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const ifRange = req.headers['if-range'];
    const mimeType = mime.lookup(videoPath) || 'video/mp4';
    
    console.log(`🎬 [STREAM DEBUG] File stats - Size: ${fileSize} bytes, Range: ${range || 'none'}, MimeType: ${mimeType}`);

    // Check if-range header for conditional requests
    const etag = `"${stat.mtime.getTime()}-${stat.size}"`;
    if (ifRange && ifRange !== etag) {
      // If-Range doesn't match, send full file
      range = null;
    }

    // Set enhanced streaming headers
    setStreamingHeaders(res, mimeType);
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', stat.mtime.toUTCString());
    
    if (range) {
      // Parse and validate range header
      const parts = range.replace(/bytes=/, "").split("-");
      let start = parseInt(parts[0], 10) || 0;
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Ensure start and end are within bounds
      start = Math.max(0, Math.min(start, fileSize - 1));
      end = Math.max(start, Math.min(end, fileSize - 1));

      // Calculate optimal chunk size
      const chunkSize = getOptimalChunkSize(fileSize, { start, end });
      
      // Adjust end if chunk is too large
      if (end - start + 1 > STREAM_CONFIG.MAX_CHUNK_SIZE) {
        end = start + STREAM_CONFIG.MAX_CHUNK_SIZE - 1;
      }

      const contentLength = end - start + 1;

      // Validate range
      if (start >= fileSize || end >= fileSize || start > end) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).json({
          error: {
            message: 'Range not satisfiable',
            status: 416
          }
        });
      }

      // Set headers for partial content
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': contentLength
      });

      // Create optimized read stream for the requested range
      const streamOptions = {
        start,
        end,
        highWaterMark: STREAM_CONFIG.BUFFER_SIZE
      };

      const fileStream = fs.createReadStream(videoPath, streamOptions);
      
      // Enhanced error handling with recovery
      fileStream.on('error', (err) => {
        console.error(`Stream error for video ${id}:`, err);
        if (!res.headersSent) {
          res.status(500).json({
            error: {
              message: 'Error streaming video',
              status: 500,
              details: process.env.NODE_ENV === 'development' ? err.message : undefined
            }
          });
        } else {
          res.destroy();
        }
      });

      // Handle client disconnect
      req.on('close', () => {
        fileStream.destroy();
      });

      // Pipe with better error handling and detailed logging
      console.log(`🎬 [STREAM DEBUG] Streaming range ${start}-${end}/${fileSize} (${contentLength} bytes)`);
      console.log(`🎬 [STREAM DEBUG] Stream options:`, streamOptions);
      
      let bytesStreamed = 0;
      fileStream.on('data', (chunk) => {
        bytesStreamed += chunk.length;
        if (bytesStreamed % (64 * 1024) === 0) { // Log every 64KB
          console.log(`📤 [STREAM] Range: ${bytesStreamed}/${contentLength} bytes (${((bytesStreamed/contentLength)*100).toFixed(1)}%)`);
        }
      });
      
      fileStream.on('end', () => {
        const duration = Date.now() - startTime;
        console.log(`✅ [STREAM] Range completed: ${bytesStreamed} bytes in ${duration}ms`);
      });
      
      fileStream.pipe(res);

    } else {
      // No range header, send entire file with optimizations
      res.writeHead(200, {
        'Content-Length': fileSize
      });

      const streamOptions = {
        highWaterMark: getOptimalChunkSize(fileSize)
      };

      const fileStream = fs.createReadStream(videoPath, streamOptions);
      
      fileStream.on('error', (err) => {
        console.error(`Full stream error for video ${id}:`, err);
        if (!res.headersSent) {
          res.status(500).json({
            error: {
              message: 'Error streaming video',
              status: 500,
              details: process.env.NODE_ENV === 'development' ? err.message : undefined
            }
          });
        } else {
          res.destroy();
        }
      });

      // Handle client disconnect
      req.on('close', () => {
        fileStream.destroy();
      });

      console.log(`🎬 [STREAM DEBUG] Streaming full file: ${fileSize} bytes`);
      console.log(`🎬 [STREAM DEBUG] Full stream options:`, streamOptions);
      
      let bytesStreamed = 0;
      fileStream.on('data', (chunk) => {
        bytesStreamed += chunk.length;
        if (bytesStreamed % (1024 * 1024) === 0) { // Log every 1MB
          console.log(`📤 [STREAM] Full: ${(bytesStreamed/1024/1024).toFixed(1)}MB/${(fileSize/1024/1024).toFixed(1)}MB (${((bytesStreamed/fileSize)*100).toFixed(1)}%)`);
        }
      });
      
      fileStream.on('end', () => {
        const duration = Date.now() - startTime;
        console.log(`✅ [STREAM] Full completed: ${(bytesStreamed/1024/1024).toFixed(2)}MB in ${duration}ms`);
      });
      
      fileStream.pipe(res);
    }

  } catch (error) {
    console.error('🚨 [STREAM ERROR] Video streaming error:', error);
    console.log(`🎬 [STREAM DEBUG] Request took ${Date.now() - startTime}ms`);
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          status: 500,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }
});

// Get video info for streaming
router.get('/:id/info', authenticateToken, (req, res) => {
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

    // Check if file exists
    if (!fs.existsSync(video.path)) {
      return res.status(404).json({
        error: {
          message: 'Video file not found on disk',
          status: 404
        }
      });
    }

    const stat = fs.statSync(video.path);
    const mimeType = mime.lookup(video.path) || 'video/mp4';

    res.json({
      success: true,
      info: {
        id: video.id,
        title: video.title,
        duration: video.duration,
        size: stat.size,
        mimeType,
        width: video.width,
        height: video.height,
        fps: video.fps,
        bitrate: video.bitrate,
        format: video.format,
        streamUrl: `/api/stream/${video.id}`,
        supportsRangeRequests: true
      }
    });

  } catch (error) {
    console.error('Error getting video info:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get video info',
        status: 500
      }
    });
  }
});

// Download video (full file)
router.get('/:id/download', authenticateToken, (req, res) => {
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

    const videoPath = video.path;
    
    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        error: {
          message: 'Video file not found on disk',
          status: 404
        }
      });
    }

    const stat = fs.statSync(videoPath);
    const mimeType = mime.lookup(videoPath) || 'video/mp4';
    const filename = video.filename;

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Create read stream and pipe to response
    const file = fs.createReadStream(videoPath);
    file.pipe(res);

    // Handle stream errors
    file.on('error', (err) => {
      console.error('Download error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: {
            message: 'Error downloading video',
            status: 500
          }
        });
      }
    });

  } catch (error) {
    console.error('Video download error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error',
        status: 500
      }
    });
  }
});

// Handle preflight requests for CORS
router.options('/:id', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

module.exports = router;