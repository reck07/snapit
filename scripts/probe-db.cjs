/* Read-only-ish probe: verifies auth + whether brands/device_types inserts are allowed.
   Cleans up any rows it creates. */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing env vars');
  process.exit(1);
}

const smokeEmail = process.env.SMOKE_TEST_EMAIL;
const smokePassword = process.env.SMOKE_TEST_PASSWORD;
if (!smokeEmail || !smokePassword) {
  console.error('Set SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD in .env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: smokeEmail,
    password: smokePassword,
  });
  if (authErr) {
    console.log('AUTH FAILED:', authErr.message);
    return;
  }
  console.log('AUTH OK, user:', auth.user.id);

  const { data: brands, error: bErr } = await supabase.from('brands').select('id,name').limit(3);
  console.log('brands read:', bErr ? `FAIL ${bErr.message}` : `${brands.length} rows`);

  const { count, error: tErr } = await supabase
    .from('device_types')
    .select('id', { count: 'exact', head: true });
  console.log('device_types read:', tErr ? `FAIL ${tErr.message}` : `count=${count}`);

  const { data: prods, error: pErr } = await supabase
    .from('products')
    .select('id,model_name,user_id')
    .limit(3);
  console.log('products read:', pErr ? `FAIL ${pErr.message}` : `${prods.length} rows`);

  const probeBrand = `__probe_brand_${Date.now()}`;
  const { data: insBrand, error: insBrandErr } = await supabase
    .from('brands')
    .insert({ name: probeBrand })
    .select('id')
    .single();
  console.log(
    'brands insert:',
    insBrandErr ? `DENIED/FAIL ${insBrandErr.code} ${insBrandErr.message}` : 'ALLOWED'
  );

  if (insBrand?.id) {
    const { error: delBrandErr } = await supabase.from('brands').delete().eq('id', insBrand.id);
    console.log('brands cleanup:', delBrandErr ? `FAIL ${delBrandErr.message}` : 'ok');
  }

  const probeType = `__probe_type_${Date.now()}`;
  const brandId = insBrand?.id || brands?.[0]?.id;
  const { data: insType, error: insTypeErr } = await supabase
    .from('device_types')
    .insert({ brand_id: brandId, name: probeType })
    .select('id')
    .single();
  console.log(
    'device_types insert:',
    insTypeErr ? `DENIED/FAIL ${insTypeErr.code} ${insTypeErr.message}` : 'ALLOWED'
  );

  if (insType?.id) {
    const { error: delTypeErr } = await supabase.from('device_types').delete().eq('id', insType.id);
    console.log('device_types cleanup:', delTypeErr ? `FAIL ${delTypeErr.message}` : 'ok');
  }
}

main()
  .catch(e => console.error('FATAL:', e.message))
  .finally(() => process.exit(0));
