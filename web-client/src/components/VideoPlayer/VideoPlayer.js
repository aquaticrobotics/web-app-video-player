import React, { useState, useRef, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import PlayerControls from './PlayerControls';
import LoadingSpinner from '../Common/LoadingSpinner';
import { 
  FaPlay, 
  FaPause, 
  FaExpand, 
  FaCompress, 
  FaVolumeUp, 
  FaVolumeMute,
  FaCog,
  FaExclamationTriangle 
} from 'react-icons/fa';
import './VideoPlayer.css';

const VideoPlayer = ({ 
  videoId, 
  autoPlay = false, 
  onVideoEnd,
  onError,
  className = '',
  poster
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  // const progressHoverRef = useRef(null); // Unused for now

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState('auto');
  
  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  
  // Video metadata
  const [videoInfo, setVideoInfo] = useState(null);
  const [availableQualities, setAvailableQualities] = useState(['auto']);

  // Initialize video
  useEffect(() => {
    if (!videoId) return;

    const loadVideoInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const info = await apiService.getVideoStreamInfo(videoId);
        setVideoInfo(info.info);
        
        // Determine available qualities based on resolution
        const qualities = ['auto'];
        if (info.info.height >= 1080) qualities.push('1080p');
        if (info.info.height >= 720) qualities.push('720p');
        if (info.info.height >= 480) qualities.push('480p');
        
        setAvailableQualities(qualities);
        setDuration(info.info.duration || 0);
        
      } catch (err) {
        console.error('Error loading video info:', err);
        setError('Failed to load video information');
        onError?.(err);
      } finally {
        setLoading(false);
      }
    };

    loadVideoInfo();
  }, [videoId, onError]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls && isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!videoRef.current) return;

      // Prevent default behavior if focused on video container
      if (containerRef.current?.contains(document.activeElement)) {
        switch (e.code) {
          case 'Space':
            e.preventDefault();
            togglePlayPause();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            seek(currentTime - 10);
            break;
          case 'ArrowRight':
            e.preventDefault();
            seek(currentTime + 10);
            break;
          case 'ArrowUp':
            e.preventDefault();
            setVolume(Math.min(1, volume + 0.1));
            break;
          case 'ArrowDown':
            e.preventDefault();
            setVolume(Math.max(0, volume - 0.1));
            break;
          case 'KeyF':
            e.preventDefault();
            toggleFullscreen();
            break;
          case 'KeyM':
            e.preventDefault();
            toggleMute();
            break;
          case 'Escape':
            if (isFullscreen) {
              exitFullscreen();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentTime, volume, isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Video event handlers
  const handleVideoLoad = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration);
    setLoading(false);
    
    if (autoPlay) {
      video.play().catch(err => {
        console.error('Autoplay failed:', err);
      });
    }
  }, [autoPlay]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    
    // Update buffered
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      setBuffered((bufferedEnd / video.duration) * 100);
    }
  }, []);

  const handleVideoEnd = useCallback(() => {
    setIsPlaying(false);
    onVideoEnd?.();
  }, [onVideoEnd]);

  const handleError = useCallback((e) => {
    const errorMessage = 'Error loading video. Please try again.';
    setError(errorMessage);
    setLoading(false);
    onError?.(new Error(errorMessage));
  }, [onError]);

  // Control functions
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    
    setShowControls(true);
  }, []);

  const seek = useCallback((time) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(time, duration));
    setShowControls(true);
  }, [duration]);

  const handleVolumeChange = useCallback((newVolume) => {
    const video = videoRef.current;
    if (!video) return;

    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    video.volume = clampedVolume;
    
    if (clampedVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      video.muted = false;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
    
    setShowControls(true);
  }, [isMuted, volume]);

  const handlePlaybackRateChange = useCallback((rate) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowControls(true);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Exit fullscreen error:', err);
    }
  }, []);

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPictureInPicture(false);
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        setIsPictureInPicture(true);
      }
    } catch (err) {
      console.error('Picture-in-picture error:', err);
    }
  }, []);

  // Mouse/touch handlers
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
  }, []);

  const handleVideoClick = useCallback(() => {
    togglePlayPause();
  }, [togglePlayPause]);

  if (error) {
    return (
      <div className={`video-player error ${className}`}>
        <div className="video-error">
          <FaExclamationTriangle />
          <h3>Video Error</h3>
          <p>{error}</p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  const streamUrl = videoId ? apiService.getVideoStreamUrl(videoId) : null;

  return (
    <div 
      ref={containerRef}
      className={`video-player ${isFullscreen ? 'fullscreen' : ''} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
      tabIndex={0}
    >
      {loading && (
        <div className="video-loading">
          <LoadingSpinner size="large" text="Loading video..." />
        </div>
      )}

      <video
        ref={videoRef}
        src={streamUrl}
        poster={poster}
        preload="metadata"
        playsInline
        onLoadedData={handleVideoLoad}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnd}
        onError={handleError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={handleVideoClick}
        className="video-element"
      />

      {/* Click overlay for play/pause */}
      <div className="video-overlay" onClick={handleVideoClick}>
        {!isPlaying && !loading && (
          <button className="play-button-center">
            <FaPlay />
          </button>
        )}
      </div>

      {/* Controls */}
      <PlayerControls
        isVisible={showControls || !isPlaying}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        buffered={buffered}
        volume={volume}
        isMuted={isMuted}
        playbackRate={playbackRate}
        quality={quality}
        availableQualities={availableQualities}
        isFullscreen={isFullscreen}
        isPictureInPicture={isPictureInPicture}
        showSettings={showSettings}
        videoInfo={videoInfo}
        onPlayPause={togglePlayPause}
        onSeek={seek}
        onVolumeChange={handleVolumeChange}
        onMute={toggleMute}
        onPlaybackRateChange={handlePlaybackRateChange}
        onQualityChange={setQuality}
        onFullscreen={toggleFullscreen}
        onPictureInPicture={togglePictureInPicture}
        onSettingsToggle={() => setShowSettings(!showSettings)}
      />
    </div>
  );
};

export default VideoPlayer;