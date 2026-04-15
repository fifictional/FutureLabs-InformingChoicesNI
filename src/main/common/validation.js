/**
 * Input validation utilities for database operations
 */

export function validateId(id, fieldName = 'id') {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    throw new Error(`Invalid ${fieldName}: must be a positive integer`);
  }
  return numId;
}

export function validateString(value, fieldName = 'field', minLength = 1, maxLength = 10000) {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName}: must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    throw new Error(`Invalid ${fieldName}: must be at least ${minLength} characters`);
  }
  if (trimmed.length > maxLength) {
    throw new Error(`Invalid ${fieldName}: must be no more than ${maxLength} characters`);
  }
  return trimmed;
}

export function validateEmail(email) {
  const trimmed = String(email).trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error('Invalid email format');
  }
  return trimmed;
}

export function validateArray(value, fieldName = 'array') {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${fieldName}: must be an array`);
  }
  return value;
}

export function validateObject(value, fieldName = 'object') {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${fieldName}: must be an object`);
  }
  return value;
}

export function validateDate(value, fieldName = 'date') {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: must be a valid date`);
  }
  return date;
}

export function validateNumber(value, fieldName = 'number', min = null, max = null) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid ${fieldName}: must be a valid number`);
  }
  if (min !== null && num < min) {
    throw new Error(`Invalid ${fieldName}: must be at least ${min}`);
  }
  if (max !== null && num > max) {
    throw new Error(`Invalid ${fieldName}: must be no more than ${max}`);
  }
  return num;
}

export function validateEnum(value, allowedValues, fieldName = 'field') {
  if (!allowedValues.includes(value)) {
    throw new Error(
      `Invalid ${fieldName}: must be one of ${allowedValues.join(', ')}, got "${value}"`
    );
  }
  return value;
}
