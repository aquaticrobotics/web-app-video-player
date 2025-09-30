import React, { useState } from 'react';
import { FaPlay, FaClock, FaDesktop, FaHeart, FaRegHeart } from 'react-icons/fa';
import { apiService } from '../../services/api';
import { useFavorites } from '../../context/FavoritesContext';
import './VideoCard.css';

const VideoCard = ({ video, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  if (!video) return null;

  const isVideoFavorite = isFavorite(video.id);

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

  const handleFavoriteClick = (e) => {
    e.stopPropagation(); // Prevent video from playing when clicking heart
    toggleFavorite(video.id);
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

        {/* Favorites Heart Button */}
        <button
          className={`favorite-button ${isVideoFavorite ? 'favorited' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isVideoFavorite ? 'Remove from favorites' : 'Add to favorites'}
          title={isVideoFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isVideoFavorite ? <FaHeart /> : <FaRegHeart />}
        </button>
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