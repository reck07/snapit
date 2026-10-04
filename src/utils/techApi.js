import { Platform } from 'react-native';

const API_BASE = 'https://gettechapi.github.io/TechAPI/v1';

// Map API collections to our device type names
const CATEGORY_TO_DEVICE_TYPE = {
  smartphones: 'Smartphone',
  tablets: 'Tablet',
  laptops: 'Laptop',
  monitors: 'Monitor',
  watches: 'Smartwatch',
};

// Priority brands that are most relevant for consumer device tracking
const PRIORITY_BRANDS = [
  'samsung', 'apple', 'lg', 'sony', 'panasonic', 'dell', 'hp', 'lenovo',
  'asus', 'acer', 'msi', 'razer', 'xiaomi', 'oneplus', 'oppo', 'vivo',
  'realme', 'nokia', 'motorola', 'google', 'microsoft', 'huawei', 'honor',
  'tcl', 'hisense', 'philips', 'sharp', 'toshiba', 'fujitsu', 'viewsonic',
  'benq', 'aoc', 'gigabyte', 'alienware', 'surface', 'macbook', 'ipad',
  'galaxy', 'pixel', 'thinkpad', 'ideapad', 'pavilion', 'envy', 'spectre',
  'zenbook', 'vivobook', 'rog', 'predator', 'nitro', 'legion', 'ideacentre',
];

// Cache for model searches
let modelsCache = {};

async function fetchJson(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') throw new Error('Request timeout');
    throw error;
  }
}

export async function fetchAllBrands() {
  const data = await fetchJson(`${API_BASE}/brands/index.json`);
  return data.results || [];
}

