const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../../config/config.json');

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { accessCode } = req.body;

    if (!accessCode) {
      return res.status(400).json({
        error: {
          message: 'Access code is required',
          status: 400
        }
      });
    }

    // Verify access code
    if (accessCode !== config.accessCode) {
      return res.status(401).json({
        error: {
          message: 'Invalid access code',
          status: 401
        }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        authenticated: true,
        timestamp: Date.now()
      },
      config.jwtSecret,
      { 
        expiresIn: '24h' 
      }
    );

    res.json({
      success: true,
      token,
      expiresIn: '24h',
      message: 'Authentication successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error',
        status: 500
      }
    });
  }
});

// Verify token endpoint
router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: {
          message: 'Token is required',
          status: 400
        }
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwtSecret);
    
    res.json({
      valid: true,
      decoded,
      message: 'Token is valid'
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: {
          message: 'Invalid token',
          status: 401
        }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          message: 'Token expired',
          status: 401
        }
      });
    }

    console.error('Token verification error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error',
        status: 500
      }
    });
  }
});

// Logout endpoint (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

module.exports = router;