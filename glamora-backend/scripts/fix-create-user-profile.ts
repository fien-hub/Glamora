import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// We need to run DDL. Supabase JS client can't do that directly.
// Use the pg (postgres) module via the connection string if available,
// otherwise use the supabase-js admin API workaround via a temp function.

async function main() {
  console.log('Testing current function...');
  const { data: before } = await supabase.rpc('create_user_profile', {
    p_user_id: '00000000-0000-0000-0000-000000000011',
    p_email: 'fix-test@example.com',
    p_role: 'customer',
    p_first_name: 'Fix',
    p_last_name: 'Test',
  });
  console.log('Before:', JSON.stringify(before));

  // Try using Supabase's pg_query if it exists (some projects enable it)
  // This is a known workaround: create a temp helper function first via rpc
  // that can execute arbitrary SQL, then call it.
  
  // Since we can't run DDL via REST API, we'll output instructions:
  if (before && (before as any).error?.includes('user_role')) {
    console.log('\n❌ Bug confirmed. The function needs p_role::user_role cast.');
    console.log('Run the SQL in fix-create-user-profile.sql via Supabase dashboard.');
  } else if (before && (before as any).success) {
    console.log('\n✅ Function already works correctly!');
  } else {
    console.log('\n⚠️  Unexpected result:', before);
  }
}

main().catch(console.error).finally(() => process.exit(0));
