const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read environment variables
require('dotenv').config({ path: './glamora-app/.env' });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🔧 Fixing database schema...\n');

  // Read the migration file
  const migrationSQL = fs.readFileSync('./supabase/migrations/20250120_fix_portfolio_and_feed.sql', 'utf8');

  console.log('📄 Migration file loaded');
  console.log('⚠️  Note: This script will execute the migration using Supabase client');
  console.log('⚠️  Some operations may require direct database access\n');

  // Split into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
    console.log(statement.substring(0, 100) + '...\n');

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        console.error(`❌ Error: ${error.message}`);
        console.error(`   Details: ${JSON.stringify(error)}`);
      } else {
        console.log(`✅ Success`);
      }
    } catch (error) {
      console.error(`❌ Exception: ${error.message}`);
    }
  }

  console.log('\n✅ Migration execution complete!');
  console.log('\n📝 Note: If you see errors, you may need to run the SQL directly in Supabase Dashboard');
  console.log('   Go to: https://supabase.com/dashboard/project/hygbxfkkdmenpkvgpwhn/sql/new');
}

main().catch(console.error);

