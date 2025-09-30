# Face Detection for Video Thumbnails

This document explains the face detection system implemented for automatic thumbnail generation.

## Overview

The thumbnail service now uses advanced face detection to automatically find the best frame in a video that contains a clear, frontal-facing face. This dramatically improves thumbnail quality compared to using the first frame.

## How It Works

### 1. Frame Extraction
- The system extracts up to 20 frames from the video at regular intervals
- Frames are sampled evenly throughout the video duration

### 2. Face Detection
For each frame, the system:
- Detects all faces using SSD MobileNet V1
- Analyzes facial landmarks (68 key points on each face)
- Scores each face based on three criteria:

#### Scoring System (0-100 points)

**Size Score (0-30 points)**
- Larger faces receive higher scores
- Based on face area as percentage of total image

**Position Score (0-20 points)**
- Centered faces score higher
- Measures distance from image center

**Frontal Face Score (0-50 points)**
- Most important factor
- Analyzes facial symmetry using landmarks:
  - Eye level horizontality (0-15 pts)
  - Nose centrality (0-15 pts)
  - Mouth alignment (0-20 pts)

### 3. Best Frame Selection
- The frame with the highest-scoring face becomes the thumbnail
- If no faces are detected, falls back to standard first-frame thumbnail

## Installation

### Dependencies
The face detection system requires:
```bash
npm install @vladmandic/face-api canvas
```

These are already installed in your project.

### Face Detection Models

The system attempts to load models from the `@vladmandic/face-api` package in `node_modules`. If models aren't available there, place them in `file-server/models/`.

**Required model files:**
- `ssd_mobilenetv1_model-*` (face detection)
- `face_landmark_68_model-*` (landmark detection)  
- `face_recognition_model-*` (face analysis)

See `file-server/models/README.md` for download instructions.

## Configuration

### Enable/Disable Face Detection

In [`file-server/src/services/thumbnailService.js`](file-server/src/services/thumbnailService.js:1):

```javascript
class ThumbnailService {
  constructor() {
    this.useFaceDetection = true; // Set to false to disable
  }
}
```

### Adjust Frame Extraction

In [`file-server/src/utils/faceDetection.js`](file-server/src/utils/faceDetection.js:1):

```javascript
async extractFrames(videoPath, outputDir, maxFrames = 20) {
  // Change maxFrames (default: 20)
  // More frames = better accuracy but slower processing
}
```

### Thumbnail Size

In [`file-server/config/config.json`](file-server/config/config.json:1):

```json
{
  "thumbnailSize": "320x180"
}
```

## Usage

The face detection happens automatically when generating thumbnails:

```javascript
const thumbnailService = require('./services/thumbnailService');

// Automatically uses face detection if enabled
const thumbPath = await thumbnailService.generateThumbnail(videoPath, videoId);
```

## Performance

### Processing Time
- **Without face detection:** ~1-2 seconds per video
- **With face detection:** ~5-15 seconds per video
  - Depends on video length and number of frames analyzed
  - First-time initialization adds ~2-3 seconds

### Optimization Tips
1. **Reduce maxFrames**: Fewer frames = faster but less accurate
2. **Cache thumbnails**: Thumbnails are cached automatically
3. **Async processing**: Thumbnail generation doesn't block requests

## Fallback Behavior

The system gracefully falls back in several scenarios:

1. **Models not found**: Uses standard first-frame thumbnails
2. **No faces detected**: Uses first frame of video
3. **Face detection fails**: Uses standard thumbnail generation
4. **Model initialization error**: Disables face detection, uses first frame

All fallback scenarios log warnings but don't fail the thumbnail generation process.

## Troubleshooting

### Face detection not working

**Check models are loaded:**
```bash
# Look for this log message on server startup:
✅ Face detection models loaded successfully
```

**If you see error messages:**
```bash
❌ Failed to load face detection models
💡 Face detection will be disabled. Thumbnails will use first frame.
```

This means models couldn't be loaded. Check:
1. Models exist in `node_modules/@vladmandic/face-api/model/` or `file-server/models/`
2. File permissions allow reading model files
3. Sufficient memory available (models use ~50MB RAM)

### Poor face detection results

If faces aren't being detected or wrong frames are chosen:

1. **Increase frame sampling**: Change `maxFrames` to 30-40
2. **Check video quality**: Low-resolution videos may not detect faces well
3. **Lighting conditions**: Very dark or backlit scenes score lower
4. **Face angles**: Profile views score lower than frontal faces

### Performance issues

If thumbnail generation is too slow:

1. **Reduce maxFrames** to 10-15
2. **Disable face detection** for batch operations
3. **Pre-generate thumbnails** offline using a script

## Architecture

```
thumbnailService.js
  ├─ Manages thumbnail generation
  ├─ Lazy-loads face detection
  └─ Falls back to standard method
      
faceDetection.js
  ├─ Initializes face-api models
  ├─ Extracts video frames (ffmpeg)
  ├─ Detects faces in each frame
  ├─ Scores faces for quality
  └─ Returns best frame
```

## Future Enhancements

Potential improvements:
- **Multi-face priority**: Prefer frames with multiple clear faces
- **Expression analysis**: Prefer smiling faces
- **Age/gender filtering**: Target specific demographics
- **Scene detection**: Avoid transition frames
- **GPU acceleration**: Faster processing with CUDA
- **Caching face data**: Store face positions for video chapters

## API

### Core Methods

**`thumbnailService.generateThumbnail(videoPath, videoId)`**
- Main entry point for thumbnail generation
- Automatically uses face detection if enabled
- Falls back to standard method if face detection fails

**`faceDetection.generateFaceThumbnail(videoPath, outputPath, size)`**
- Generate thumbnail with face detection
- Returns path to thumbnail or null if no face found

**`faceDetection.findBestFaceFrame(videoPath, workDir)`**
- Find the best frame containing a frontal face
- Returns path to best frame or null

**`faceDetection.detectFacesInImage(imagePath)`**
- Detect and score all faces in an image
- Returns array of faces sorted by score

## License

Uses [@vladmandic/face-api](https://github.com/vladmandic/face-api) which is MIT licensed.