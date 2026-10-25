/* Read-only check of the current user's data. */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const smokeEmail = process.env.SMOKE_TEST_EMAIL;
const smokePassword = process.env.SMOKE_TEST_PASSWORD;
if (!smokeEmail || !smokePassword) {
  console.error('Set SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD in .env');
  process.exit(1);
}

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  const { data: auth, error } = await supabase.auth.signInWithPassword({
    email: smokeEmail,
    password: smokePassword,
  });
  if (error) throw error;

  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id, model_name, serial_number, user_id, brands(name), device_types(name)')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: true });
  if (pErr) throw pErr;

  const { count: logs, error: lErr } = await supabase
    .from('service_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id);
  if (lErr) throw lErr;

  console.log(`user: ${auth.user.email} (${auth.user.id})`);
  console.log(`products: ${products.length}`);
  products.forEach(p =>
    console.log(
      `  - ${p.model_name} | ${p.brands?.name || '?'} / ${p.device_types?.name || '?'} | serial=${p.serial_number || '-'}`
    )
  );
  console.log(`service_logs: ${logs}`);
}

main().catch(e => {
  console.error('CHECK FAILED:', e.message);
  process.exitCode = 1;
});
