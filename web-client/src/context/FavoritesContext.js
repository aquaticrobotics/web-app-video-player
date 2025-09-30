import React, { createContext, useContext, useState, useEffect } from 'react';

const FavoritesContext = createContext();

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState(new Set());

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('videoFavorites');
      if (savedFavorites) {
        const favoritesArray = JSON.parse(savedFavorites);
        setFavorites(new Set(favoritesArray));
        console.log('💖 [FAVORITES] Loaded from localStorage:', favoritesArray.length, 'favorites');
      }
    } catch (error) {
      console.error('💖 [FAVORITES] Error loading favorites:', error);
    }
  }, []);

  // Save favorites to localStorage whenever favorites change
  useEffect(() => {
    try {
      const favoritesArray = Array.from(favorites);
      localStorage.setItem('videoFavorites', JSON.stringify(favoritesArray));
      console.log('💖 [FAVORITES] Saved to localStorage:', favoritesArray.length, 'favorites');
    } catch (error) {
      console.error('💖 [FAVORITES] Error saving favorites:', error);
    }
  }, [favorites]);

  const toggleFavorite = (videoId) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(videoId)) {
        newFavorites.delete(videoId);
        console.log('💖 [FAVORITES] Removed from favorites:', videoId);
      } else {
        newFavorites.add(videoId);
        console.log('💖 [FAVORITES] Added to favorites:', videoId);
      }
      return newFavorites;
    });
  };

  const isFavorite = (videoId) => {
    return favorites.has(videoId);
  };

  const getFavoritesList = () => {
    return Array.from(favorites);
  };

  const clearAllFavorites = () => {
    setFavorites(new Set());
    console.log('💖 [FAVORITES] Cleared all favorites');
  };

  const value = {
    favorites,
    toggleFavorite,
    isFavorite,
    getFavoritesList,
    clearAllFavorites,
    favoritesCount: favorites.size
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};