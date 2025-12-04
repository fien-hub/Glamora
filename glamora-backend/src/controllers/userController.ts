import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user and profile data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    // Get role-specific profile
    let roleProfile = null;
    if (userData.role === 'customer') {
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('id', profileData.id)
        .single();
      
      if (!error) roleProfile = data;
    } else if (userData.role === 'provider') {
      const { data, error } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('id', profileData.id)
        .single();
      
      if (!error) roleProfile = data;
    }

    res.json({
      user: userData,
      profile: { ...profileData, ...roleProfile },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const {
      firstName,
      lastName,
      phone,
      bio,
      avatarUrl,
      address,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      businessName,
      yearsExperience,
      certifications,
      serviceRadiusKm,
    } = req.body;

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    // Get profile ID
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    // Update base profile
    const profileUpdates: any = {};
    if (firstName) profileUpdates.first_name = firstName;
    if (lastName) profileUpdates.last_name = lastName;
    if (phone !== undefined) profileUpdates.phone = phone;
    if (bio !== undefined) profileUpdates.bio = bio;
    if (avatarUrl !== undefined) profileUpdates.avatar_url = avatarUrl;

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('user_id', userId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }
    }

    // Update role-specific profile
    if (userData.role === 'customer') {
      const customerUpdates: any = {};
      if (address !== undefined) customerUpdates.address = address;
      if (city !== undefined) customerUpdates.city = city;
      if (state !== undefined) customerUpdates.state = state;
      if (zipCode !== undefined) customerUpdates.zip_code = zipCode;
      if (latitude !== undefined) customerUpdates.latitude = latitude;
      if (longitude !== undefined) customerUpdates.longitude = longitude;

      if (Object.keys(customerUpdates).length > 0) {
        const { error } = await supabase
          .from('customer_profiles')
          .update(customerUpdates)
          .eq('id', profileData.id);

        if (error) {
          return res.status(400).json({ error: error.message });
        }
      }
    } else if (userData.role === 'provider') {
      const providerUpdates: any = {};
      if (businessName !== undefined) providerUpdates.business_name = businessName;
      if (yearsExperience !== undefined) providerUpdates.years_experience = yearsExperience;
      if (certifications !== undefined) providerUpdates.certifications = certifications;
      if (serviceRadiusKm !== undefined) providerUpdates.service_radius_km = serviceRadiusKm;

      if (Object.keys(providerUpdates).length > 0) {
        const { error } = await supabase
          .from('provider_profiles')
          .update(providerUpdates)
          .eq('id', profileData.id);

        if (error) {
          return res.status(400).json({ error: error.message });
        }
      }
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

