const jwt = require('jsonwebtoken');
const config = require('../../config/config.json');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: {
        message: 'Access token required',
        status: 401
      }
    });
  }

  jwt.verify(token, config.jwtSecret, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: {
            message: 'Token expired',
            status: 401
          }
        });
      }
      
      return res.status(403).json({
        error: {
          message: 'Invalid token',
          status: 403
        }
      });
    }

    req.user = decoded;
    next();
  });
};

// Optional authentication middleware (for public endpoints that can benefit from auth)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, config.jwtSecret, (err, decoded) => {
    if (err) {
      req.user = null;
    } else {
      req.user = decoded;
    }
    next();
  });
};

module.exports = {
  authenticateToken,
  optionalAuth
};