export async function fetchBrandsWithDevices() {
  const brands = await fetchAllBrands();
  
  // Filter to priority brands and sort by name
  const filtered = brands
    .filter(b => PRIORITY_BRANDS.includes(b.slug.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  return filtered;
}

/**
 * Fetch models for a specific brand and device type
 * Fetches from the appropriate category endpoint and filters by brand slug
 */
export async function fetchModelsForBrand(brandSlug, deviceType = 'smartphones') {
  const cacheKey = `${brandSlug}-${deviceType}`;
  if (modelsCache[cacheKey]) {
    return modelsCache[cacheKey];
  }

  try {
    // Fetch the category index (e.g., smartphones)
    const data = await fetchJson(`${API_BASE}/${deviceType}/index.json`);
    const allModels = data.results || [];
    
    // Filter by brand slug (the API uses slug in the model data)
    const brandModels = allModels
      .filter(m => m.brand?.toLowerCase() === brandSlug.toLowerCase() || 
                   m.brand_slug?.toLowerCase() === brandSlug.toLowerCase())
      .map(m => ({
        name: m.name || m.model,
        slug: m.slug,
        year: m.year,
        // Include specs for potential future use
        specs: m.specs || {}
      }))
      .sort((a, b) => (b.year || 0) - (a.year || 0)) // Newest first
      .slice(0, 100); // Limit to 100 models
    
    modelsCache[cacheKey] = brandModels;
    return brandModels;
  } catch (error) {
    console.warn(`[TechAPI] Failed to fetch models for ${brandSlug}/${deviceType}:`, error.message);
    return [];
  }
}

/**
 * Search models across all categories for a brand
 */
export async function searchModelsForBrand(brandSlug, query = '') {
  const categories = Object.keys(CATEGORY_TO_DEVICE_TYPE);
  const allModels = [];
  
  for (const cat of categories) {
    const models = await fetchModelsForBrand(brandSlug, cat);
    allModels.push(...models.map(m => ({ ...m, category: CATEGORY_TO_DEVICE_TYPE[cat] })));
  }
  
  if (query) {
    const q = query.toLowerCase();
    return allModels.filter(m => m.name.toLowerCase().includes(q));
  }
  return allModels;
}

export async function seedBrandsAndTypesFromApi(database) {
  console.log('[TechAPI] Fetching brands...');
  const brands = await fetchBrandsWithDevices();
  console.log(`[TechAPI] Got ${brands.length} priority brands`);

  // Seed brands
  for (const brand of brands) {
    await database.runAsync(
      'INSERT OR IGNORE INTO brands (name) VALUES (?)',
      brand.name
    );
  }

  // Seed device types for each brand based on API categories
  const deviceTypes = Object.values(CATEGORY_TO_DEVICE_TYPE);
  
  for (const brand of brands) {
    const brandRecord = await database.getFirstAsync(
      'SELECT id FROM brands WHERE name = ?',
      brand.name
    );
    if (!brandRecord) continue;

    for (const typeName of deviceTypes) {
      const existing = await database.getFirstAsync(
        'SELECT id FROM device_types WHERE name = ? AND brand_id = ?',
        typeName,
        brandRecord.id
      );
      if (!existing) {
        await database.runAsync(
          'INSERT INTO device_types (name, brand_id) VALUES (?, ?)',
          typeName,
          brandRecord.id
        );
      }
    }
  }

  console.log('[TechAPI] Seeding complete');
  return { brandsCount: brands.length, typesCount: deviceTypes.length };
}

// Fallback: static brand list if API fails
export const FALLBACK_BRANDS = [
  'Samsung', 'Apple', 'LG', 'Sony', 'Panasonic', 'Dell', 'HP', 'Lenovo',
  'ASUS', 'Acer', 'MSI', 'Razer', 'Xiaomi', 'OnePlus', 'OPPO', 'Vivo',
  'Realme', 'Nokia', 'Motorola', 'Google', 'Microsoft', 'Huawei', 'Honor',
  'TCL', 'Hisense', 'Philips', 'Sharp', 'Toshiba', 'Fujitsu', 'ViewSonic',
  'BenQ', 'AOC', 'Gigabyte',
];

export const FALLBACK_TYPES = [
  'Smartphone', 'Tablet', 'Laptop', 'Monitor', 'Smartwatch',
];

export async function seedFallbackData(database) {
  console.log('[TechAPI] Using fallback data...');
  for (const name of FALLBACK_BRANDS) {
    await database.runAsync('INSERT OR IGNORE INTO brands (name) VALUES (?)', name);
  }
  
  for (const brandName of FALLBACK_BRANDS) {
    const brand = await database.getFirstAsync('SELECT id FROM brands WHERE name = ?', brandName);
    if (!brand) continue;
    for (const typeName of FALLBACK_TYPES) {
      const existing = await database.getFirstAsync(
        'SELECT id FROM device_types WHERE name = ? AND brand_id = ?',
        typeName,
        brand.id
      );
      if (!existing) {
        await database.runAsync(
          'INSERT INTO device_types (name, brand_id) VALUES (?, ?)',
          typeName,
          brand.id
        );
      }
    }
  }
}

// Map brand name to API slug
export function getBrandSlug(brandName) {
  const slugMap = {
    'Samsung': 'samsung',
    'Apple': 'apple',
    'LG Electronics': 'lg',
    'LG': 'lg',
    'Sony': 'sony',
    'Panasonic': 'panasonic',
    'Dell': 'dell',
    'HP': 'hp',
    'Lenovo': 'lenovo',
    'ASUS': 'asus',
    'Acer': 'acer',
    'MSI': 'msi',
    'Razer': 'razer',
    'Xiaomi': 'xiaomi',
    'OnePlus': 'oneplus',
    'OPPO': 'oppo',
    'Vivo': 'vivo',
    'Realme': 'realme',
    'Nokia': 'nokia',
    'Motorola': 'motorola',
    'Google': 'google',
    'Microsoft': 'microsoft',
    'Huawei': 'huawei',
    'HONOR': 'honor',
    'Honor': 'honor',
    'TCL': 'tcl',
    'Hisense': 'hisense',
    'Philips': 'philips',
    'Sharp': 'sharp',
    'Toshiba': 'toshiba',
    'Fujitsu': 'fujitsu',
    'ViewSonic': 'viewsonic',
    'BenQ': 'benq',
    'AOC': 'aoc',
    'Gigabyte Technology': 'gigabyte',
    'Gigabyte': 'gigabyte',
  };
  return slugMap[brandName] || brandName.toLowerCase().replace(/\s+/g, '-');
}