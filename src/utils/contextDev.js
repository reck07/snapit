/**
 * Context.dev Wrapper Module
 * 
 * Server-side wrapper for Context.dev API calls.
 * IMPORTANT: This module uses the CONTEXT_DEV_API_KEY from environment variables.
 * In production, this should run on a backend server, not in the client bundle.
 * For Expo/React Native apps, proxy these calls through your own API server.
 * 
 * Endpoints used for UPCitemdb-like functionality:
 * - POST /web/search - Search for product by barcode/keywords
 * - POST /web/scrape - Scrape product details from a specific URL (with product extraction)
 * - POST /web/answers - Structured extraction for product data
 * 
 * Docs: https://docs.context.dev
 */

import ContextDev from 'context.dev';

// Initialize the Context.dev client
// The SDK automatically reads CONTEXT_DEV_API_KEY from process.env
const context = new ContextDev({
  apiKey: process.env.CONTEXT_DEV_API_KEY,
});

/**
 * Search for products by barcode or keywords
 * Uses POST /web/search (1 credit per 10 results)
 * Docs: https://docs.context.dev/api-reference/web-scraping/search
 */
export async function searchProducts(query, options = {}) {
  try {
    const response = await context.web.search({
      query,
      numResults: options.numResults || 10,
      freshness: options.freshness || 'last_week',
      markdownOptions: options.markdownOptions || { enabled: false },
      highlightsOptions: options.highlightsOptions || { enabled: false },
    });
    return response;
  } catch (error) {
    console.error('[Context.dev] Search error:', error.message);
    throw error;
  }
}

/**
 * Scrape a specific product URL for detailed information
 * Uses POST /web/scrape (From 1 credit)
 * Docs: https://docs.context.dev/api-reference/web-scraping/scrape
 */
export async function scrapeProduct(url, options = {}) {
  try {
    const formats = {
      markdown: true,
      html: false,
      screenshot: false,
      images: false,
      bytes: false,
      parse: false,
      highlights: false,
      json: false,
      product: options.extractProduct || false,
    };

    const response = await context.web.scrape({
      url,
      formats,
      productParams: options.extractProduct ? { dedupeImages: true } : undefined,
      maxAgeMs: options.maxAgeMs || 7 * 24 * 60 * 60 * 1000,
      sharedParams: {
        waitFor: 'main',
        mainContentOnly: true,
        theme: 'light',
      },
    });
    return response;
  } catch (error) {
    console.error('[Context.dev] Scrape error:', error.message);
    throw error;
  }
}

/**
 * Get structured product data using Answers API
 * Uses POST /web/answers (10 credits in Fast mode)
 * Docs: https://docs.context.dev/api-reference/web-extraction/answers
 */
export async function getStructuredProductData(query, jsonFormat) {
  try {
    const response = await context.web.answers({
      mode: 'fast', // 10 credits vs 100 for ultra
      task: query,
      json_format: jsonFormat,
    });
    return response;
  } catch (error) {
    console.error('[Context.dev] Answers error:', error.message);
    throw error;
  }
}

/**
 * Look up product by barcode (UPC/EAN)
 * Combines search + structured extraction for barcode lookup
 */
export async function lookupByBarcode(barcode) {
  // First, search for the barcode
  const searchResults = await searchProducts(`barcode ${barcode} product`, { numResults: 10 });
  
  // If we have results, try to get structured data for the first relevant result
  if (searchResults.results && searchResults.results.length > 0) {
    const firstResult = searchResults.results[0];
    if (firstResult.url) {
      // Try to scrape the product page for structured data
      const scrapeResult = await scrapeProduct(firstResult.url, { 
        extractProduct: true,
      });
      return {
        barcode,
        searchResults,
        productData: scrapeResult,
      };
    }
  }
  
  return {
    barcode,
    searchResults,
    productData: null,
  };
}

/**
 * Search for brand information
 * Uses GET /brand/search (1 credit)
 * Docs: https://docs.context.dev/api-reference/brand-intelligence/search
 */
export async function searchBrands(query) {
  try {
    const response = await context.brand.search({
      query,
    });
    return response;
  } catch (error) {
    console.error('[Context.dev] Brand search error:', error.message);
    throw error;
  }
}

export default context;