import React, { useState, useRef, useCallback } from 'react';
import { 
  FaPlay, 
  FaPause, 
  FaVolumeUp, 
  FaVolumeMute, 
  FaVolumeDown,
  FaExpand, 
  FaCompress,
  FaCog,
  FaExternalLinkAlt,
  FaDesktop,
  FaTachometerAlt,
  FaClock
} from 'react-icons/fa';

const PlayerControls = ({
  isVisible,
  isPlaying,
  currentTime,
  duration,
  buffered,
  volume,
  isMuted,
  playbackRate,
  quality,
  availableQualities,
  isFullscreen,
  isPictureInPicture,
  showSettings,
  videoInfo,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMute,
  onPlaybackRateChange,
  onQualityChange,
  onFullscreen,
  onPictureInPicture,
  onSettingsToggle
}) => {
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Format time display
  const formatTime = useCallback((timeInSeconds) => {
    if (!timeInSeconds || timeInSeconds === 0) return '0:00';
    
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Progress bar handlers
  const handleProgressClick = useCallback((e) => {
    if (!progressRef.current || !duration) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    onSeek(newTime);
  }, [duration, onSeek]);

  const handleProgressMouseMove = useCallback((e) => {
    if (!progressRef.current || !duration) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, hoverX / rect.width));
    const time = percentage * duration;
    
    setHoverTime(time);
  }, [duration]);

  const handleProgressMouseLeave = useCallback(() => {
    setHoverTime(null);
  }, []);

  // Volume control handlers
  const handleVolumeClick = useCallback((e) => {
    if (!volumeRef.current) return;
    
    const rect = volumeRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newVolume = Math.max(0, Math.min(1, percentage));
    
    onVolumeChange(newVolume);
  }, [onVolumeChange]);

  // Settings menu options
  const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return FaVolumeMute;
    if (volume < 0.5) return FaVolumeDown;
    return FaVolumeUp;
  };

  const VolumeIcon = getVolumeIcon();

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPercentage = Math.min(buffered, 100);

  return (
    <div className={`player-controls ${isVisible ? 'visible' : 'hidden'}`}>
      {/* Progress bar */}
      <div className="progress-container">
        <div 
          ref={progressRef}
          className="progress-bar"
          onClick={handleProgressClick}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={handleProgressMouseLeave}
        >
          {/* Buffered progress */}
          <div 
            className="progress-buffered"
            style={{ width: `${bufferedPercentage}%` }}
          />
          
          {/* Current progress */}
          <div 
            className="progress-current"
            style={{ width: `${progressPercentage}%` }}
          />
          
          {/* Progress handle */}
          <div 
            className="progress-handle"
            style={{ left: `${progressPercentage}%` }}
          />
          
          {/* Hover preview */}
          {hoverTime !== null && (
            <div 
              className="progress-preview"
              style={{ 
                left: `${(hoverTime / duration) * 100}%`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="preview-time">
                {formatTime(hoverTime)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main controls */}
      <div className="controls-main">
        <div className="controls-left">
          {/* Play/Pause button */}
          <button 
            className="control-btn play-pause"
            onClick={onPlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>

          {/* Volume controls */}
          <div 
            className="volume-container"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button 
              className="control-btn volume-btn"
              onClick={onMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              <VolumeIcon />
            </button>
            
            <div className={`volume-slider ${showVolumeSlider ? 'visible' : ''}`}>
              <div 
                ref={volumeRef}
                className="volume-bar"
                onClick={handleVolumeClick}
              >
                <div 
                  className="volume-current"
                  style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                />
                <div 
                  className="volume-handle"
                  style={{ left: `${isMuted ? 0 : volume * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Time display */}
          <div className="time-display">
            <span className="time-current">{formatTime(currentTime)}</span>
            <span className="time-separator">/</span>
            <span className="time-duration">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="controls-center">
          {/* Video title and quality info */}
          {videoInfo && (
            <div className="video-info-display">
              <span className="video-title">{videoInfo.title}</span>
              {videoInfo.width && videoInfo.height && (
                <span className="video-resolution">
                  {videoInfo.width}×{videoInfo.height}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="controls-right">
          {/* Quality indicator */}
          {quality !== 'auto' && (
            <div className="quality-indicator">
              <FaDesktop />
              <span>{quality}</span>
            </div>
          )}

          {/* Playback speed indicator */}
          {playbackRate !== 1 && (
            <div className="speed-indicator">
              <FaTachometerAlt />
              <span>{playbackRate}×</span>
            </div>
          )}

          {/* Picture-in-Picture button */}
          {document.pictureInPictureEnabled && (
            <button 
              className={`control-btn pip-btn ${isPictureInPicture ? 'active' : ''}`}
              onClick={onPictureInPicture}
              aria-label="Picture in Picture"
            >
              <FaExternalLinkAlt />
            </button>
          )}

          {/* Settings button */}
          <button 
            className={`control-btn settings-btn ${showSettings ? 'active' : ''}`}
            onClick={onSettingsToggle}
            aria-label="Settings"
          >
            <FaCog />
          </button>

          {/* Fullscreen button */}
          <button 
            className="control-btn fullscreen-btn"
            onClick={onFullscreen}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-content">
            {/* Playback Speed */}
            <div className="settings-section">
              <h4>
                <FaTachometerAlt />
                Playback Speed
              </h4>
              <div className="settings-options">
                {playbackSpeeds.map(speed => (
                  <button
                    key={speed}
                    className={`settings-option ${playbackRate === speed ? 'active' : ''}`}
                    onClick={() => onPlaybackRateChange(speed)}
                  >
                    {speed === 1 ? 'Normal' : `${speed}×`}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div className="settings-section">
              <h4>
                <FaDesktop />
                Quality
              </h4>
              <div className="settings-options">
                {availableQualities.map(q => (
                  <button
                    key={q}
                    className={`settings-option ${quality === q ? 'active' : ''}`}
                    onClick={() => onQualityChange(q)}
                  >
                    {q === 'auto' ? 'Auto' : q}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Info */}
            {videoInfo && (
              <div className="settings-section">
                <h4>
                  <FaClock />
                  Video Information
                </h4>
                <div className="video-stats">
                  {videoInfo.duration && (
                    <div className="stat-item">
                      <span className="stat-label">Duration:</span>
                      <span className="stat-value">{formatTime(videoInfo.duration)}</span>
                    </div>
                  )}
                  {videoInfo.width && videoInfo.height && (
                    <div className="stat-item">
                      <span className="stat-label">Resolution:</span>
                      <span className="stat-value">{videoInfo.width}×{videoInfo.height}</span>
                    </div>
                  )}
                  {videoInfo.fps && (
                    <div className="stat-item">
                      <span className="stat-label">Frame Rate:</span>
                      <span className="stat-value">{videoInfo.fps} fps</span>
                    </div>
                  )}
                  {videoInfo.bitrate && (
                    <div className="stat-item">
                      <span className="stat-label">Bitrate:</span>
                      <span className="stat-value">{Math.round(videoInfo.bitrate / 1000)} kbps</span>
                    </div>
                  )}
                  {videoInfo.size && (
                    <div className="stat-item">
                      <span className="stat-label">File Size:</span>
                      <span className="stat-value">
                        {(videoInfo.size / (1024 * 1024 * 1024)).toFixed(2)} GB
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerControls;