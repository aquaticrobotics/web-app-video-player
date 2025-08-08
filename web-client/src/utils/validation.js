/**
 * Comprehensive input validation utilities for the video streaming application
 */

// Regular expressions for validation
const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  accessCode: /^[0-9]{4}$/,
  filename: /^[a-zA-Z0-9._-]+$/,
  videoId: /^[a-zA-Z0-9]{8,32}$/,
  searchQuery: /^[a-zA-Z0-9\s\-_.!@#$%^&*()]{0,100}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  port: /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/
};

// Validation error messages
const VALIDATION_MESSAGES = {
  required: 'This field is required',
  invalid: 'Invalid format',
  tooShort: 'Too short',
  tooLong: 'Too long',
  accessCode: 'Access code must be exactly 4 digits',
  email: 'Please enter a valid email address',
  url: 'Please enter a valid URL',
  filename: 'Invalid filename format',
  videoId: 'Invalid video ID format',
  searchQuery: 'Search query contains invalid characters',
  ipAddress: 'Please enter a valid IP address',
  port: 'Please enter a valid port number (1-65535)'
};

/**
 * Base validation result structure
 */
class ValidationResult {
  constructor(isValid = true, message = '', field = '') {
    this.isValid = isValid;
    this.message = message;
    this.field = field;
  }

  static success() {
    return new ValidationResult(true);
  }

  static error(message, field = '') {
    return new ValidationResult(false, message, field);
  }
}

/**
 * Sanitize string input to prevent XSS and other attacks
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return String(input || '');
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove basic HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 1000); // Limit length
};

/**
 * Sanitize HTML content for safe display
 */
export const sanitizeHtml = (html) => {
  if (typeof html !== 'string') {
    return '';
  }

  // Basic HTML sanitization - remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
};

/**
 * Validate required fields
 */
export const validateRequired = (value, fieldName = 'Field') => {
  if (value === null || value === undefined || value === '') {
    return ValidationResult.error(`${fieldName} is required`, fieldName.toLowerCase());
  }
  return ValidationResult.success();
};

/**
 * Validate string length
 */
export const validateLength = (value, min = 0, max = Infinity, fieldName = 'Field') => {
  const strValue = String(value || '');
  
  if (strValue.length < min) {
    return ValidationResult.error(`${fieldName} must be at least ${min} characters`, fieldName.toLowerCase());
  }
  
  if (strValue.length > max) {
    return ValidationResult.error(`${fieldName} must be no more than ${max} characters`, fieldName.toLowerCase());
  }
  
  return ValidationResult.success();
};

/**
 * Validate against a pattern
 */
export const validatePattern = (value, pattern, message = VALIDATION_MESSAGES.invalid, fieldName = '') => {
  const strValue = String(value || '');
  
  if (!pattern.test(strValue)) {
    return ValidationResult.error(message, fieldName);
  }
  
  return ValidationResult.success();
};

/**
 * Validate access code format
 */
export const validateAccessCode = (accessCode) => {
  const sanitized = sanitizeInput(accessCode);
  
  // Check required
  const requiredCheck = validateRequired(sanitized, 'Access code');
  if (!requiredCheck.isValid) return requiredCheck;
  
  // Check pattern
  return validatePattern(
    sanitized, 
    VALIDATION_PATTERNS.accessCode, 
    VALIDATION_MESSAGES.accessCode,
    'accessCode'
  );
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const sanitized = sanitizeInput(email);
  
  // Check required
  const requiredCheck = validateRequired(sanitized, 'Email');
  if (!requiredCheck.isValid) return requiredCheck;
  
  // Check pattern
  return validatePattern(
    sanitized, 
    VALIDATION_PATTERNS.email, 
    VALIDATION_MESSAGES.email,
    'email'
  );
};

/**
 * Validate search query
 */
export const validateSearchQuery = (query) => {
  const sanitized = sanitizeInput(query);
  
  // Empty query is allowed for search
  if (!sanitized) {
    return ValidationResult.success();
  }
  
  // Check length
  const lengthCheck = validateLength(sanitized, 1, 100, 'Search query');
  if (!lengthCheck.isValid) return lengthCheck;
  
  // Check pattern
  return validatePattern(
    sanitized, 
    VALIDATION_PATTERNS.searchQuery, 
    VALIDATION_MESSAGES.searchQuery,
    'searchQuery'
  );
};

/**
 * Validate video ID format
 */
export const validateVideoId = (videoId) => {
  const sanitized = sanitizeInput(videoId);
  
  // Check required
  const requiredCheck = validateRequired(sanitized, 'Video ID');
  if (!requiredCheck.isValid) return requiredCheck;
  
  // Check pattern
  return validatePattern(
    sanitized, 
    VALIDATION_PATTERNS.videoId, 
    VALIDATION_MESSAGES.videoId,
    'videoId'
  );
};

/**
 * Validate filename format
 */
