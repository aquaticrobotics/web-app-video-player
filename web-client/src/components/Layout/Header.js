import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FaPlay, FaSearch, FaUser, FaSignOutAlt, FaSync } from 'react-icons/fa';
import SearchBar from '../Search/SearchBar';
import './Header.css';

const Header = () => {
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLogoClick = () => {
    navigate('/');
    setShowSearch(false);
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleRefreshLibrary = async () => {
    try {
      // This will be implemented when we add the refresh functionality
      console.log('Refreshing library...');
      setShowUserMenu(false);
    } catch (error) {
      console.error('Error refreshing library:', error);
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        {/* Logo and Brand */}
        <div className="header-left">
          <div className="logo" onClick={handleLogoClick}>
            <FaPlay className="logo-icon" />
            <span className="logo-text">VideoStream</span>
          </div>
        </div>

        {/* Search */}
        <div className="header-center">
          {showSearch ? (
            <SearchBar 
              onClose={() => setShowSearch(false)}
              autoFocus={true}
            />
          ) : (
            <button 
              className="search-toggle"
              onClick={toggleSearch}
              aria-label="Open search"
            >
              <FaSearch />
            </button>
          )}
        </div>

        {/* User Menu */}
        <div className="header-right">
          <div className="user-menu">
            <button 
              className="user-menu-toggle"
              onClick={toggleUserMenu}
              aria-label="User menu"
            >
              <FaUser />
            </button>
            
            {showUserMenu && (
              <div className="user-menu-dropdown">
                <button 
                  className="menu-item"
                  onClick={handleRefreshLibrary}
                >
                  <FaSync />
                  <span>Refresh Library</span>
                </button>
                <div className="menu-divider"></div>
                <button 
                  className="menu-item logout"
                  onClick={handleLogout}
                >
                  <FaSignOutAlt />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {showSearch && (
        <div className="mobile-search-overlay">
          <SearchBar 
            onClose={() => setShowSearch(false)}
            autoFocus={true}
            mobile={true}
          />
        </div>
      )}

      {/* Click outside to close menus */}
      {(showUserMenu || showSearch) && (
        <div 
          className="header-overlay"
          onClick={() => {
            setShowUserMenu(false);
            setShowSearch(false);
          }}
        />
      )}
    </header>
  );
};

export default Header;