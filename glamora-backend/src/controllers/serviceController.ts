import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

export const getCategories = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .order('name');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ categories: data });
  } catch (error: any) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getServices = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.query;

    let query = supabase
      .from('services')
      .select('*, category:service_categories(*)');

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query.order('name');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ services: data });
  } catch (error: any) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

