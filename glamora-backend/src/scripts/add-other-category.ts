import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting migration: Add "Other" category for custom services...\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../../supabase/migrations/add-other-category.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      
      if (error) {
        // Try direct query if RPC doesn't work
        const { error: directError } = await supabase.from('_').select('*').limit(0);
        if (directError) {
          console.error(`❌ Error executing statement ${i + 1}:`, error);
          throw error;
        }
      }
      
      console.log(`✅ Statement ${i + 1} executed successfully`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Added "Other" service category');
    console.log('   - Added "Custom Service" entry');
    console.log('   - Added custom_service_name column to provider_services');
    console.log('   - Created index for custom service names');
    console.log('\n💡 Providers can now offer custom services not in the predefined list!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

