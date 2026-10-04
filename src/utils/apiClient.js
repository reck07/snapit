/**
 * Frontend API Client for SnapIt Backend
 * 
 * Replaces direct Context.dev SDK usage with backend proxy calls.
 * Backend runs on http://localhost:3001 (or configured API_URL)
 */

const API_BASE = __DEV__ 
  ? 'http://localhost:3001'  // Local backend
  : 'https://your-production-backend.com'; // Production

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Search for products by barcode or keywords
 * Calls POST /api/search-products
 */
export async function searchProducts(query, options = {}) {
  return request('/api/search-products', {
    method: 'POST',
    body: JSON.stringify({
      query,
      numResults: options.numResults || 10,
      freshness: options.freshness || 'last_week',
    }),
  });
}

/**
 * Scrape a specific product URL for detailed information
 * Calls POST /api/scrape-product
 */
export async function scrapeProduct(url, options = {}) {
  return request('/api/scrape-product', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

/**
 * Look up product by barcode (UPC/EAN)
 * Calls POST /api/lookup-barcode
 */
export async function lookupByBarcode(barcode) {
  return request('/api/lookup-barcode', {
    method: 'POST',
    body: JSON.stringify({ barcode }),
  });
}

/**
 * Get structured product data using Answers API
 * Calls POST /api/structured-product-data
 */
export async function getStructuredProductData(query, jsonFormat) {
  return request('/api/structured-product-data', {
    method: 'POST',
    body: JSON.stringify({ query, jsonFormat }),
  });
}

/**
 * Health check
 */
export async function healthCheck() {
  return request('/health', { method: 'GET' });
}

export default {
  searchProducts,
  scrapeProduct,
  lookupByBarcode,
  getStructuredProductData,
  healthCheck,
};