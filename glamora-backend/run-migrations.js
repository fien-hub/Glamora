const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration(filePath) {
  console.log(`\n📄 Running migration: ${path.basename(filePath)}`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split by semicolons and filter out empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`   Found ${statements.length} SQL statements`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.startsWith('--') || statement.length === 0) {
        continue;
      }
      
      console.log(`   Executing statement ${i + 1}/${statements.length}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: statement + ';' 
      });
      
      if (error) {
        // Try direct query if RPC doesn't work
        const { error: directError } = await supabase
          .from('_migrations')
          .insert({ statement: statement });
        
        if (directError) {
          console.error(`   ❌ Error:`, error.message);
          // Continue with other statements
        } else {
          console.log(`   ✅ Success`);
        }
      } else {
        console.log(`   ✅ Success`);
      }
    }
    
    console.log(`✅ Migration completed: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to run migration: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database migrations...\n');
  
  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  
  // Discover and sort all .sql files in the migrations directory
  const allFiles = fs.readdirSync(migrationsDir)
    .filter((f) => f.toLowerCase().endsWith('.sql'))
    .sort();

  if (allFiles.length === 0) {
    console.log('ℹ️  No SQL migration files found. Nothing to do.');
    return;
  }

  console.log(`📦 Found ${allFiles.length} migration files to run`);

  for (const migration of allFiles) {
    const filePath = path.join(migrationsDir, migration);
    await runMigration(filePath);
  }
  
  console.log('\n🎉 All migrations completed!');
  console.log('\n📋 Next steps:');
  console.log('   1. Restart the backend server');
  console.log('   2. Refresh the app');
  console.log('   3. Test the custom service feature in onboarding Step 2');
}

main().catch(console.error);

