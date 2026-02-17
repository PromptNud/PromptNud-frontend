/**
 * Utility functions for API requests
 */

/**
 * Creates headers for API requests.
 * Authentication is handled via HttpOnly cookies (sent automatically with credentials: "include").
 */
export const createApiHeaders = () => {
  const apiBaseUrl = getApiBaseUrl();
  const isNgrok = apiBaseUrl.includes('ngrok');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add ngrok skip header for development
  if (isNgrok) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  return headers;
};

/**
 * Gets the API base URL
 */
export const getApiBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
};
