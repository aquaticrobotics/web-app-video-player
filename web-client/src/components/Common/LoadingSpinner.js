import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary', 
  text = 'Loading...', 
  fullScreen = false 
}) => {
  const sizeClass = `spinner-${size}`;
  const colorClass = `spinner-${color}`;
  
  const spinner = (
    <div className={`loading-container ${fullScreen ? 'fullscreen' : ''}`}>
      <div className={`spinner ${sizeClass} ${colorClass}`}></div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );

  return spinner;
};

export default LoadingSpinner;