// Static device categories, brands, and common models for MVP
// No external API needed - works offline, fast, no rate limits
// Replace with API integration later when needed

export const DEVICE_CATEGORIES = [
  {
    id: 'ac',
    name: 'Air Conditioner',
    icon: '❄️',
    commonBrands: ['Voltas', 'LG', 'Samsung', 'Daikin', 'Blue Star', 'Hitachi', 'Carrier', 'Panasonic', 'Godrej', 'Whirlpool'],
    defaultWarrantyMonths: 12,
    serviceIntervalMonths: 6, // typical AC service interval
  },
  {
    id: 'fridge',
    name: 'Refrigerator',
    icon: '🧊',
    commonBrands: ['LG', 'Samsung', 'Whirlpool', 'Godrej', 'Haier', 'Bosch', 'Siemens', 'Panasonic', 'Videocon', 'Kelvinator'],
    defaultWarrantyMonths: 12,
    serviceIntervalMonths: 12,
  },
  {
    id: 'washing_machine',
    name: 'Washing Machine',
    icon: '🧺',
    commonBrands: ['LG', 'Samsung', 'Whirlpool', 'IFB', 'Bosch', 'Godrej', 'Haier', 'Panasonic', 'Onida', 'Videocon'],
    defaultWarrantyMonths: 24,
    serviceIntervalMonths: 12,
  },
  {
    id: 'tv',
    name: 'Television',
    icon: '📺',
    commonBrands: ['Samsung', 'LG', 'Sony', 'TCL', 'Xiaomi', 'OnePlus', 'VU', 'Panasonic', 'Philips', 'Hisense'],
    defaultWarrantyMonths: 12,
    serviceIntervalMonths: 0,
  },
  {
    id: 'microwave',
    name: 'Microwave Oven',
    icon: '🍳',
    commonBrands: ['LG', 'Samsung', 'IFB', 'Whirlpool', 'Godrej', 'Panasonic', 'Morphy Richards', 'Bajaj', 'Prestige', 'Kaff'],
    defaultWarrantyMonths: 12,
    serviceIntervalMonths: 0,
  },
  {
    id: 'water_purifier',
    name: 'Water Purifier',
    icon: '💧',
    commonBrands: ['Kent', 'Aquaguard', 'Pureit', 'Livpure', 'Blue Star', 'Havells', 'AO Smith', 'Eureka Forbes', 'Tata Swach', 'HUL'],
    defaultWarrantyMonths: 12,
    serviceIntervalMonths: 6, // filter changes
  },
  {
    id: 'geyser',
    name: 'Water Heater / Geyser',
    icon: '♨️',
    commonBrands: ['Racold', 'Bajaj', 'Havells', 'AO Smith', 'Venus', 'V-Guard', 'Crompton', 'Usha', 'Orient', 'Kenstar'],
    defaultWarrantyMonths: 24,
    serviceIntervalMonths: 12,
  },
  {
    id: 'laptop',
    name: 'Laptop',
    icon: '💻',
    commonBrands: ['Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'Apple', 'MSI', 'Microsoft', 'Razer', 'Samsung'],
    defaultWarrantyMonths: 12,
    serviceIntervalMonths: 0,
  },
  {
    id: 'smartphone',
    name: 'Smartphone',
    icon: '📱',
    commonBrands: ['Apple', 'Samsung', 'Xiaomi', 'OnePlus', 'Vivo', 'Oppo', 'Realme', 'Motorola', 'Google', 'Nothing'],
    defaultWarrantyMonths: 12,
    serviceIntervalMonths: 0,
  },
  {
    id: 'inverter',
    name: 'Inverter / UPS',
    icon: '🔋',
    commonBrands: ['Luminous', 'Microtek', 'Exide', 'Amaron', 'Su-Kam', 'V-Guard', 'Genus', 'Okaya', 'Base', 'Livguard'],
    defaultWarrantyMonths: 24,
    serviceIntervalMonths: 12,
  },
];

// Helper: get category by ID
export function getCategoryById(id) {
  return DEVICE_CATEGORIES.find(c => c.id === id);
}

// Helper: get all category names for dropdown
export function getCategoryNames() {
  return DEVICE_CATEGORIES.map(c => ({ label: `${c.icon} ${c.name}`, value: c.id }));
}

// Helper: get brands for a category
export function getBrandsForCategory(categoryId) {
  const cat = getCategoryById(categoryId);
  return cat?.commonBrands || [];
}

// Helper: get default warranty for category
export function getDefaultWarranty(categoryId) {
  const cat = getCategoryById(categoryId);
  return cat?.defaultWarrantyMonths || 12;
}

// Helper: get service interval for category
export function getServiceInterval(categoryId) {
  const cat = getCategoryById(categoryId);
  return cat?.serviceIntervalMonths || 0;
}

// Common specs by category (for reference/display)
export const CATEGORY_SPECS = {
  ac: ['Cooling Capacity (Ton)', 'Star Rating', 'Type (Split/Window/Portable)', 'Refrigerant (R32/R410A)', 'Inverter/Non-Inverter'],
  fridge: ['Capacity (Liters)', 'Type (Single/Double/Side-by-side)', 'Star Rating', 'Frost Free/Direct Cool', 'Compressor Type'],
  washing_machine: ['Capacity (kg)', 'Type (Front/Top Load)', 'Star Rating', 'Fully/Semi Automatic', 'Inverter Motor'],
  tv: ['Screen Size (inches)', 'Resolution (4K/Full HD/HD)', 'Smart TV OS', 'Display Type (LED/OLED/QLED)', 'Refresh Rate'],
  microwave: ['Capacity (Liters)', 'Type (Solo/Grill/Convection)', 'Power Levels', 'Auto Cook Menus', 'Child Lock'],
  water_purifier: ['Purification Tech (RO/UV/UF)', 'Storage Capacity (L)', 'TDS Controller', 'Filter Life Indicator', 'Mineral Cartridge'],
  geyser: ['Capacity (Liters)', 'Type (Instant/Storage)', 'Star Rating', 'Pressure Rating', 'Warranty on Tank'],
  laptop: ['Processor (i5/i7/Ryzen 5/7)', 'RAM (GB)', 'Storage (SSD/HDD)', 'Screen Size', 'Graphics Card', 'OS'],
  smartphone: ['Processor', 'RAM (GB)', 'Storage (GB)', 'Screen Size', 'Camera (MP)', 'Battery (mAh)', '5G Support'],
  inverter: ['Capacity (VA/Watts)', 'Battery Type (Tubular/Flat)', 'Waveform (Sine/Square)', 'Charging Current', 'Display Type'],
};

export function getSpecsForCategory(categoryId) {
  return CATEGORY_SPECS[categoryId] || [];
}

// ============================================
// API INTEGRATION STRUCTURE (for later use)
// ============================================

/**
 * UPCitemdb API - Free barcode lookup
 * https://www.upcitemdb.com/
 * Free tier: 100 requests/day
 */
export const UPCITEMDB_CONFIG = {
  baseUrl: 'https://api.upcitemdb.com/prod/trial',
  endpoints: {
    lookup: '/lookup',
    search: '/search',
  },
  // Usage:
  // const response = await fetch(`${UPCITEMDB_CONFIG.baseUrl}${UPCITEMDB_CONFIG.endpoints.lookup}?upc=${barcode}`);
  // const data = await response.json();
  // data.items[0] -> { title, brand, category, description, images, ... }
};

/**
 * Icecat API - Open product catalog for electronics
 * https://www.icecat.biz/
 * Free for open data use, register for API key
 */
export const ICAT_CONFIG = {
  baseUrl: 'https://api.icecat.biz',
  // Requires: username, password (from registration)
  // Returns: detailed specs, images, categories, multilingual descriptions
};

/**
 * Barcode Lookup API
 * https://www.barcodelookup.com/api
 * Paid tiers, broader coverage
 */
export const BARCODE_LOOKUP_CONFIG = {
  baseUrl: 'https://api.barcodelookup.com/v3',
  // Requires: API key
  endpoints: {
    product: '/products',
  },
};

/**
 * Generic barcode/OCR → product lookup flow
 * 
 * async function lookupProduct(barcodeOrImage) {
 *   // 1. Try local static data first (fast, offline)
 *   const local = searchLocalModels(barcodeOrImage);
 *   if (local) return { source: 'local', ...local };
 *   
 *   // 2. Try UPCitemdb (free, 100/day)
 *   try {
 *     const upc = await fetch(`${UPCITEMDB_CONFIG.baseUrl}${UPCITEMDB_CONFIG.endpoints.lookup}?upc=${barcode}`);
 *     if (upc.ok) return { source: 'upcitemdb', ...await upc.json() };
 *   } catch {}
 *   
 *   // 3. Try Icecat (if registered)
 *   // ...
 *   
 *   // 4. Fallback: return null, user fills manually
 *   return null;
 * }
 */

// Simple local search helper (extend with your own data)
export function searchLocalModels(query) {
  const q = query.toLowerCase();
  for (const cat of DEVICE_CATEGORIES) {
    for (const brand of cat.commonBrands) {
      if (brand.toLowerCase().includes(q) || cat.name.toLowerCase().includes(q)) {
        return { category: cat.id, brand, categoryName: cat.name };
      }
    }
  }
  return null;
}