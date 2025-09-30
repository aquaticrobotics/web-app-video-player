# Face Detection Models

This directory should contain the face detection models for thumbnail generation.

## Required Models

Download the following models from [vladmandic/face-api](https://github.com/vladmandic/face-api/tree/master/model):

### 1. SSD MobileNet V1 (Face Detection)
- `ssd_mobilenetv1_model-weights_manifest.json`
- `ssd_mobilenetv1_model-shard1`
- `ssd_mobilenetv1_model-shard2`

### 2. Face Landmark 68 Points
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`

### 3. Face Recognition Model
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`
- `face_recognition_model-shard2`

## Quick Setup

You can download all models with these commands:

```bash
cd file-server/models

# Download SSD MobileNet V1 model
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/ssd_mobilenetv1_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/ssd_mobilenetv1_model-shard1
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/ssd_mobilenetv1_model-shard2

# Download Face Landmark 68 model
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_landmark_68_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_landmark_68_model-shard1

# Download Face Recognition model
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_recognition_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_recognition_model-shard1
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_recognition_model-shard2
```

## PowerShell (Windows)

```powershell
cd file-server\models

# Download SSD MobileNet V1 model
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/vladmandic/face-api/master/model/ssd_mobilenetv1_model-weights_manifest.json" -OutFile "ssd_mobilenetv1_model-weights_manifest.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/vladmandic/face-api/master/model/ssd_mobilenetv1_model-shard1" -OutFile "ssd_mobilenetv1_model-shard1"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/vladmandic/face-api/master/model/ssd_mobilenetv1_model-shard2" -OutFile "ssd_mobilenetv1_model-shard2"

# Download Face Landmark 68 model
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_landmark_68_model-weights_manifest.json" -OutFile "face_landmark_68_model-weights_manifest.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_landmark_68_model-shard1" -OutFile "face_landmark_68_model-shard1"

# Download Face Recognition model
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_recognition_model-weights_manifest.json" -OutFile "face_recognition_model-weights_manifest.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_recognition_model-shard1" -OutFile "face_recognition_model-shard1"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_recognition_model-shard2" -OutFile "face_recognition_model-shard2"
```

## How It Works

Once these models are in place, the thumbnail service will:

1. Extract frames from the video at regular intervals
2. Analyze each frame for faces
3. Score faces based on:
   - **Size**: Larger faces score higher (0-30 points)
   - **Position**: Centered faces score higher (0-20 points)
   - **Frontal orientation**: Direct-facing faces score higher (0-50 points)
4. Select the frame with the highest-scoring face
5. Use that frame as the video thumbnail

## Fallback Behavior

If face detection fails or no faces are found, the system automatically falls back to generating a standard thumbnail from the first frame of the video.