const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Enhanced security middleware for the video streaming server
 */

// Content Security Policy configuration
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "blob:"],
    mediaSrc: ["'self'", "blob:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: []
  },
  reportOnly: false
};

// Enhanced helmet configuration
const helmetConfig = {
  contentSecurityPolicy: cspConfig,
  crossOriginEmbedderPolicy: { policy: "credentialless" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
};

// Rate limiting configurations for different endpoints
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = true) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: {
        message,
        status: 429,
        retryAfter: Math.ceil(windowMs / 1000)
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          message,
          status: 429,
          retryAfter: Math.ceil(windowMs / 1000)
        }
      });
    }
  });
};

// Different rate limits for different types of requests
const rateLimits = {
  // Authentication endpoints - stricter limits
  auth: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts
    'Too many authentication attempts, please try again later.',
    false // Don't skip failed requests
  ),
  
  // API endpoints - moderate limits
  api: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests
    'Too many API requests, please try again later.'
  ),
  
  // Video streaming - more lenient but still limited
  stream: createRateLimit(
    1 * 60 * 1000, // 1 minute
    30, // 30 requests
    'Too many streaming requests, please try again later.'
  ),
  
  // General rate limit for all other requests
  general: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    200, // 200 requests
    'Too many requests, please try again later.'
  )
};

// Request size limits
const requestSizeLimit = (req, res, next) => {
  // Set maximum request size to 10MB
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    return res.status(413).json({
      error: {
        message: 'Request entity too large',
        status: 413,
        maxSize: '10MB'
      }
    });
  }
  
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Additional custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Remove sensitive headers that might leak information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      return value
        .replace(/[<>]/g, '') // Remove basic HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim()
        .slice(0, 1000); // Limit length
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          obj[key] = sanitizeObject(obj[key]);
        }
      }
    } else {
      return sanitizeValue(obj);
    }
    return obj;
  };

  // Sanitize request body, query params, and URL params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Security logging middleware
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log suspicious activity
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /eval\(/i,  // Code execution attempts
    /exec\(/i   // Command execution attempts
  ];
  
  const requestContent = JSON.stringify({
    url: req.url,
    method: req.method,
    query: req.query,
    body: req.body,
    headers: req.headers
  });
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestContent));
  
  if (isSuspicious) {
    console.warn('🚨 SECURITY WARNING: Suspicious request detected', {
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.url,
      query: req.query,
      body: req.body,
      headers: req.headers
    });
  }
  
  // Log all requests in production for security monitoring
  if (process.env.NODE_ENV === 'production') {
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log('🔒 SECURITY LOG:', {
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        suspicious: isSuspicious
      });
    });
  }
  
  next();
};

// Block common attack patterns
const blockAttacks = (req, res, next) => {
  const url = req.url.toLowerCase();
  const userAgent = (req.get('User-Agent') || '').toLowerCase();
  
  // Block common attack URLs
  const blockedPatterns = [
    /\/\.env/,
    /\/wp-admin/,
    /\/admin/,
    /\/config/,
    /\/\.git/,
    /\/\.svn/,
    /phpinfo/,
    /eval\(/,
    /system\(/,
    /exec\(/
  ];
  
  // Block suspicious user agents
  const blockedUserAgents = [
    /sqlmap/,
    /nikto/,
    /nessus/,
    /burp/,
    /w3af/,
    /metasploit/
  ];
  
  if (blockedPatterns.some(pattern => pattern.test(url)) ||
      blockedUserAgents.some(pattern => pattern.test(userAgent))) {
    
    console.warn('🚫 BLOCKED ATTACK ATTEMPT:', {
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(403).json({
      error: {
        message: 'Access denied',
        status: 403
      }
    });
  }
  
  next();
};

// IP whitelist middleware (for production)
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // No whitelist configured, allow all
    }
    
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      console.warn('🚫 IP NOT WHITELISTED:', {
        timestamp: new Date().toISOString(),
        ip: clientIP,
        method: req.method,
        url: req.url
      });
      
      return res.status(403).json({
        error: {
          message: 'Access denied - IP not whitelisted',
          status: 403
        }
      });
    }
    
    next();
  };
};

module.exports = {
  helmet: helmet(helmetConfig),
  rateLimits,
  requestSizeLimit,
  securityHeaders,
  sanitizeInput,
  securityLogger,
  blockAttacks,
  ipWhitelist
};