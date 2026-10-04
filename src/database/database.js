import { supabase } from './supabase';

// ============ BRANDS ============
export async function getBrands() {
  const { data, error } = await supabase
    .from('brands').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function getBrandIdByName(name) {
  const { data } = await supabase
    .from('brands').select('id').eq('name', name).single();
  return data?.id;
}

// ============ DEVICE TYPES ============
export async function getDeviceTypes(brandId) {
  const { data, error } = await supabase
    .from('device_types').select('*').eq('brand_id', brandId).order('name');
  if (error) throw error;
  return data || [];
}

export async function getTypeIdByName(brandId, typeName) {
  const { data } = await supabase
    .from('device_types').select('id')
    .eq('brand_id', brandId).eq('name', typeName).single();
  return data?.id;
}

// ============ PRODUCTS ============
export async function getProductById(id) {
  const { data, error } = await supabase
    .from('products').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getProducts(search, brandId) {
  let query = supabase.from('products').select(`
    *,
    brands(name),
    device_types(name)
  `).order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('model_name', `%${search}%`);
  }
  if (brandId) {
    query = query.eq('brand_id', brandId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addProductFull({
  modelName, typeId, brandId, purchaseDate, purchaseDatePrecision,
  purchasePrice, hasBill, billPhoto, warrantyPeriodMonths,
  warrantyExpiryDate, seller, serialNumber, invoicePhoto
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in — cannot save device');

  const { data, error } = await supabase
    .from('products')
    .insert({
      model_name: modelName,
      type_id: typeId,
      brand_id: brandId,
      user_id: user.id,
      purchase_date: purchaseDate,
      purchase_date_precision: purchaseDatePrecision,
      purchase_price: purchasePrice,
      has_bill: hasBill,
      bill_photo_path: billPhoto, // stores text URL/path
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
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

// ============ SERVICE LOGS ============
export async function addServiceLogFull(productId, fields) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in — cannot save service log');

  const { data, error } = await supabase
    .from('service_logs')
    .insert({
      product_id: productId,
      user_id: user.id,
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
  const { data, error } = await supabase
    .from('service_logs')
    .select('*')
    .eq('product_id', productId)
    .order('date', { ascending: false })
    .order('time', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteServiceLog(id) {
  const { error } = await supabase.from('service_logs').delete().eq('id', id);
  if (error) throw error;
}

export async function getServiceLogById(id) {
  const { data, error } = await supabase
    .from('service_logs')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateServiceLogFull(id, fields) {
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
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============ ANALYTICS ============
export async function getSummary() {
  const { data: products, error: pErr } = await supabase
    .from('products').select('id', { count: 'exact' });
  if (pErr) throw pErr;

  const { data: services, error: sErr } = await supabase
    .from('service_logs').select('id, cost', { count: 'exact' });
  if (sErr) throw sErr;

  const totalSpent = (services || []).reduce((sum, s) => sum + (s.cost || 0), 0);

  return {
    deviceCount: products?.length || 0,
    serviceCount: services?.length || 0,
    totalSpent,
  };
}

export async function getCostAnalytics() {
  const { data: products, error } = await supabase
    .from('products').select('id, model_name, purchase_price, brand_id, type_id');
  if (error) throw error;

  const { data: services, error: sErr } = await supabase
    .from('service_logs').select('product_id, cost');
  if (sErr) throw sErr;

  const byDevice = (products || []).map(p => {
    const deviceServices = (services || []).filter(s => s.product_id === p.id);
    const serviceTotal = deviceServices.reduce((sum, s) => sum + (s.cost || 0), 0);
    const serviceCount = deviceServices.length;
    return {
      id: p.id,
      model_name: p.model_name,
      purchase_price: p.purchase_price,
      service_total: serviceTotal,
      service_count: serviceCount,
    };
  });

  const totalPurchase = byDevice.reduce((sum, d) => sum + (d.purchase_price || 0), 0);
  const totalService = byDevice.reduce((sum, d) => sum + d.service_total, 0);

  return {
    totalPurchase,
    totalService,
    byDevice,
    byCategory: [],
    byBrand: [],
  };
}

// ============ REMINDERS ============
export async function createWarrantyReminder(productId, warrantyExpiryDate) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // silently skip if not signed in

  const remindDate = new Date(warrantyExpiryDate);
  remindDate.setDate(remindDate.getDate() - 30);
  const triggerDate = remindDate.toISOString().split('T')[0];

  if (triggerDate >= new Date().toISOString().split('T')[0]) {
    await supabase
      .from('reminders')
      .insert({ product_id: productId, user_id: user.id, type: 'warranty_expiry', trigger_date: triggerDate });
  }

  const remindDate7 = new Date(warrantyExpiryDate);
  remindDate7.setDate(remindDate7.getDate() - 7);
  const triggerDate7 = remindDate7.toISOString().split('T')[0];

  if (triggerDate7 >= new Date().toISOString().split('T')[0]) {
    await supabase
      .from('reminders')
      .insert({ product_id: productId, user_id: user.id, type: 'warranty_expiry', trigger_date: triggerDate7 });
  }
}

export async function getWarrantyExpiringSoon(days = 30) {
  const { data, error } = await supabase
    .from('products')
    .select('*, brands(name), device_types(name)')
    .not('warranty_expiry_date', 'is', null)
    .gte('warranty_expiry_date', new Date().toISOString().split('T')[0])
    .lte('warranty_expiry_date', new Date(Date.now() + days * 86400000).toISOString().split('T')[0]);
  if (error) throw error;
  return data || [];
}

export async function getUpcomingServiceReminders(days = 7) {
  const { data, error } = await supabase
    .from('service_logs')
    .select('*, products(*, brands(name), device_types(name))')
    .not('next_service_due', 'is', null)
    .gte('next_service_due', new Date().toISOString().split('T')[0])
    .lte('next_service_due', new Date(Date.now() + days * 86400000).toISOString().split('T')[0]);
  if (error) throw error;
  return data || [];
}

// ============ TECHNICIAN MEMORY ============
export async function getTechnicianMemory() {
  const { data, error } = await supabase
    .from('service_logs')
    .select('vendor_name, repairman_name, repairman_contact, date, products(model_name, brands(name))')
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
      grouped[key].devices_serviced.push(`${log.products.model_name} (${log.products.brands?.name || ''})`);
    }
    if (log.date && (!grouped[key].last_visit || log.date > grouped[key].last_visit)) {
      grouped[key].last_visit = log.date;
    }
  });

  return Object.values(grouped)
    .sort((a, b) => b.visit_count - a.visit_count || (b.last_visit || '').localeCompare(a.last_visit || ''));
}

// ============ EXPORT ============
export async function getAllForExport() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      model_name,
      purchase_date,
      brands(name),
      device_types(name),
      service_logs(id, note, cost, repairman_name, repairman_contact, date, day, time)
    `)
    .order('model_name');
  if (error) throw error;
  return data || [];
}