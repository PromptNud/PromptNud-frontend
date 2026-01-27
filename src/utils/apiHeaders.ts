/**
 * Utility functions for API requests
 */

/**
 * Creates headers for API requests with authentication
 * @param accessToken The access token for authorization (optional - will read from storage if not provided)
 * @returns Headers object with appropriate values
 */
export const createApiHeaders = (accessToken?: string | null) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
  const isNgrok = apiBaseUrl.includes('ngrok');

  // Get token from parameter, localStorage, or cookies
  const token = accessToken ||
    (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

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
