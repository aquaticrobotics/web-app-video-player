import React from 'react';
import VideoCard from './VideoCard';
import LoadingSpinner from '../Common/LoadingSpinner';
import { FaFilm, FaSearch } from 'react-icons/fa';
import './VideoGrid.css';

const VideoGrid = ({ 
  videos = [], 
  loading = false, 
  error = null, 
  onVideoClick,
  title = null,
  emptyTitle = "No Videos Found",
  emptyMessage = "No videos are available at the moment.",
  gridSize = 'auto',
  showCount = true
}) => {
  if (loading) {
    return (
      <div className="video-grid-container">
        {title && (
          <div className="video-grid-header">
            <h2 className="video-grid-title">{title}</h2>
          </div>
        )}
        <div className="video-grid-loading">
          <LoadingSpinner 
            size="large" 
            text="Loading videos..." 
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-grid-container">
        {title && (
          <div className="video-grid-header">
            <h2 className="video-grid-title">{title}</h2>
          </div>
        )}
        <div className="video-grid-error">
          <FaFilm className="error-icon" />
          <h3>Something went wrong</h3>
          <p>{error.message || 'Unable to load videos. Please try again later.'}</p>
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="video-grid-container">
        {title && (
          <div className="video-grid-header">
            <h2 className="video-grid-title">{title}</h2>
          </div>
        )}
        <div className="video-grid-empty">
          <FaSearch className="empty-icon" />
          <h3>{emptyTitle}</h3>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const getGridClass = () => {
    switch (gridSize) {
      case 'small':
        return 'video-grid-small';
      case 'medium':
        return 'video-grid-medium';
      case 'large':
        return 'video-grid-large';
      default:
        return 'video-grid-auto';
    }
  };

  return (
    <div className="video-grid-container">
      {title && (
        <div className="video-grid-header">
          <h2 className="video-grid-title">{title}</h2>
          {showCount && (
            <span className="video-count">
              {videos.length} {videos.length === 1 ? 'video' : 'videos'}
            </span>
          )}
        </div>
      )}
      
      <div className={`video-grid ${getGridClass()}`}>
        {videos.map((video) => (
          <VideoCard 
            key={video.id} 
            video={video} 
            onClick={onVideoClick}
          />
        ))}
      </div>
    </div>
  );
};

// Grid section component for categorized content
export const VideoGridSection = ({ 
  title, 
  videos, 
  loading, 
  error, 
  onVideoClick,
  showAll = false,
  maxItems = 10
}) => {
  const displayVideos = showAll ? videos : videos?.slice(0, maxItems);
  
  return (
    <section className="video-grid-section">
      <VideoGrid
        title={title}
        videos={displayVideos}
        loading={loading}
        error={error}
        onVideoClick={onVideoClick}
        showCount={false}
      />
      
      {!showAll && videos && videos.length > maxItems && (
        <div className="video-grid-show-more">
          <button className="btn btn-ghost">
            View All {videos.length} Videos
          </button>
        </div>
      )}
    </section>
  );
};

export default VideoGrid;