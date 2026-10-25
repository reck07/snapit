import { supabase } from './supabase';
import { DEVICE_CATEGORIES } from '../data/deviceCatalog';

// Demo user ID for no-auth mode (matches the backfill user in migration-add-user-id.sql)
// NOTE: For reads to work without auth, you need public read policies on tables.
// Run this SQL in Supabase Dashboard > SQL Editor to enable demo mode:
/*
  -- Enable public read access for demo mode
  CREATE POLICY "public read products" ON products FOR SELECT USING (true);
  CREATE POLICY "public read service_logs" ON service_logs FOR SELECT USING (true);
  CREATE POLICY "public read reminders" ON reminders FOR SELECT USING (true);
  CREATE POLICY "public read brands" ON brands FOR SELECT USING (true);
  CREATE POLICY "public read device_types" ON device_types FOR SELECT USING (true);
  
  -- For writes, you still need user_id. The demo user ID below must exist in auth.users.
  -- Either sign up a user and get their ID, or use service role key server-side.
*/
const DEMO_USER_ID = '887afb6f-6e03-47e3-9ce0-6a54fdab4dd0';
const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

// Helper to get current user ID
async function getCurrentUserId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user?.id) return session.user.id;
  if (DEMO_MODE) return DEMO_USER_ID;

  throw new Error('You are not signed in. Please sign in again.');
}

// Whole days from today until a YYYY-MM-DD date (negative = already past)
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

// Add names + computed warranty days so screens don't have to guess
function withDisplayFields(product) {
  if (!product) return product;
  return {
    ...product,
    brand_name: product.brands?.name || '',
    type_name: product.device_types?.name || '',
    warranty_days_left: daysUntil(product.warranty_expiry_date),
  };
}

// ============ BRANDS ============
export async function getBrands() {
  const { data, error } = await supabase.from('brands').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function getBrandIdByName(name) {
  const clean = (name || '').trim();
  if (!clean) throw new Error('Brand name is required');

  // First try to find existing brand (case-insensitive)
  const { data: existing, error: readError } = await supabase
    .from('brands')
    .select('id')
    .ilike('name', clean)
    .maybeSingle();

  if (readError) throw readError;
  if (existing?.id) return existing.id;

  // Create it through the SECURITY DEFINER function (RLS-safe)
  const { data: createdId, error } = await supabase.rpc('ensure_brand', { p_name: clean });
  if (!error) return createdId;

  // Fallback if the SQL migration hasn't been run yet
  if (error.code === 'PGRST202' || error.code === '42883') {
    const { data: created, error: insertError } = await supabase
      .from('brands')
      .insert({ name: clean })
      .select('id')
      .single();
    if (insertError) throw insertError;
    return created?.id;
  }

  throw error;
}

// ============ DEVICE TYPES ============
export async function getDeviceTypes(brandId) {
  const { data, error } = await supabase
    .from('device_types')
    .select('*')
    .eq('brand_id', brandId)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function getTypeIdByName(brandId, typeName) {
  const clean = (typeName || '').trim();
  if (!brandId) throw new Error('Brand is required');
  if (!clean) throw new Error('Device type is required');

  // First try to find existing type (case-insensitive)
  const { data: existing, error: readError } = await supabase
    .from('device_types')
    .select('id')
    .eq('brand_id', brandId)
    .ilike('name', clean)
    .maybeSingle();

  if (readError) throw readError;
  if (existing?.id) return existing.id;

  // Create it through the SECURITY DEFINER function (RLS-safe)
  const { data: createdId, error } = await supabase.rpc('ensure_device_type', {
    p_brand_id: brandId,
    p_name: clean,
  });
  if (!error) return createdId;

  // Fallback if the SQL migration hasn't been run yet
  if (error.code === 'PGRST202' || error.code === '42883') {
    const { data: created, error: insertError } = await supabase
      .from('device_types')
      .insert({ brand_id: brandId, name: clean })
      .select('id')
      .single();
    if (insertError) throw insertError;
    return created?.id;
  }

  throw error;
}

// ============ PRODUCTS ============
export async function getProductById(id) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('products')
    .select('*, brands(name), device_types(name)')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return withDisplayFields(data);
}

export async function getProducts(search, brandId) {
  const userId = await getCurrentUserId();
  let query = supabase
    .from('products')
    .select(
      `
    *,
    brands(name),
    device_types(name)
  `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('model_name', `%${search}%`);
  }
  if (brandId) {
    query = query.eq('brand_id', brandId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(withDisplayFields);
}

export async function addProductFull({
  modelName,
  typeId,
  brandId,
  purchaseDate,
  purchaseDatePrecision,
  purchasePrice,
  hasBill,
  billPhoto,
  warrantyPeriodMonths,
  warrantyExpiryDate,
  seller,
  serialNumber,
  invoicePhoto,
}) {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('products')
    .insert({
      model_name: modelName,
      type_id: typeId,
      brand_id: brandId,
      user_id: userId,
      purchase_date: purchaseDate,
      purchase_date_precision: purchaseDatePrecision,
      purchase_price: purchasePrice,
      has_bill: hasBill,
      bill_photo_path: billPhoto,
      invoice_photo_path: invoicePhoto,
      warranty_period_months: warrantyPeriodMonths,
      warranty_expiry_date: warrantyExpiryDate,
      seller,
      serial_number: serialNumber,
    })
    .select()
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateProductFull(id, fields) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('products')
    .update({
      model_name: fields.modelName,
      type_id: fields.typeId,
      brand_id: fields.brandId,
      purchase_date: fields.purchaseDate,
      purchase_date_precision: fields.purchaseDatePrecision,
      purchase_price: fields.purchasePrice,
      has_bill: fields.hasBill,
      bill_photo_path: fields.billPhoto,
      invoice_photo_path: fields.invoicePhoto,
      warranty_period_months: fields.warrantyPeriodMonths,
      warranty_expiry_date: fields.warrantyExpiryDate,
      seller: fields.seller,
      serial_number: fields.serialNumber,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id) {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('products').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// ============ SERVICE LOGS ============
export async function addServiceLogFull(productId, fields) {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('service_logs')
    .insert({
      product_id: productId,
      user_id: userId,
      note: fields.note,
      cost: fields.cost,
      repairman_name: fields.repairmanName,
      repairman_contact: fields.repairmanContact,
      vendor_name: fields.vendorName,
      date: fields.date,
      date_precision: fields.datePrecision,
      day: fields.day,
      time: fields.time,
      photo_url: fields.photoUrl,
      next_service_due: fields.nextServiceDue,
      payment_mode: fields.paymentMode,
    })
    .select()
    .single();
  if (error) throw error;
  return data.id;
}

export async function getServiceLogs(productId) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('service_logs')
    .select('*')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('time', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteServiceLog(id) {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('service_logs').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function getServiceLogById(id) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('service_logs')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateServiceLogFull(id, fields) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('service_logs')
    .update({
      note: fields.note,
      cost: fields.cost,
      repairman_name: fields.repairmanName,
      repairman_contact: fields.repairmanContact,
      vendor_name: fields.vendorName,
      date: fields.date,
      date_precision: fields.datePrecision,
      day: fields.day,
      time: fields.time,
      photo_url: fields.photoUrl,
      next_service_due: fields.nextServiceDue,
      payment_mode: fields.paymentMode,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============ ANALYTICS ============
export async function getSummary() {
  const userId = await getCurrentUserId();
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id', { count: 'exact' })
    .eq('user_id', userId);
  if (pErr) throw pErr;

  const { data: services, error: sErr } = await supabase
    .from('service_logs')
    .select('id, cost', { count: 'exact' })
    .eq('user_id', userId);
  if (sErr) throw sErr;

  const totalSpent = (services || []).reduce((sum, s) => sum + (s.cost || 0), 0);

  return {
    deviceCount: products?.length || 0,
    serviceCount: services?.length || 0,
    totalSpent,
  };
}

export async function getCostAnalytics() {
  const userId = await getCurrentUserId();
  const { data: products, error } = await supabase
    .from('products')
    .select('id, model_name, purchase_price, brand_id, type_id, brands(name), device_types(name)')
    .eq('user_id', userId);
  if (error) throw error;

  const { data: services, error: sErr } = await supabase
    .from('service_logs')
    .select('product_id, cost')
    .eq('user_id', userId);
  if (sErr) throw sErr;

  const serviceByProduct = new Map();
  for (const s of services || []) {
    const current = serviceByProduct.get(s.product_id) || { total: 0, count: 0 };
    current.total += Number(s.cost) || 0;
    current.count += 1;
    serviceByProduct.set(s.product_id, current);
  }

  const byDevice = (products || []).map(p => {
    const svc = serviceByProduct.get(p.id) || { total: 0, count: 0 };
    return {
      id: p.id,
      model_name: p.model_name,
      brand: p.brands?.name || 'Unknown',
      type: p.device_types?.name || 'Unknown',
      purchase_price: Number(p.purchase_price) || 0,
      service_total: svc.total,
      service_count: svc.count,
    };
  });

  const groupBy = keyFn => {
    const map = new Map();
    for (const d of byDevice) {
      const key = keyFn(d);
      const row = map.get(key) || { device_count: 0, purchase_total: 0, service_total: 0 };
      row.device_count += 1;
      row.purchase_total += d.purchase_price;
      row.service_total += d.service_total;
      map.set(key, row);
    }
    return [...map.entries()];
  };

  const totalPurchase = byDevice.reduce((sum, d) => sum + d.purchase_price, 0);
  const totalService = byDevice.reduce((sum, d) => sum + d.service_total, 0);

  return {
    totalPurchase,
    totalService,
    byDevice,
    byCategory: groupBy(d => d.type).map(([category, row]) => ({ category, ...row })),
    byBrand: groupBy(d => d.brand).map(([brand, row]) => ({ brand, ...row })),
  };
}

// ============ REMINDERS ============
export async function createWarrantyReminder(productId, warrantyExpiryDate) {
  const userId = await getCurrentUserId();

  const remindDate = new Date(warrantyExpiryDate);
  remindDate.setDate(remindDate.getDate() - 30);
  const triggerDate = remindDate.toISOString().split('T')[0];

  if (triggerDate >= new Date().toISOString().split('T')[0]) {
    await supabase.from('reminders').insert({
      product_id: productId,
      user_id: userId,
      type: 'warranty_expiry',
      trigger_date: triggerDate,
    });
  }

  const remindDate7 = new Date(warrantyExpiryDate);
  remindDate7.setDate(remindDate7.getDate() - 7);
  const triggerDate7 = remindDate7.toISOString().split('T')[0];

  if (triggerDate7 >= new Date().toISOString().split('T')[0]) {
    await supabase.from('reminders').insert({
      product_id: productId,
      user_id: userId,
      type: 'warranty_expiry',
      trigger_date: triggerDate7,
    });
  }
}

export async function getWarrantyExpiringSoon(days = 30) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('products')
    .select('*, brands(name), device_types(name)')
    .eq('user_id', userId)
    .not('warranty_expiry_date', 'is', null)
    .gte('warranty_expiry_date', new Date().toISOString().split('T')[0])
    .lte(
      'warranty_expiry_date',
      new Date(Date.now() + days * 86400000).toISOString().split('T')[0]
    );
  if (error) throw error;
  return (data || []).map(withDisplayFields);
}

export async function getUpcomingServiceReminders(days = 7) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('service_logs')
    .select('*, products(*, brands(name), device_types(name))')
    .eq('user_id', userId)
    .not('next_service_due', 'is', null)
    .gte('next_service_due', new Date().toISOString().split('T')[0])
    .lte('next_service_due', new Date(Date.now() + days * 86400000).toISOString().split('T')[0]);
  if (error) throw error;

  return (data || []).map(log => ({
    ...log,
    model_name: log.products?.model_name || 'Unknown device',
    brand_name: log.products?.brands?.name || '',
    type_name: log.products?.device_types?.name || '',
    days_left: daysUntil(log.next_service_due),
    trigger_date: log.next_service_due,
  }));
}

// ============ TECHNICIAN MEMORY ============
export async function getTechnicianMemory() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('service_logs')
    .select(
      'vendor_name, repairman_name, repairman_contact, date, products(model_name, brands(name))'
    )
    .eq('user_id', userId)
    .or('vendor_name.not.is.null,repairman_name.not.is.null');
  if (error) throw error;

  const grouped = {};
  (data || []).forEach(log => {
    const key = `${log.vendor_name || ''}-${log.repairman_name || ''}-${log.repairman_contact || ''}`;
    if (!grouped[key]) {
      grouped[key] = {
        vendor_name: log.vendor_name,
        repairman_name: log.repairman_name,
        repairman_contact: log.repairman_contact,
        visit_count: 0,
        devices_serviced: [],
        last_visit: null,
      };
    }
    grouped[key].visit_count++;
    if (log.products?.model_name) {
      grouped[key].devices_serviced.push(
        `${log.products.model_name} (${log.products.brands?.name || ''})`
      );
    }
    if (log.date && (!grouped[key].last_visit || log.date > grouped[key].last_visit)) {
      grouped[key].last_visit = log.date;
    }
  });

  return Object.values(grouped).sort(
    (a, b) =>
      b.visit_count - a.visit_count || (b.last_visit || '').localeCompare(a.last_visit || '')
  );
}

// ============ CATALOG SYNC ============
// Ensures every brand/category pair from the static catalog exists in Supabase.
// Reference rows are created through the RLS-safe ensure_* functions.
export async function refreshBrandsAndTypesFromApi() {
  try {
    const pairs = [];
    for (const category of DEVICE_CATEGORIES) {
      for (const brandName of category.commonBrands) {
        pairs.push({ brandName, typeName: category.name });
      }
    }

    const brandIds = new Map();
    let synced = 0;
    const BATCH = 8;

    for (let i = 0; i < pairs.length; i += BATCH) {
      const batch = pairs.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async ({ brandName, typeName }) => {
          let brandId = brandIds.get(brandName);
          if (!brandId) {
            brandId = await getBrandIdByName(brandName);
            brandIds.set(brandName, brandId);
          }
          await getTypeIdByName(brandId, typeName);
          synced += 1;
        })
      );
    }

    return {
      success: true,
      brandsCount: brandIds.size,
      typesCount: synced,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============ EXPORT ============
export async function getAllForExport() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id,
      model_name,
      purchase_date,
      brands(name),
      device_types(name),
      service_logs(id, note, cost, repairman_name, repairman_contact, date, day, time)
    `
    )
    .eq('user_id', userId)
    .order('model_name');
  if (error) throw error;

  // Flatten to one CSV row per service log (or one row per device if it has none)
  const rows = [];
  for (const product of data || []) {
    const base = {
      brand: product.brands?.name || '',
      device_type: product.device_types?.name || '',
      model_name: product.model_name || '',
      purchase_date: product.purchase_date || '',
    };
    const logs = product.service_logs || [];
    if (logs.length === 0) {
      rows.push({
        ...base,
        date: '',
        day: '',
        time: '',
        note: '',
        cost: '',
        repairman_name: '',
        repairman_contact: '',
      });
      continue;
    }
    for (const log of logs) {
      rows.push({
        ...base,
        date: log.date || '',
        day: log.day || '',
        time: log.time || '',
        note: log.note || '',
        cost: log.cost ?? '',
        repairman_name: log.repairman_name || '',
        repairman_contact: log.repairman_contact || '',
      });
    }
  }
  return rows;
}
