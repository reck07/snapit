/* End-to-end save probe: exercises the same path the app uses to add a device. */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const smokeEmail = process.env.SMOKE_TEST_EMAIL;
const smokePassword = process.env.SMOKE_TEST_PASSWORD;
if (!smokeEmail || !smokePassword) {
  console.error('Set SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD in .env');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const created = { productId: null, logId: null };

async function main() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: smokeEmail,
    password: smokePassword,
  });
  if (authErr) throw new Error(`AUTH: ${authErr.message}`);
  const userId = auth.user.id;
  console.log('AUTH OK:', userId);

  // 1. ensure_brand RPC (existing brand, so nothing new is created)
  const { data: brandId, error: brandErr } = await supabase.rpc('ensure_brand', {
    p_name: 'Samsung',
  });
  console.log('ensure_brand:', brandErr ? `FAIL ${brandErr.code} ${brandErr.message}` : `ok (${brandId})`);
  if (brandErr) throw brandErr;

  // 2. ensure_device_type RPC
  const { data: typeId, error: typeErr } = await supabase.rpc('ensure_device_type', {
    p_brand_id: brandId,
    p_name: 'Smartphone',
  });
  console.log('ensure_device_type:', typeErr ? `FAIL ${typeErr.code} ${typeErr.message}` : `ok (${typeId})`);
  if (typeErr) throw typeErr;

  // 3. Insert product with the same fields as addProductFull
  const serial = `PROBE-${Date.now()}`;
  const { data: product, error: pErr } = await supabase
    .from('products')
    .insert({
      model_name: 'Probe Galaxy S24',
      type_id: typeId,
      brand_id: brandId,
      user_id: userId,
      purchase_date: null,
      purchase_date_precision: 'unknown',
      purchase_price: null,
      has_bill: false,
      bill_photo_path: null,
      invoice_photo_path: null,
      warranty_period_months: null,
      warranty_expiry_date: null,
      seller: null,
      serial_number: serial,
    })
    .select()
    .single();
  console.log('product insert:', pErr ? `FAIL ${pErr.code} ${pErr.message}` : `ok (${product.id})`);
  if (pErr) throw pErr;
  created.productId = product.id;

  // 4. Insert service log
  const { data: log, error: lErr } = await supabase
    .from('service_logs')
    .insert({
      product_id: product.id,
      user_id: userId,
      note: 'Probe service',
      cost: 10,
      repairman_name: null,
      repairman_contact: null,
      vendor_name: null,
      date: null,
      date_precision: 'unknown',
      day: null,
      time: null,
      photo_url: null,
      next_service_due: null,
      payment_mode: null,
    })
    .select()
    .single();
  console.log('service_log insert:', lErr ? `FAIL ${lErr.code} ${lErr.message}` : `ok (${log.id})`);
  if (lErr) throw lErr;
  created.logId = log.id;

  // 5. Read back with joins (same as Home/History)
  const { data: readBack, error: rErr } = await supabase
    .from('products')
    .select('*, brands(name), device_types(name)')
    .eq('id', product.id)
    .maybeSingle();
  console.log(
    'read back:',
    rErr ? `FAIL ${rErr.message}` : `${readBack.model_name} / ${readBack.brands?.name} / ${readBack.device_types?.name}`
  );
  if (rErr) throw rErr;

  // 6. Cleanup
  const { error: dlErr } = await supabase.from('service_logs').delete().eq('id', log.id);
  console.log('service_log delete:', dlErr ? `FAIL ${dlErr.message}` : 'ok');
  const { error: dpErr } = await supabase.from('products').delete().eq('id', product.id);
  console.log('product delete:', dpErr ? `FAIL ${dpErr.message}` : 'ok');
  created.logId = null;
  created.productId = null;

  console.log('\nSAVE PATH: OK');
}

main()
  .catch(async e => {
    console.error('\nSAVE PATH FAILED:', e.message);
    process.exitCode = 1;
    // Best-effort cleanup
    try {
      if (created.logId) await supabase.from('service_logs').delete().eq('id', created.logId);
      if (created.productId) await supabase.from('products').delete().eq('id', created.productId);
    } catch {}
  })
  .finally(() => process.exit(process.exitCode || 0));
