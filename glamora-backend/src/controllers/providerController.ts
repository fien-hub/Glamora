import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

export const searchProviders = async (req: Request, res: Response) => {
  try {
    const { serviceId, latitude, longitude, radius = 50 } = req.query;

    let query = supabase
      .from('provider_profiles')
      .select(`
        *,
        profile:profiles!inner(*),
        provider_services(*, service:services(*))
      `)
      .eq('is_verified', true);

    const { data, error } = await query.order('rating', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Filter by service if provided
    let filteredData = data;
    if (serviceId) {
      filteredData = data.filter((provider: any) =>
        provider.provider_services?.some((ps: any) => ps.service_id === serviceId && ps.is_active)
      );
    }

    res.json({ providers: filteredData });
  } catch (error: any) {
    console.error('Search providers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProviderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('provider_profiles')
      .select(`
        *,
        profile:profiles!inner(*),
        provider_services(*, service:services(*, category:service_categories(*))),
        portfolio:portfolio_items(*),
        reviews(*, customer:customer_profiles(profile:profiles(*)))
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({ provider: data });
  } catch (error: any) {
    console.error('Get provider error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProviderServices = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('provider_services')
      .select(`
        *,
        service:services(*, category:service_categories(*))
      `)
      .eq('provider_id', id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ services: data });
  } catch (error: any) {
    console.error('Get provider services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

