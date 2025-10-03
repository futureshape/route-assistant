/**
 * CSRF Token Management Utility
 * 
 * Handles fetching and including CSRF tokens in API requests
 * to protect against Cross-Site Request Forgery attacks.
 */

let csrfToken: string | null = null;

/**
 * Fetch a fresh CSRF token from the server
 */
export async function fetchCSRFToken(): Promise<string> {
  try {
    const response = await fetch('/api/csrf-token');
    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }
    const data = await response.json();
    csrfToken = data.csrfToken;
    return csrfToken!;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

/**
 * Get the current CSRF token, fetching a new one if needed
 */
export async function getCSRFToken(): Promise<string> {
  if (!csrfToken) {
    return await fetchCSRFToken();
  }
  return csrfToken;
}

/**
 * Clear the cached CSRF token (useful when token becomes invalid)
 */
export function clearCSRFToken(): void {
  csrfToken = null;
}

/**
 * Enhanced fetch function that automatically includes CSRF token
 * for POST, PUT, PATCH, and DELETE requests
 */
export async function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  const method = options.method?.toUpperCase() || 'GET';
  
  // Only add CSRF token for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      const token = await getCSRFToken();
      
      // Add CSRF token to headers
      const headers = new Headers(options.headers);
      headers.set('X-CSRF-Token', token);
      
      options = {
        ...options,
        headers
      };
    } catch (error) {
      console.error('Failed to add CSRF token to request:', error);
      // Continue with request without CSRF token - let server handle the error
    }
  }
  
  const response = await fetch(url, options);
  
  // If we get a 403 error, it might be due to an invalid CSRF token
  // Clear the cached token and let the calling code handle the retry
  if (response.status === 403) {
    clearCSRFToken();
  }
  
  return response;
}

/**
 * Retry wrapper for fetch operations that may fail due to CSRF token issues
 * Automatically retries once with a fresh token if the first request fails with 403
 */
export async function fetchWithCSRFRetry(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const response = await fetchWithCSRF(url, options);
    
    // If we get a 403, try once more with a fresh token
    if (response.status === 403) {
      console.log('CSRF token may be invalid, retrying with fresh token...');
      clearCSRFToken();
      return await fetchWithCSRF(url, options);
    }
    
    return response;
  } catch (error) {
    console.error('CSRF-protected request failed:', error);
    throw error;
  }
}