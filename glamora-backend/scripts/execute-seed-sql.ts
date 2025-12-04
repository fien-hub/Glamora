import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQLFile() {
  console.log('🌱 Executing provider services and availability seed data...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../supabase/seed-provider-services.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolons to get individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📄 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty lines
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }

      try {
        // Execute the statement
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
        
        if (error) {
          // Try direct query execution as fallback
          const result = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ query: statement + ';' })
          });

          if (!result.ok) {
            console.error(`❌ Statement ${i + 1} failed`);
            errorCount++;
            continue;
          }
        }

        successCount++;
        if ((i + 1) % 10 === 0) {
          console.log(`✅ Executed ${i + 1}/${statements.length} statements...`);
        }
      } catch (error: any) {
        console.error(`❌ Error executing statement ${i + 1}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Successfully executed: ${successCount} statements`);
    console.log(`❌ Failed: ${errorCount} statements`);
    console.log('='.repeat(50) + '\n');

  } catch (error: any) {
    console.error('❌ Failed to execute SQL file:', error.message);
    process.exit(1);
  }
}

// Run the function
executeSQLFile()
  .then(() => {
    console.log('✅ Seed process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed process failed:', error);
    process.exit(1);
  });

