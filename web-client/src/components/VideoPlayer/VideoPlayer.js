import React from 'react';
import './VideoPlayer.css';

const VideoPlayer = ({ videoId, title, onClose }) => {
  // Comprehensive debugging
  console.log('🎬 [VIDEO PLAYER DEBUG] ==========================================');
  console.log('🎬 [VIDEO PLAYER DEBUG] VideoPlayer component loaded');
  console.log('🎬 [VIDEO PLAYER DEBUG] Props received:', { videoId, title, onClose: !!onClose });
  console.log('🎬 [VIDEO PLAYER DEBUG] videoId type:', typeof videoId);
  console.log('🎬 [VIDEO PLAYER DEBUG] videoId length:', videoId?.length);

  if (!videoId) {
    console.log('🎬 [VIDEO PLAYER DEBUG] No videoId provided - showing error');
    return (
      <div className="video-player-overlay">
        <div className="video-player-container error">
          <div className="video-player-header">
            <h2>{title || 'Error'}</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="error-message">
            <p>No video selected</p>
          </div>
        </div>
      </div>
    );
  }

  // Dynamic streaming URL based on current hostname
  const streamUrl = `http://${window.location.hostname}:3001/api/stream/${videoId}`;
  console.log('🎬 [VIDEO PLAYER DEBUG] Generated stream URL:', streamUrl);
  console.log('🎬 [VIDEO PLAYER DEBUG] Current hostname:', window.location.hostname);

  return (
    <div className="video-player-overlay">
      <div className="video-player-container">
        <div className="video-player-header">
          <h2>{title}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="video-wrapper">
          <video
            controls
            autoPlay
            playsInline
            preload="metadata"
            src={streamUrl}
            style={{ 
              width: '100%', 
              height: '100%'
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;