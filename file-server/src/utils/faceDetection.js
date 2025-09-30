const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// Lazy-load face-api and canvas to avoid errors if dependencies aren't available
let faceapi = null;
let canvas = null;
let faceApiAvailable = false;

// Try to load face-api dependencies
try {
  faceapi = require('@vladmandic/face-api');
  canvas = require('canvas');
  
  // Patch environment for face-api to work with Node.js canvas
  const { Canvas, Image, ImageData } = canvas;
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
  
  faceApiAvailable = true;
  console.log('✅ Face detection libraries loaded successfully');
} catch (error) {
  console.warn('⚠️  Face detection libraries not available:', error.message);
  console.warn('💡 Thumbnail generation will use standard first-frame method');
  faceApiAvailable = false;
}

class FaceDetectionService {
  constructor() {
    this.modelsLoaded = false;
    this.modelPath = path.join(__dirname, '../../models');
  }

  /**
   * Initialize face detection models
   */
  async initialize() {
    if (this.modelsLoaded) {
      return;
    }

    if (!faceApiAvailable) {
      throw new Error('Face detection libraries not available');
    }

    try {
      console.log('🤖 Loading face detection models...');
      
      // Try to load models from node_modules first
      const nodeModelsPath = path.join(__dirname, '../../node_modules/@vladmandic/face-api/model');
      
      // Ensure models directory exists
      await fs.ensureDir(this.modelPath);
      
      // Check if models exist in node_modules
      const nodeModelsExist = await fs.pathExists(nodeModelsPath);
      const loadPath = nodeModelsExist ? nodeModelsPath : this.modelPath;
      
      console.log(`📂 Loading models from: ${loadPath}`);
      
      // Load models
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(loadPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(loadPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(loadPath);
      
      this.modelsLoaded = true;
      console.log('✅ Face detection models loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load face detection models:', error.message);
      console.log('💡 Face detection will be disabled. Thumbnails will use first frame.');
      throw error;
    }
  }

  /**
   * Extract frames from video at regular intervals
   */
  async extractFrames(videoPath, outputDir, maxFrames = 20) {
    await fs.ensureDir(outputDir);
    
    return new Promise((resolve, reject) => {
      const frames = [];
      
      // Get video duration first
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          return reject(err);
        }

        const duration = metadata.format.duration;
        const interval = Math.max(1, Math.floor(duration / maxFrames));
        
        console.log(`📹 Extracting up to ${maxFrames} frames from ${duration}s video...`);

        ffmpeg(videoPath)
          .outputOptions([
            `-vf fps=1/${interval}`,
            '-vsync 0',
            '-frame_pts 1'
          ])
          .output(path.join(outputDir, 'frame_%04d.jpg'))
          .on('end', async () => {
            const files = await fs.readdir(outputDir);
            const frameFiles = files.filter(f => f.startsWith('frame_') && f.endsWith('.jpg'));
            
            for (const file of frameFiles) {
              frames.push(path.join(outputDir, file));
            }
            
            console.log(`✅ Extracted ${frames.length} frames`);
            resolve(frames);
          })
          .on('error', reject)
          .run();
      });
    });
  }

  /**
   * Detect faces in an image and score them for quality
   */
  async detectFacesInImage(imagePath) {
    if (!faceApiAvailable) {
      return [];
    }

    try {
      const img = await canvas.loadImage(imagePath);
      
      // Detect faces with landmarks
      const detections = await faceapi
        .detectAllFaces(img)
        .withFaceLandmarks();

      if (detections.length === 0) {
        return [];
      }

      // Score each face
      const scoredFaces = detections.map(detection => {
        const score = this.scoreFaceQuality(detection, img.width, img.height);
        return {
          detection,
          score,
          box: detection.detection.box
        };
      });

      return scoredFaces.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error(`Error detecting faces in ${imagePath}:`, error);
      return [];
    }
  }

  /**
   * Score face quality based on multiple factors
   * Returns a score from 0-100
   */
  scoreFaceQuality(detection, imageWidth, imageHeight) {
    let score = 0;
    const box = detection.detection.box;
    const landmarks = detection.landmarks;

    // 1. Size score (0-30 points) - larger faces are better
    const faceArea = box.width * box.height;
    const imageArea = imageWidth * imageHeight;
    const areaRatio = faceArea / imageArea;
    const sizeScore = Math.min(30, areaRatio * 300);
    score += sizeScore;

    // 2. Position score (0-20 points) - centered faces are better
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    const imageCenterX = imageWidth / 2;
    const imageCenterY = imageHeight / 2;
    
    const centerDistanceX = Math.abs(faceCenterX - imageCenterX) / imageWidth;
    const centerDistanceY = Math.abs(faceCenterY - imageCenterY) / imageHeight;
    const centerDistance = (centerDistanceX + centerDistanceY) / 2;
    const positionScore = Math.max(0, 20 * (1 - centerDistance * 2));
    score += positionScore;

    // 3. Frontal face score (0-50 points) - face looking at camera
    const frontalScore = this.calculateFrontalScore(landmarks);
    score += frontalScore;

    return Math.min(100, Math.round(score));
  }

  /**
   * Calculate how frontal the face is based on landmarks
   * Returns score from 0-50
   */
  calculateFrontalScore(landmarks) {
    const positions = landmarks.positions;
    
    // Get key facial points
    const leftEye = this.getAveragePoint([positions[36], positions[37], positions[38], positions[39], positions[40], positions[41]]);
    const rightEye = this.getAveragePoint([positions[42], positions[43], positions[44], positions[45], positions[46], positions[47]]);
    const nose = positions[30]; // Nose tip
    const leftMouth = positions[48];
    const rightMouth = positions[54];

    // Calculate symmetry - frontal faces are more symmetrical
    const eyeDistance = Math.abs(rightEye.x - leftEye.x);
    const eyeY = Math.abs(rightEye.y - leftEye.y);
    const mouthDistance = Math.abs(rightMouth.x - leftMouth.x);
    
    // Eye level should be relatively horizontal (small Y difference)
    const eyeLevelScore = Math.max(0, 15 - (eyeY / eyeDistance) * 30);
    
    // Nose should be centered between eyes
    const noseCenterX = (leftEye.x + rightEye.x) / 2;
    const noseOffset = Math.abs(nose.x - noseCenterX) / eyeDistance;
    const noseCenterScore = Math.max(0, 15 - noseOffset * 30);
    
    // Mouth should be relatively centered
    const mouthCenterX = (leftMouth.x + rightMouth.x) / 2;
    const mouthOffset = Math.abs(mouthCenterX - noseCenterX) / eyeDistance;
    const mouthCenterScore = Math.max(0, 20 - mouthOffset * 40);

    return eyeLevelScore + noseCenterScore + mouthCenterScore;
  }

  /**
   * Get average point from array of points
   */
  getAveragePoint(points) {
    const sum = points.reduce((acc, p) => ({
      x: acc.x + p.x,
      y: acc.y + p.y
    }), { x: 0, y: 0 });
    
    return {
      x: sum.x / points.length,
      y: sum.y / points.length
    };
  }

  /**
   * Find the best frame with a frontal face from a video
   */
  async findBestFaceFrame(videoPath, workDir) {
    try {
      // Ensure models are loaded
      await this.initialize();

      const framesDir = path.join(workDir, 'frames');
      await fs.ensureDir(framesDir);

      // Extract frames
      console.log('📹 Extracting frames from video...');
      const frames = await this.extractFrames(videoPath, framesDir);

      if (frames.length === 0) {
        console.log('⚠️  No frames extracted');
        return null;
      }

      // Detect faces in each frame
      console.log('🔍 Analyzing frames for faces...');
      let bestFrame = null;
      let bestScore = 0;

      for (const framePath of frames) {
        const faces = await this.detectFacesInImage(framePath);
        
        if (faces.length > 0) {
          const topFace = faces[0]; // Already sorted by score
          console.log(`  Frame ${path.basename(framePath)}: Found ${faces.length} face(s), best score: ${topFace.score}`);
          
          if (topFace.score > bestScore) {
            bestScore = topFace.score;
            bestFrame = framePath;
          }
        }
      }

      // Cleanup frames directory
      await fs.remove(framesDir);

      if (bestFrame) {
        console.log(`✅ Best face frame found with score: ${bestScore}`);
        return bestFrame;
      } else {
        console.log('⚠️  No faces detected in any frame');
        return null;
      }
    } catch (error) {
      console.error('Error finding best face frame:', error);
      return null;
    }
  }

  /**
   * Generate thumbnail with best face detection
   */
  async generateFaceThumbnail(videoPath, outputPath, size = '320x180') {
    try {
      const workDir = path.join(path.dirname(outputPath), 'temp_' + Date.now());
      await fs.ensureDir(workDir);

      // Find best face frame
      const bestFrame = await this.findBestFaceFrame(videoPath, workDir);

      if (bestFrame) {
        // Copy and resize the best frame
        await new Promise((resolve, reject) => {
          ffmpeg(bestFrame)
            .size(size)
            .output(outputPath)
            .on('end', resolve)
            .on('error', reject)
            .run();
        });

        console.log(`✅ Face thumbnail generated: ${outputPath}`);
        await fs.remove(workDir);
        return outputPath;
      } else {
        // No face found, fall back to first frame
        console.log('⚠️  No face found, using first frame as fallback');
        await fs.remove(workDir);
        return null;
      }
    } catch (error) {
      console.error('Error generating face thumbnail:', error);
      return null;
    }
  }
}

module.exports = new FaceDetectionService();