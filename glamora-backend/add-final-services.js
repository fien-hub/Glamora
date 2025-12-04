const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const services = [
  // Body Treatments (category: 550e8400-e29b-41d4-a716-446655440009)
  { category_id: '550e8400-e29b-41d4-a716-446655440009', name: 'Body Scrub/Exfoliation', description: 'Full body exfoliation treatment', duration: 60 },
  { category_id: '550e8400-e29b-41d4-a716-446655440009', name: 'Body Wrap', description: 'Detoxifying body wrap', duration: 75 },
  { category_id: '550e8400-e29b-41d4-a716-446655440009', name: 'Spray Tan', description: 'Professional spray tan application', duration: 30 },
  { category_id: '550e8400-e29b-41d4-a716-446655440009', name: 'Self-Tanner Application', description: 'Self-tanner application service', duration: 45 },
  { category_id: '550e8400-e29b-41d4-a716-446655440009', name: 'Cellulite Treatment', description: 'Cellulite reduction treatment', duration: 60 },
  { category_id: '550e8400-e29b-41d4-a716-446655440009', name: 'Body Contouring', description: 'Non-invasive body contouring', duration: 90 },
  { category_id: '550e8400-e29b-41d4-a716-446655440009', name: 'Lymphatic Drainage Massage', description: 'Lymphatic drainage therapy', duration: 75 },
  { category_id: '550e8400-e29b-41d4-a716-446655440009', name: 'Sauna Session', description: 'Infrared or traditional sauna', duration: 45 },
  
  // Permanent Makeup (category: 550e8400-e29b-41d4-a716-446655440010)
  { category_id: '550e8400-e29b-41d4-a716-446655440010', name: 'Microblading - Full', description: 'Full microblading service', duration: 180 },
  { category_id: '550e8400-e29b-41d4-a716-446655440010', name: 'Ombre Powder Brows - Full', description: 'Full ombre powder brows', duration: 180 },
  { category_id: '550e8400-e29b-41d4-a716-446655440010', name: 'Lip Blushing', description: 'Semi-permanent lip color', duration: 150 },
  { category_id: '550e8400-e29b-41d4-a716-446655440010', name: 'Eyeliner Tattoo', description: 'Permanent eyeliner', duration: 120 },
  { category_id: '550e8400-e29b-41d4-a716-446655440010', name: 'Beauty Mark Tattoo', description: 'Permanent beauty mark', duration: 30 },
  { category_id: '550e8400-e29b-41d4-a716-446655440010', name: 'Permanent Makeup Touch-Up', description: 'Touch-up for existing PMU', duration: 90 },
  
  // Specialty Services (category: 550e8400-e29b-41d4-a716-446655440011)
  { category_id: '550e8400-e29b-41d4-a716-446655440011', name: 'Henna Tattoo', description: 'Temporary henna body art', duration: 60 },
  { category_id: '550e8400-e29b-41d4-a716-446655440011', name: 'Henna Hair Treatment', description: 'Natural henna hair coloring', duration: 120 },
  { category_id: '550e8400-e29b-41d4-a716-446655440011', name: 'Threading - Face', description: 'Full face threading', duration: 30 },
  { category_id: '550e8400-e29b-41d4-a716-446655440011', name: 'Threading - Eyebrows', description: 'Eyebrow threading', duration: 15 },
  { category_id: '550e8400-e29b-41d4-a716-446655440011', name: 'Ear Piercing', description: 'Professional ear piercing', duration: 20 },
  { category_id: '550e8400-e29b-41d4-a716-446655440011', name: 'Teeth Whitening', description: 'Professional teeth whitening', duration: 60 },
  { category_id: '550e8400-e29b-41d4-a716-446655440011', name: 'Makeup Airbrush Tanning', description: 'Airbrush body makeup/tan', duration: 45 },
  { category_id: '550e8400-e29b-41d4-a716-446655440011', name: 'Bridal Party Package', description: 'Group bridal party services', duration: 240 },
];

async function addServices() {
  console.log('🚀 Adding final batch of services...\n');
  
  let added = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const service of services) {
    try {
      const { error } = await supabase
        .from('services')
        .insert({
          category_id: service.category_id,
          name: service.name,
          description: service.description,
          base_duration_minutes: service.duration
        });
      
      if (error) {
        if (error.code === '23505') {
          console.log(`   ⏭️  Skipped: ${service.name}`);
          skipped++;
        } else {
          console.error(`   ❌ Error: ${service.name} - ${error.message}`);
          errors++;
        }
      } else {
        console.log(`   ✅ Added: ${service.name}`);
        added++;
      }
    } catch (err) {
      console.error(`   ❌ Exception: ${service.name} - ${err.message}`);
      errors++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Added: ${added}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`\n🎉 All services added!`);
}

addServices().catch(console.error);

