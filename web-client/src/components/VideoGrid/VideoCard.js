import React, { useState } from 'react';
import { FaPlay, FaClock, FaDesktop } from 'react-icons/fa';
import { apiService } from '../../services/api';
import './VideoCard.css';

const VideoCard = ({ video, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!video) return null;

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(video);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  const thumbnailUrl = apiService.getThumbnailUrl(video.id);
  const duration = apiService.formatDuration(video.duration);
  const quality = apiService.getVideoQuality(video.width || 0, video.height || 0);
  const fileSize = apiService.formatFileSize(video.size);

  return (
    <div 
      className="video-card"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Play ${video.title}`}
    >
      <div className="video-card-thumbnail">
        {!imageLoaded && (
          <div className="video-card-skeleton">
            <div className="skeleton-shimmer"></div>
          </div>
        )}
        
        {!imageError ? (
          <img 
            src={thumbnailUrl}
            alt={video.title}
            className={`video-thumbnail ${imageLoaded ? 'loaded' : ''}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="video-thumbnail-error">
            <FaPlay className="error-icon" />
            <span>No Thumbnail</span>
          </div>
        )}

        <div className="video-card-overlay">
          <div className="play-button">
            <FaPlay />
          </div>
        </div>

        <div className="video-card-info">
          {duration && (
            <span className="video-duration">
              <FaClock />
              {duration}
            </span>
          )}
          {quality && (
            <span className="video-quality">
              <FaDesktop />
              {quality}
            </span>
          )}
        </div>
      </div>

      <div className="video-card-details">
        <h3 className="video-title" title={video.title}>
          {video.title}
        </h3>
        
        <div className="video-metadata">
          {fileSize && (
            <span className="video-size">{fileSize}</span>
          )}
          {video.category && (
            <span className="video-category">{video.category}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCard;