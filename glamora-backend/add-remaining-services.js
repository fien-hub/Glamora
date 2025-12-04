const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const services = [
  // Nails
  { category_id: '550e8400-e29b-41d4-a716-446655440001', name: 'Dip Powder Manicure', description: 'Long-lasting dip powder nails', duration: 75 },
  { category_id: '550e8400-e29b-41d4-a716-446655440001', name: 'Shellac Manicure', description: 'Shellac gel polish manicure', duration: 60 },
  { category_id: '550e8400-e29b-41d4-a716-446655440001', name: 'French Manicure', description: 'Classic French tip manicure', duration: 60 },
  { category_id: '550e8400-e29b-41d4-a716-446655440001', name: 'Paraffin Manicure', description: 'Manicure with paraffin wax treatment', duration: 60 },
  { category_id: '550e8400-e29b-41d4-a716-446655440001', name: 'Spa Pedicure', description: 'Luxury spa pedicure with massage', duration: 90 },
  { category_id: '550e8400-e29b-41d4-a716-446655440001', name: 'Medical Pedicure', description: 'Therapeutic pedicure for foot health', duration: 75 },
  { category_id: '550e8400-e29b-41d4-a716-446655440001', name: 'French Pedicure', description: 'Classic French tip pedicure', duration: 75 },
  { category_id: '550e8400-e29b-41d4-a716-446655440001', name: 'Paraffin Pedicure', description: 'Pedicure with paraffin wax treatment', duration: 75 },
  { category_id: '550e8400-e29b-41d4-a716-446655440001', name: 'Nail Removal', description: 'Gel or acrylic nail removal', duration: 30 },
  { category_id: '550e8400-e29b-41d4-a716-446655440001', name: 'Nail Extensions', description: 'Nail length extensions', duration: 90 },
  
  // Hair
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Childrens Haircut', description: 'Haircut for children under 12', duration: 30 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Bang/Fringe Trim', description: 'Quick bang or fringe trim', duration: 15 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Hair Extensions Application', description: 'Professional hair extensions install', duration: 180 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Hair Extensions Removal', description: 'Safe hair extensions removal', duration: 60 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Root Touch-Up', description: 'Root color touch-up service', duration: 90 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Highlights - Partial', description: 'Partial highlights', duration: 120 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Highlights - Full', description: 'Full head highlights', duration: 180 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Ombre', description: 'Ombre hair coloring', duration: 180 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Color Correction', description: 'Fix previous color mistakes', duration: 240 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Toner Application', description: 'Hair toner application', duration: 30 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Gray Coverage', description: 'Full gray hair coverage', duration: 120 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Keratin Treatment', description: 'Smoothing keratin treatment', duration: 180 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Hair Botox', description: 'Deep repair hair botox treatment', duration: 120 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Scalp Treatment', description: 'Therapeutic scalp treatment', duration: 45 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Olaplex Treatment', description: 'Bond-building Olaplex treatment', duration: 45 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Perm', description: 'Permanent wave or curl', duration: 150 },
  { category_id: '550e8400-e29b-41d4-a716-446655440002', name: 'Relaxer/Straightening', description: 'Chemical hair straightening', duration: 150 },
  
  // Lashes & Brows
  { category_id: '550e8400-e29b-41d4-a716-446655440008', name: 'Classic Lash Extensions', description: 'Classic individual lash extensions', duration: 120 },
  { category_id: '550e8400-e29b-41d4-a716-446655440008', name: 'Volume Lash Extensions', description: 'Volume lash extensions', duration: 150 },
  { category_id: '550e8400-e29b-41d4-a716-446655440008', name: 'Hybrid Lash Extensions', description: 'Hybrid classic and volume lashes', duration: 135 },
  { category_id: '550e8400-e29b-41d4-a716-446655440008', name: 'Lash Fill', description: 'Lash extension fill/refill', duration: 75 },
  { category_id: '550e8400-e29b-41d4-a716-446655440008', name: 'Lash Lift', description: 'Natural lash lift and curl', duration: 60 },
  { category_id: '550e8400-e29b-41d4-a716-446655440008', name: 'Lash Tint', description: 'Eyelash tinting', duration: 30 },
  { category_id: '550e8400-e29b-41d4-a716-446655440008', name: 'Lash Removal', description: 'Safe lash extension removal', duration: 45 },
  { category_id: '550e8400-e29b-41d4-a716-446655440008', name: 'Eyebrow Tint', description: 'Eyebrow tinting service', duration: 20 },
  { category_id: '550e8400-e29b-41d4-a716-446655440008', name: 'Eyebrow Lamination', description: 'Brow lamination and shaping', duration: 45 },
  { category_id: '550e8400-e29b-41d4-a716-446655440008', name: 'Microblading', description: 'Semi-permanent eyebrow tattooing', duration: 150 },
  { category_id: '550e8400-e29b-41d4-a716-446655440008', name: 'Ombre Powder Brows', description: 'Powder ombre brow tattoo', duration: 150 },
  { category_id: '550e8400-e29b-41d4-a716-446655440008', name: 'Brow Mapping', description: 'Professional brow shape mapping', duration: 30 },
];

async function addServices() {
  console.log('🚀 Adding remaining services...\n');
  
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
  console.log(`\n🎉 Done!`);
}

addServices().catch(console.error);

