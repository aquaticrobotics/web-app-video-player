import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoGrid, { VideoGridSection } from '../components/VideoGrid/VideoGrid';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { apiService } from '../services/api';
import { FaSync, FaFilm, FaChartBar } from 'react-icons/fa';
import './Home.css';

const Home = () => {
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  // Fetch all data on component mount
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch videos, categories, and stats in parallel
      const [videosResponse, categoriesResponse, statsResponse] = await Promise.allSettled([
        apiService.getVideos(),
        apiService.getVideoCategories(),
        apiService.getLibraryStats()
      ]);

      // Handle videos response
      if (videosResponse.status === 'fulfilled') {
        setVideos(videosResponse.value || []);
      } else {
        console.error('Failed to fetch videos:', videosResponse.reason);
      }

      // Handle categories response
      if (categoriesResponse.status === 'fulfilled') {
        setCategories(categoriesResponse.value || []);
      } else {
        console.error('Failed to fetch categories:', categoriesResponse.reason);
      }

      // Handle stats response
      if (statsResponse.status === 'fulfilled') {
        setStats(statsResponse.value);
      } else {
        console.error('Failed to fetch stats:', statsResponse.reason);
      }

      // Set error only if all requests failed
      if (videosResponse.status === 'rejected' && 
          categoriesResponse.status === 'rejected' && 
          statsResponse.status === 'rejected') {
        setError(new Error('Failed to load data. Please try again.'));
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh library
  const handleRefreshLibrary = async () => {
    try {
      setRefreshing(true);
      await apiService.refreshVideoLibrary();
      // Refetch data after refresh
      await fetchData();
    } catch (err) {
      console.error('Error refreshing library:', err);
      setError(new Error('Failed to refresh library. Please try again.'));
    } finally {
      setRefreshing(false);
    }
  };

  // Handle video click
  const handleVideoClick = useCallback((video) => {
    if (video && video.id) {
      navigate(`/video/${video.id}`);
    }
  }, [navigate]);

  // Group videos by category
  const getVideosByCategory = (categoryName) => {
    if (!categoryName || !videos.length) return [];
    return videos.filter(video => 
      video.category && video.category.toLowerCase() === categoryName.toLowerCase()
    );
  };

  // Get recent videos (last 20)
  const getRecentVideos = () => {
    if (!videos.length) return [];
    return [...videos]
      .sort((a, b) => new Date(b.lastModified || b.createdAt || 0) - new Date(a.lastModified || a.createdAt || 0))
      .slice(0, 20);
  };

  // Get featured/random videos
  const getFeaturedVideos = () => {
    if (!videos.length) return [];
    const shuffled = [...videos].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 12);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Main loading state
  if (loading && !videos.length) {
    return (
      <div className="home-page">
        <div className="home-loading">
          <LoadingSpinner size="large" text="Loading your video library..." />
        </div>
      </div>
    );
  }

  const recentVideos = getRecentVideos();
  const featuredVideos = getFeaturedVideos();

  return (
    <div className="home-page">
      {/* Header Section */}
      <div className="home-header">
        <div className="home-header-content">
          <div className="home-header-text">
            <h1>Your Video Library</h1>
            <p>Discover and enjoy your personal video collection</p>
          </div>
          
          <div className="home-header-actions">
            <button 
              className="btn btn-secondary"
              onClick={handleRefreshLibrary}
              disabled={refreshing}
            >
              <FaSync className={refreshing ? 'spinning' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh Library'}
            </button>
          </div>
        </div>

        {/* Stats Section */}
        {stats && (
          <div className="home-stats">
            <div className="stat-item">
              <FaFilm />
              <div>
                <span className="stat-number">{stats.totalVideos || videos.length}</span>
                <span className="stat-label">Videos</span>
              </div>
            </div>
            <div className="stat-item">
              <FaChartBar />
              <div>
                <span className="stat-number">{categories.length}</span>
                <span className="stat-label">Categories</span>
              </div>
            </div>
            {stats.totalSize && (
              <div className="stat-item">
                <span className="stat-icon">💾</span>
                <div>
                  <span className="stat-number">{apiService.formatFileSize(stats.totalSize)}</span>
                  <span className="stat-label">Total Size</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="home-content">
        {error && (
          <div className="home-error">
            <p>{error.message}</p>
            <button className="btn btn-primary" onClick={fetchData}>
              Try Again
            </button>
          </div>
        )}

        {/* All Videos Grid */}
        {!error && (
          <VideoGrid
            title="All Videos"
            videos={videos}
            loading={loading}
            error={error}
            onVideoClick={handleVideoClick}
            showCount={true}
          />
        )}

        {/* Category Sections */}
        {!error && !loading && categories.length > 0 && (
          <div className="home-categories">
            {/* Recent Videos */}
            {recentVideos.length > 0 && (
              <VideoGridSection
                title="Recently Added"
                videos={recentVideos}
                onVideoClick={handleVideoClick}
                maxItems={8}
              />
            )}

            {/* Featured Videos */}
            {featuredVideos.length > 0 && (
              <VideoGridSection
                title="Featured"
                videos={featuredVideos}
                onVideoClick={handleVideoClick}
                maxItems={8}
              />
            )}

            {/* Category Sections */}
            {categories.map((category) => {
              const categoryVideos = getVideosByCategory(category);
              if (categoryVideos.length === 0) return null;

              return (
                <VideoGridSection
                  key={category}
                  title={category}
                  videos={categoryVideos}
                  onVideoClick={handleVideoClick}
                  maxItems={8}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;