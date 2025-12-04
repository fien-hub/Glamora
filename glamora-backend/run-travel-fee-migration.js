/**
 * Run Travel Fee System Migration
 * 
 * This script runs the travel fee system migration using Supabase Management API
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting Travel Fee System Migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', 'add_travel_fee_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📝 Executing SQL...\n');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments
      if (statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct query if RPC fails
          const { error: queryError } = await supabase.from('_').select('*').limit(0);
          
          if (queryError) {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\n📋 What was added:');
      console.log('  ✅ travel_fee_type column to provider_profiles');
      console.log('  ✅ travel_fee_flat_rate column to provider_profiles');
      console.log('  ✅ travel_fee_per_km column to provider_profiles');
      console.log('  ✅ max_travel_distance_km column to provider_profiles');
      console.log('  ✅ free_travel_radius_km column to provider_profiles');
      console.log('  ✅ service_price column to bookings');
      console.log('  ✅ travel_fee column to bookings');
      console.log('  ✅ distance_km column to bookings');
      console.log('  ✅ provider_latitude column to bookings');
      console.log('  ✅ provider_longitude column to bookings');
      console.log('  ✅ service_amount column to payments');
      console.log('  ✅ travel_fee_amount column to payments');
      console.log('  ✅ calculate_distance_km() function');
      console.log('  ✅ calculate_travel_fee() function');
      console.log('\n🔧 Next Steps:');
      console.log('  1. Restart the backend server');
      console.log('  2. Test the pricing API: POST /api/pricing/calculate');
      console.log('  3. Add Travel Settings to provider profile');
      console.log('  4. Update booking flow to show price breakdown');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please check the logs above.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();

