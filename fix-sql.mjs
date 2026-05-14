import https from 'https';

// Use environment variables for sensitive data
const PAT = process.env.SUPABASE_PAT;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const REF = process.env.SUPABASE_REF || 'your-supabase-ref';

function post(host, path, body, headers) {
  return new Promise((resolve, reject) => {
    const b = JSON.stringify(body);
    const req = https.request({ hostname: host, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b), ...headers }
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({status:res.statusCode,body:d})); });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(b); req.end();
  });
}

const fixSql = `
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id UUID, p_email TEXT, p_role TEXT,
  p_first_name TEXT, p_last_name TEXT, p_phone TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile_id UUID;
  v_existing_id UUID;
  v_result JSON;
BEGIN
  -- Remove orphaned public.users rows (deleted from auth.users) that block this email
  SELECT id INTO v_existing_id
  FROM public.users
  WHERE email = p_email AND id != p_user_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_existing_id) THEN
      -- Orphan: auth user was deleted but public row remains — safe to remove
      DELETE FROM public.users WHERE id = v_existing_id;
    ELSE
      -- A real different auth user owns this email — signal the client
      v_result := json_build_object(
        'success', FALSE,
        'error', 'EMAIL_IN_USE',
        'message', 'An account with this email already exists. Please sign in with your original method.'
      );
      RETURN v_result;
    END IF;
  END IF;

  INSERT INTO users (id, email, role) VALUES (p_user_id, p_email, p_role::user_role)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role;

  INSERT INTO profiles (user_id, first_name, last_name, phone)
  VALUES (p_user_id, p_first_name, p_last_name, p_phone)
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), profiles.first_name),
    last_name  = COALESCE(NULLIF(EXCLUDED.last_name,  ''), profiles.last_name)
  RETURNING id INTO v_profile_id;

  IF p_role = 'customer' THEN
    INSERT INTO customer_profiles (id, onboarding_completed) VALUES (v_profile_id, FALSE) ON CONFLICT (id) DO NOTHING;
  ELSIF p_role = 'provider' THEN
    INSERT INTO provider_profiles (id, onboarding_completed, is_verified) VALUES (v_profile_id, FALSE, FALSE) ON CONFLICT (id) DO NOTHING;
  END IF;

  v_result := json_build_object('success', TRUE, 'profile_id', v_profile_id, 'message', 'Profile created successfully');
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  v_result := json_build_object('success', FALSE, 'error', SQLERRM, 'message', 'Failed to create profile');
  RETURN v_result;
END; $$;
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated, anon;
`;

console.log('Deploying fix...');
const deploy = await post('api.supabase.com', `/v1/projects/${REF}/database/query`, { query: fixSql }, { Authorization: `Bearer ${PAT}` });
console.log('Deploy status:', deploy.status);
console.log('Deploy body:', deploy.body.slice(0, 300));

console.log('\nVerifying via RPC...');
const verify = await post(`${REF}.supabase.co`, '/rest/v1/rpc/create_user_profile',
  { p_user_id: '00000000-0000-0000-0000-000000000077', p_email: 'verify@test.com', p_role: 'customer', p_first_name: 'Test', p_last_name: 'User' },
  { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` });
const result = JSON.parse(verify.body);
console.log('Result:', JSON.stringify(result));
if (result.error?.includes('user_role')) {
  console.log('\n❌ Still failing — type cast not applied');
} else {
  console.log('\n✅ Type cast error is gone!', result.success ? 'Function works.' : `Other error: ${result.error}`);
}