export const validateFilename = (filename) => {
  const sanitized = sanitizeInput(filename);
  
  // Check required
  const requiredCheck = validateRequired(sanitized, 'Filename');
  if (!requiredCheck.isValid) return requiredCheck;
  
  // Check length
  const lengthCheck = validateLength(sanitized, 1, 255, 'Filename');
  if (!lengthCheck.isValid) return lengthCheck;
  
  // Check pattern
  return validatePattern(
    sanitized, 
    VALIDATION_PATTERNS.filename, 
    VALIDATION_MESSAGES.filename,
    'filename'
  );
};

/**
 * Validate URL format
 */
export const validateUrl = (url) => {
  const sanitized = sanitizeInput(url);
  
  // Check required
  const requiredCheck = validateRequired(sanitized, 'URL');
  if (!requiredCheck.isValid) return requiredCheck;
  
  // Check pattern
  return validatePattern(
    sanitized, 
    VALIDATION_PATTERNS.url, 
    VALIDATION_MESSAGES.url,
    'url'
  );
};

/**
 * Validate IP address format
 */
export const validateIpAddress = (ip) => {
  const sanitized = sanitizeInput(ip);
  
  // Check required
  const requiredCheck = validateRequired(sanitized, 'IP Address');
  if (!requiredCheck.isValid) return requiredCheck;
  
  // Check pattern
  return validatePattern(
    sanitized, 
    VALIDATION_PATTERNS.ipAddress, 
    VALIDATION_MESSAGES.ipAddress,
    'ipAddress'
  );
};

/**
 * Validate port number
 */
export const validatePort = (port) => {
  const sanitized = sanitizeInput(port);
  
  // Check required
  const requiredCheck = validateRequired(sanitized, 'Port');
  if (!requiredCheck.isValid) return requiredCheck;
  
  // Check if it's a number
  const portNum = parseInt(sanitized, 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    return ValidationResult.error(VALIDATION_MESSAGES.port, 'port');
  }
  
  return ValidationResult.success();
};

/**
 * Validate form data with multiple fields
 */
export const validateForm = (formData, validationRules) => {
  const results = {};
  let isFormValid = true;
  
  Object.keys(validationRules).forEach(field => {
    const rules = validationRules[field];
    const value = formData[field];
    
    for (const rule of rules) {
      const result = rule(value);
      if (!result.isValid) {
        results[field] = result;
        isFormValid = false;
        break; // Stop at first validation error for this field
      }
    }
    
    // If no errors, mark as valid
    if (!results[field]) {
      results[field] = ValidationResult.success();
    }
  });
  
  return {
    isValid: isFormValid,
    results,
    errors: Object.keys(results)
      .filter(field => !results[field].isValid)
      .reduce((acc, field) => {
        acc[field] = results[field].message;
        return acc;
      }, {}),
    firstError: isFormValid ? null : Object.values(results).find(r => !r.isValid)?.message
  };
};

/**
 * Debounced validation for real-time form validation
 */
export const createDebouncedValidator = (validator, delay = 300) => {
  let timeoutId;
  
  return (value, callback) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const result = validator(value);
      callback(result);
    }, delay);
  };
};

/**
 * Validation rules for common forms
 */
export const FORM_VALIDATION_RULES = {
  login: {
    accessCode: [validateAccessCode]
  },
  
  search: {
    query: [validateSearchQuery]
  },
  
  video: {
    id: [validateVideoId]
  },
  
  settings: {
    apiUrl: [validateUrl],
    port: [validatePort]
  }
};

/**
 * Helper function to get validation errors as an array
 */
export const getValidationErrors = (validationResults) => {
  return Object.values(validationResults)
    .filter(result => !result.isValid)
    .map(result => result.message);
};

/**
 * Helper function to check if any validation failed
 */
export const hasValidationErrors = (validationResults) => {
  return Object.values(validationResults).some(result => !result.isValid);
};

/**
 * Real-time input validation hook-friendly utilities
 */
export const createFieldValidator = (validatorFn) => {
  return {
    validate: validatorFn,
    
    validateOnChange: (value, setError) => {
      const result = validatorFn(value);
      setError(result.isValid ? '' : result.message);
      return result.isValid;
    },
    
    validateOnBlur: (value, setError, setTouched) => {
      setTouched(true);
      const result = validatorFn(value);
      setError(result.isValid ? '' : result.message);
      return result.isValid;
    }
  };
};

export default {
  sanitizeInput,
  sanitizeHtml,
  validateRequired,
  validateLength,
  validatePattern,
  validateAccessCode,
  validateEmail,
  validateSearchQuery,
  validateVideoId,
  validateFilename,
  validateUrl,
  validateIpAddress,
  validatePort,
  validateForm,
  createDebouncedValidator,
  createFieldValidator,
  ValidationResult,
  FORM_VALIDATION_RULES,
  getValidationErrors,
  hasValidationErrors
};