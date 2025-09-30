#!/usr/bin/env python3
"""
Face detection thumbnail generator using OpenCV
GPU-accelerated with CUDA support when available
"""

import cv2
import sys
import os
import numpy as np

def detect_best_face_frame(video_path, output_path, start_time=10, interval=2):
    """
    Find the first clear frontal face in the video
    Starts at start_time seconds and checks every interval seconds
    Stops as soon as a frontal face with both eyes is detected
    Uses GPU acceleration if available
    """
    print(f"[FACE] Analyzing video: {video_path}")
    
    # Try to enable GPU acceleration
    try:
        if cv2.cuda.getCudaEnabledDeviceCount() > 0:
            print(f"[INFO] GPU acceleration available: {cv2.cuda.getCudaEnabledDeviceCount()} CUDA device(s)")
            use_gpu = True
        else:
            print(f"[INFO] No CUDA devices found, using CPU")
            use_gpu = False
    except:
        print(f"[INFO] CUDA not available, using CPU")
        use_gpu = False
    
    # Load face detection cascade
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    
    # Open video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[ERROR] Could not open video: {video_path}")
        return False
    
    # Get video properties
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = total_frames / fps if fps > 0 else 0
    
    print(f"[INFO] Video: {total_frames} frames, {duration:.1f}s, FPS: {fps:.2f}")
    print(f"[INFO] Searching for frontal face starting at {start_time}s, checking every {interval}s")
    
    current_time = start_time
    frames_checked = 0
    
    # Keep checking until we find a good face or reach end of video
    while current_time < duration:
        frame_idx = int(current_time * fps)
        
        if frame_idx >= total_frames:
            break
            
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        
        if not ret:
            current_time += interval
            continue
        
        frames_checked += 1
        
        # Convert to grayscale for detection
        if use_gpu:
            try:
                # Upload to GPU
                gpu_frame = cv2.cuda_GpuMat()
                gpu_frame.upload(frame)
                gpu_gray = cv2.cuda.cvtColor(gpu_frame, cv2.COLOR_BGR2GRAY)
                gray = gpu_gray.download()
            except:
                # Fallback to CPU if GPU fails
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        else:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        if len(faces) == 0:
            print(f"  Frame {frame_idx} ({current_time:.1f}s): No faces detected")
            current_time += interval
            continue
        
        # Check each face for frontal orientation
        for (x, y, w, h) in faces:
            # Check for eyes to confirm frontal face
            roi_gray = gray[y:y+h, x:x+w]
            eyes = eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=3)
            
            # Calculate quality scores
            frame_area = frame.shape[0] * frame.shape[1]
            face_area = w * h
            area_ratio = face_area / frame_area
            size_score = min(30, area_ratio * 300)
            
            # Minimum face size requirement: 9% of frame
            MIN_FACE_SIZE = 0.09  # Face must be at least 9% of frame
            
            if area_ratio < MIN_FACE_SIZE:
                print(f"  Frame {frame_idx} ({current_time:.1f}s): Face too small ({area_ratio*100:.1f}% < {MIN_FACE_SIZE*100:.0f}%), continuing search...")
                continue
            
            face_center_x = x + w / 2
            face_center_y = y + h / 2
            frame_center_x = frame.shape[1] / 2
            frame_center_y = frame.shape[0] / 2
            
            center_dist_x = abs(face_center_x - frame_center_x) / frame.shape[1]
            center_dist_y = abs(face_center_y - frame_center_y) / frame.shape[0]
            center_dist = (center_dist_x + center_dist_y) / 2
            position_score = max(0, 20 * (1 - center_dist * 2))
            
            # REQUIRE both eyes detected - only accept frontal faces
            if len(eyes) >= 2:
                # Found both eyes - this is a clear frontal face!
                frontal_score = 50
                total_score = size_score + position_score + frontal_score
                
                # Higher quality threshold
                MIN_SCORE = 75  # Minimum total score required for high quality
                
                if total_score >= MIN_SCORE:
                    print(f"  Frame {frame_idx} ({current_time:.1f}s): [FOUND] clear frontal face! Score={total_score:.1f} (size={size_score:.1f}, pos={position_score:.1f}, frontal={frontal_score})")
                    
                    # Resize to thumbnail size
                    height, width = frame.shape[:2]
                    target_width = 320
                    target_height = int(height * (target_width / width))
                    thumbnail = cv2.resize(frame, (target_width, target_height))
                    
                    # Save thumbnail
                    cv2.imwrite(output_path, thumbnail, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    cap.release()
                    print(f"[SUCCESS] Frontal face thumbnail saved: {output_path}")
                    return True
                else:
                    print(f"  Frame {frame_idx} ({current_time:.1f}s): Face with both eyes but score too low ({total_score:.1f} < {MIN_SCORE}), continuing search...")
            else:
                # Skip faces without both eyes - we only want clear frontal faces
                eye_count = len(eyes)
                print(f"  Frame {frame_idx} ({current_time:.1f}s): Face rejected ({eye_count} eye(s) detected, need 2), continuing search...")
        
        current_time += interval
    
    cap.release()
    print(f"[WARN] No clear frontal face found in {frames_checked} frames checked")
    return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python face_detect_thumbnail.py <video_path> <output_path>")
        sys.exit(1)
    
    video_path = sys.argv[1]
    output_path = sys.argv[2]
    
    if not os.path.exists(video_path):
        print(f"[ERROR] Video file not found: {video_path}")
        sys.exit(1)
    
    success = detect_best_face_frame(video_path, output_path)
    sys.exit(0 if success else 1)