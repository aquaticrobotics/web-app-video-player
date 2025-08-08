import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import { FaArrowLeft, FaPlay, FaDownload, FaClock, FaDesktop, FaFolder, FaTimes } from 'react-icons/fa';
import './VideoDetail.css';

const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        setError(null);
        const videoData = await apiService.getVideoById(id);
        setVideo(videoData);
      } catch (err) {
        console.error('Error fetching video:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVideo();
    }
  }, [id]);

  const handleBack = () => {
    navigate('/');
  };

  const handlePlay = () => {
    setShowPlayer(true);
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
  };

  const handleVideoError = (error) => {
    console.error('Video player error:', error);
    setError(error);
  };

  const handleVideoEnd = () => {
    // Could implement auto-play next video here
    console.log('Video ended');
  };

  const handleDownload = () => {
    const downloadUrl = apiService.getVideoDownloadUrl(video.id);
    window.open(downloadUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="video-detail-page">
        <div className="video-detail-loading">
          <LoadingSpinner size="large" text="Loading video details..." />
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="video-detail-page">
        <div className="video-detail-header">
          <button className="btn btn-ghost" onClick={handleBack}>
            <FaArrowLeft />
            Back to Library
          </button>
        </div>
        <div className="video-detail-error">
          <h2>Video Not Found</h2>
          <p>{error?.message || 'The requested video could not be found.'}</p>
          <button className="btn btn-primary" onClick={handleBack}>
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  const thumbnailUrl = apiService.getThumbnailUrl(video.id);
  const duration = apiService.formatDuration(video.duration);
  const quality = apiService.getVideoQuality(video.width || 0, video.height || 0);
  const fileSize = apiService.formatFileSize(video.size);

  if (showPlayer) {
    return (
      <div className="video-detail-page video-player-mode">
        <div className="video-player-header">
          <button className="btn btn-ghost close-player" onClick={handleClosePlayer}>
            <FaTimes />
            Close Player
          </button>
          <div className="video-player-title">
            <h2>{video.title}</h2>
          </div>
        </div>
        
        <div className="video-player-container">
          <VideoPlayer
            videoId={video.id}
            autoPlay={true}
            poster={thumbnailUrl}
            onVideoEnd={handleVideoEnd}
            onError={handleVideoError}
            className="main-video-player"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="video-detail-page">
      <div className="video-detail-header">
        <button className="btn btn-ghost" onClick={handleBack}>
          <FaArrowLeft />
          Back to Library
        </button>
      </div>

      <div className="video-detail-content">
        <div className="video-detail-hero">
          <div className="video-thumbnail-container">
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="video-thumbnail"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="thumbnail-fallback" style={{ display: 'none' }}>
              <FaPlay />
              <span>No Thumbnail</span>
            </div>
            <div className="video-overlay">
              <button className="play-button-large" onClick={handlePlay}>
                <FaPlay />
                <span>Play Video</span>
              </button>
            </div>
          </div>

          <div className="video-info">
            <h1 className="video-title">{video.title}</h1>
            
            <div className="video-meta">
              <div className="meta-row">
                {duration && (
                  <span className="meta-item">
                    <FaClock />
                    {duration}
                  </span>
                )}
                {quality && (
                  <span className="meta-item quality">
                    <FaDesktop />
                    {quality}
                  </span>
                )}
                {video.category && (
                  <span className="meta-item">
                    <FaFolder />
                    {video.category}
                  </span>
                )}
              </div>
              
              {fileSize && (
                <div className="meta-row">
                  <span className="meta-item">
                    Size: {fileSize}
                  </span>
                </div>
              )}

              {(video.width && video.height) && (
                <div className="meta-row">
                  <span className="meta-item">
                    Resolution: {video.width} × {video.height}
                  </span>
                </div>
              )}
            </div>

            <div className="video-actions">
              <button className="btn btn-primary btn-lg" onClick={handlePlay}>
                <FaPlay />
                Play Video
              </button>
              <button className="btn btn-secondary" onClick={handleDownload}>
                <FaDownload />
                Download
              </button>
            </div>
          </div>
        </div>

        {video.description && (
          <div className="video-description">
            <h3>Description</h3>
            <p>{video.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoDetail;