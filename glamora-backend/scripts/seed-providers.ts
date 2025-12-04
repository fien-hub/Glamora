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

const providers = [
  {
    id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    email: 'sophia.hair@glamora.com',
    firstName: 'Sophia',
    lastName: 'Martinez',
    phone: '+1-555-0101',
    avatar: 'https://i.pravatar.cc/300?img=1',
    bio: 'Professional hair stylist with 8+ years of experience. Specializing in balayage, color correction, and modern cuts.',
    businessName: 'Sophia Hair Studio',
    businessBio: 'Award-winning hair stylist specializing in color treatments and precision cuts. Certified in Balayage and Keratin treatments.',
    yearsOfExperience: 8,
    rating: 4.8,
    reviews: 127
  },
  {
    id: 'b2c3d4e5-f6a7-4b5c-8d9e-0f1a2b3c4d5e',
    email: 'emma.makeup@glamora.com',
    firstName: 'Emma',
    lastName: 'Johnson',
    phone: '+1-555-0102',
    avatar: 'https://i.pravatar.cc/300?img=5',
    bio: 'Celebrity makeup artist specializing in bridal and special occasion makeup. Featured in Vogue and Elle.',
    businessName: 'Emma Artistry',
    businessBio: 'Professional makeup artist with expertise in bridal, editorial, and special effects makeup. MAC certified.',
    yearsOfExperience: 6,
    rating: 4.9,
    reviews: 203
  },
  {
    id: 'c3d4e5f6-a7b8-4c5d-8e9f-0a1b2c3d4e5f',
    email: 'olivia.nails@glamora.com',
    firstName: 'Olivia',
    lastName: 'Chen',
    phone: '+1-555-0103',
    avatar: 'https://i.pravatar.cc/300?img=9',
    bio: 'Expert nail technician specializing in gel extensions, nail art, and luxury manicures.',
    businessName: 'Olivia Nail Bar',
    businessBio: 'Certified nail technician with expertise in gel extensions, acrylic nails, and intricate nail art designs.',
    yearsOfExperience: 5,
    rating: 4.7,
    reviews: 156
  },
  {
    id: 'd4e5f6a7-b8c9-4d5e-8f9a-0b1c2d3e4f5a',
    email: 'maya.spa@glamora.com',
    firstName: 'Maya',
    lastName: 'Patel',
    phone: '+1-555-0104',
    avatar: 'https://i.pravatar.cc/300?img=16',
    bio: 'Licensed massage therapist specializing in deep tissue, Swedish, and hot stone massage.',
    businessName: 'Maya Wellness Spa',
    businessBio: 'Licensed massage therapist and spa specialist. Certified in aromatherapy and reflexology.',
    yearsOfExperience: 10,
    rating: 4.9,
    reviews: 289
  },
  {
    id: 'e5f6a7b8-c9d0-4e5f-8a9b-0c1d2e3f4a5b',
    email: 'ava.skincare@glamora.com',
    firstName: 'Ava',
    lastName: 'Williams',
    phone: '+1-555-0105',
    avatar: 'https://i.pravatar.cc/300?img=20',
    bio: 'Licensed esthetician specializing in anti-aging treatments, chemical peels, and microdermabrasion.',
    businessName: 'Ava Skin Studio',
    businessBio: 'Licensed esthetician with advanced training in medical-grade skincare and anti-aging treatments.',
    yearsOfExperience: 7,
    rating: 4.8,
    reviews: 178
  },
  {
    id: 'f6a7b8c9-d0e1-4f5a-8b9c-0d1e2f3a4b5c',
    email: 'isabella.wax@glamora.com',
    firstName: 'Isabella',
    lastName: 'Rodriguez',
    phone: '+1-555-0106',
    avatar: 'https://i.pravatar.cc/300?img=24',
    bio: 'Expert in Brazilian waxing and full body waxing services. Gentle techniques for sensitive skin.',
    businessName: 'Isabella Wax Studio',
    businessBio: 'Certified waxing specialist with expertise in Brazilian, European, and full body waxing.',
    yearsOfExperience: 4,
    rating: 4.6,
    reviews: 142
  },
  {
    id: 'a7b8c9d0-e1f2-4a5b-8c9d-0e1f2a3b4c5e',
    email: 'mia.hair@glamora.com',
    firstName: 'Mia',
    lastName: 'Thompson',
    phone: '+1-555-0107',
    avatar: 'https://i.pravatar.cc/300?img=28',
    bio: 'Curly hair specialist and natural hair expert. Certified in DevaCut and Ouidad techniques.',
    businessName: 'Mia Curls & Cuts',
    businessBio: 'Specialist in curly and textured hair. Expert in natural hair care and protective styling.',
    yearsOfExperience: 9,
    rating: 4.9,
    reviews: 234
  },
  {
    id: 'b8c9d0e1-f2a3-4b5c-8d9e-0f1a2b3c4d5f',
    email: 'charlotte.makeup@glamora.com',
    firstName: 'Charlotte',
    lastName: 'Lee',
    phone: '+1-555-0108',
    avatar: 'https://i.pravatar.cc/300?img=32',
    bio: 'Airbrush makeup specialist for weddings and photoshoots. Trained in HD and editorial makeup.',
    businessName: 'Charlotte Glam',
    businessBio: 'Professional makeup artist specializing in airbrush techniques and long-lasting makeup for special events.',
    yearsOfExperience: 5,
    rating: 4.7,
    reviews: 167
  },
  {
    id: 'c9d0e1f2-a3b4-4c5d-8e9f-0a1b2c3d4e5a',
    email: 'amelia.nails@glamora.com',
    firstName: 'Amelia',
    lastName: 'Garcia',
    phone: '+1-555-0109',
    avatar: 'https://i.pravatar.cc/300?img=36',
    bio: 'Luxury nail artist specializing in 3D nail art, Swarovski crystals, and custom designs.',
    businessName: 'Amelia Luxury Nails',
    businessBio: 'Award-winning nail artist known for intricate designs and luxury nail treatments.',
    yearsOfExperience: 6,
    rating: 4.8,
    reviews: 198
  },
  {
    id: 'd0e1f2a3-b4c5-4d5e-8f9a-0b1c2d3e4f5b',
    email: 'harper.beauty@glamora.com',
    firstName: 'Harper',
    lastName: 'Davis',
    phone: '+1-555-0110',
    avatar: 'https://i.pravatar.cc/300?img=40',
    bio: 'Multi-talented beauty professional offering hair, makeup, and skincare services.',
    businessName: 'Harper Beauty Collective',
    businessBio: 'Full-service beauty professional with expertise in hair styling, makeup artistry, and skincare.',
    yearsOfExperience: 12,
    rating: 4.9,
    reviews: 312
  }
];

async function seedProviders() {
  console.log('🌱 Starting provider seed process...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const provider of providers) {
    try {
      console.log(`📝 Creating provider: ${provider.firstName} ${provider.lastName} (${provider.email})`);

      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: provider.email,
        password: 'Provider123!',
        email_confirm: true,
        user_metadata: {
          first_name: provider.firstName,
          last_name: provider.lastName
        }
      });

      if (authError) {
        console.error(`  ❌ Auth error: ${authError.message}`);
        errorCount++;
        continue;
      }

      console.log(`  ✅ Auth user created with ID: ${authData.user.id}`);

      // Step 2: Create users table entry
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: provider.email,
          role: 'provider'
        });

      if (userError) {
        console.error(`  ❌ Users table error: ${userError.message}`);
        errorCount++;
        continue;
      }

      console.log(`  ✅ Users table entry created`);

      // Step 3: Create profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          first_name: provider.firstName,
          last_name: provider.lastName,
          phone: provider.phone,
          avatar_url: provider.avatar,
          bio: provider.bio
        })
        .select()
        .single();

      if (profileError) {
        console.error(`  ❌ Profile error: ${profileError.message}`);
        errorCount++;
        continue;
      }

      console.log(`  ✅ Profile created with ID: ${profileData.id}`);

      // Step 4: Create provider profile
      const { error: providerProfileError } = await supabase
        .from('provider_profiles')
        .insert({
          id: profileData.id,
          business_name: provider.businessName,
          years_experience: provider.yearsOfExperience,
          is_verified: true,
          rating: provider.rating,
          total_reviews: provider.reviews,
          service_radius_km: 25,
          total_bookings: 0
        });

      if (providerProfileError) {
        console.error(`  ❌ Provider profile error: ${providerProfileError.message}`);
        errorCount++;
        continue;
      }

      console.log(`  ✅ Provider profile created`);
      console.log(`  🎉 Successfully created ${provider.businessName}\n`);
      successCount++;

    } catch (error: any) {
      console.error(`  ❌ Unexpected error: ${error.message}\n`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successfully created: ${successCount} providers`);
  console.log(`❌ Failed: ${errorCount} providers`);
  console.log('='.repeat(50) + '\n');

  if (successCount > 0) {
    console.log('🔄 Now running SQL script to add services, availability, and portfolio items...\n');
    
    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, '../supabase/seed-providers.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Extract only the parts after user creation (services, availability, portfolio)
    const relevantSQL = sqlContent.substring(sqlContent.indexOf('-- =====================================================\n-- PROVIDER SERVICES WITH PRICING'));
    
    console.log('📄 Executing SQL script...');
    console.log('⚠️  Note: This may take a minute...\n');
    
    // We'll need to execute this via Supabase SQL editor or manually
    console.log('⚠️  Please run the SQL script manually from: glamora-backend/supabase/seed-providers.sql');
    console.log('   Starting from line 190 (PROVIDER SERVICES WITH PRICING section)\n');
  }
}

// Run the seed function
seedProviders()
  .then(() => {
    console.log('✅ Seed process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed process failed:', error);
    process.exit(1);
  });

