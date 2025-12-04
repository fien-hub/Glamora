const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runComprehensiveServices() {
  console.log('🚀 Adding comprehensive services...\n');
  
  const filePath = path.join(__dirname, 'supabase', 'migrations', 'add-comprehensive-services.sql');
  const sql = fs.readFileSync(filePath, 'utf8');
  
  // Extract all INSERT statements
  const insertRegex = /INSERT INTO public\.services[^;]+;/g;
  const inserts = sql.match(insertRegex);
  
  if (!inserts) {
    console.log('❌ No INSERT statements found');
    return;
  }
  
  console.log(`📋 Found ${inserts.length} INSERT statements\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < inserts.length; i++) {
    const insert = inserts[i];
    
    // Parse the INSERT to extract values
    const valuesMatch = insert.match(/VALUES\s*\(([\s\S]+)\)/);
    if (!valuesMatch) continue;
    
    const valuesStr = valuesMatch[1];
    
    // Split by '),(' to get individual rows
    const rows = valuesStr.split(/\),\s*\(/);
    
    for (const row of rows) {
      const cleanRow = row.replace(/^\(/, '').replace(/\)$/, '');
      const values = cleanRow.split(/,\s*(?=(?:[^']*'[^']*')*[^']*$)/);
      
      if (values.length >= 4) {
        const categoryId = values[0].replace(/'/g, '');
        const name = values[1].replace(/'/g, '');
        const description = values[2].replace(/'/g, '');
        const duration = parseInt(values[3]);
        
        try {
          const { error } = await supabase
            .from('services')
            .insert({
              category_id: categoryId,
              name: name,
              description: description,
              base_duration_minutes: duration
            });
          
          if (error) {
            if (error.code === '23505') {
              // Duplicate key - service already exists
              console.log(`   ⏭️  Skipped (exists): ${name}`);
            } else {
              console.error(`   ❌ Error adding ${name}:`, error.message);
              errorCount++;
            }
          } else {
            console.log(`   ✅ Added: ${name}`);
            successCount++;
          }
        } catch (err) {
          console.error(`   ❌ Exception adding ${name}:`, err.message);
          errorCount++;
        }
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully added: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`\n🎉 Comprehensive services migration completed!`);
}

runComprehensiveServices().catch(console.error);

