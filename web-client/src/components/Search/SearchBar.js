import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { apiService } from '../../services/api';
import debounce from 'lodash.debounce';
import './SearchBar.css';

const SearchBar = ({ onClose, autoFocus = false, mobile = false }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Debounced search function
  const debouncedSearch = useRef(
    debounce(async (searchQuery) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setLoading(true);
      try {
        const response = await apiService.searchVideos(searchQuery);
        setResults(response.videos || []);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
        setShowResults(false);
      } finally {
        setLoading(false);
      }
    }, 300)
  ).current;

  // Auto focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/?search=${encodeURIComponent(query.trim())}`);
      handleClose();
    }
  };

  // Handle result click
  const handleResultClick = (video) => {
    navigate(`/video/${video.id}`);
    handleClose();
  };

  // Handle close
  const handleClose = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    if (onClose) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Cleanup debounced function
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return (
    <div className={`search-bar ${mobile ? 'mobile' : ''}`}>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-container">
          <FaSearch className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search videos..."
            className="search-input"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setShowResults(false);
                inputRef.current?.focus();
              }}
              className="clear-button"
              aria-label="Clear search"
            >
              <FaTimes />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={handleClose}
              className="close-button"
              aria-label="Close search"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </form>

      {/* Search Results */}
      {showResults && (
        <div className="search-results">
          {loading ? (
            <div className="search-loading">
              <div className="search-spinner"></div>
              <span>Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="results-list">
              {results.slice(0, 8).map((video) => (
                <div
                  key={video.id}
                  className="result-item"
                  onClick={() => handleResultClick(video)}
                >
                  <div className="result-thumbnail">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        loading="lazy"
                      />
                    ) : (
                      <div className="thumbnail-placeholder">
                        <FaSearch />
                      </div>
                    )}
                  </div>
                  <div className="result-info">
                    <h4 className="result-title">{video.title}</h4>
                    <div className="result-meta">
                      <span className="result-duration">
                        {apiService.formatDuration(video.duration)}
                      </span>
                      <span className="result-quality">
                        {apiService.getVideoQuality(video.width, video.height)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {results.length > 8 && (
                <div className="show-all-results">
                  <button
                    onClick={() => {
                      navigate(`/?search=${encodeURIComponent(query)}`);
                      handleClose();
                    }}
                    className="show-all-button"
                  >
                    Show all {results.length} results
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="no-results">
              <FaSearch className="no-results-icon" />
              <p>No videos found for "{query}"</p>
            </div>
          )}
        </div>
      )}

      {/* Backdrop for mobile */}
      {mobile && showResults && (
        <div className="search-backdrop" onClick={handleClose} />
      )}
    </div>
  );
};

export default SearchBar;