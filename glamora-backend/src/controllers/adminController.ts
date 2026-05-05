import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { notifyAdminsNewCustomService } from '../utils/pushNotifications';

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';

// Service-role client (server-side only)
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

/**
 * GET /api/admin/read-flips
 * Query params:
 *  - since (string interval, e.g. '7 days') OR sinceDays (number)
 *  - receiverId (uuid)
 *  - messageId (uuid)
 */
export async function listReadFlips(req: Request, res: Response) {
  try {
    const { since, sinceDays, receiverId, messageId } = req.query as Record<string, string | undefined>;

    // Choose interval string: since (string) takes precedence, else sinceDays, else default 30 days
    let intervalStr = '30 days';
    if (since && since.trim().length > 0) {
      intervalStr = since.trim();
    } else if (sinceDays) {
      const n = parseInt(sinceDays, 10);
      if (!Number.isNaN(n) && n > 0 && n <= 3650) {
        intervalStr = `${n} days`;
      }
    }

    const params: any = {
      p_since: intervalStr,
      p_receiver_id: receiverId || null,
      p_message_id: messageId || null,
    };

    const { data, error } = await supabaseAdmin.rpc('admin_list_read_flips', params);
    if (error) {
      console.error('admin_list_read_flips RPC error:', error);
      return res.status(500).json({ error: 'Failed to fetch read flips', details: error.message });
    }

    return res.status(200).json({
      ok: true,
      count: Array.isArray(data) ? data.length : 0,
      data: data || [],
      interval: intervalStr,
      filters: { receiverId: receiverId || null, messageId: messageId || null },
    });
  } catch (err: any) {
    console.error('listReadFlips handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ------------------------------
// Internal webhook — called by Supabase DB trigger
// ------------------------------

export async function customServiceAlert(req: Request, res: Response) {
  try {
    const secret = req.headers['x-internal-secret'];
    const expected = process.env.INTERNAL_WEBHOOK_SECRET;

    if (!expected || secret !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { serviceId, serviceName, providerName } = req.body as {
      serviceId?: string;
      serviceName?: string;
      providerName?: string;
    };

    if (!serviceId || !serviceName) {
      return res.status(400).json({ error: 'serviceId and serviceName are required' });
    }

    await notifyAdminsNewCustomService(
      serviceName,
      providerName || 'A provider',
      serviceId
    );

    return res.json({ ok: true });
  } catch (err: any) {
    console.error('customServiceAlert error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ------------------------------
// Custom Services Moderation
// ------------------------------

export async function listCustomServices(req: Request, res: Response) {
  try {
    const { status = 'pending' } = req.query as { status?: string };
    const valid = ['pending', 'approved', 'rejected'];
    const statusFilter = valid.includes(String(status)) ? String(status) : 'pending';

    const { data, error } = await supabaseAdmin
      .from('provider_services')
      .select(`
        id,
        provider_id,
        custom_service_name,
        description,
        price,
        duration_minutes,
        custom_service_status,
        custom_service_rejection_reason,
        custom_service_reviewed_at,
        custom_service_reviewed_by,
        created_at,
        profiles:profiles!provider_id(full_name,email),
        provider_profiles:provider_profiles!provider_id(business_name)
      `)
      .not('custom_service_name', 'is', null)
      .eq('custom_service_status', statusFilter)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ services: data });
  } catch (err: any) {
    console.error('listCustomServices error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function approveCustomService(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.rpc('approve_custom_service', { service_id: id });
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('approveCustomService error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function rejectCustomService(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    const { error } = await supabaseAdmin.rpc('reject_custom_service', { service_id: id, rejection_reason: reason || null });
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('rejectCustomService error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ------------------------------
// Providers Management (Admin)
// ------------------------------

export async function searchProvidersAdmin(req: Request, res: Response) {
  try {
    const { q, verified, identityStatus } = req.query as { q?: string; verified?: string; identityStatus?: string };
    let query = supabaseAdmin
      .from('provider_profiles')
      .select(`
        *,
        profile:profiles(*),
        services:provider_services(count)
      `);

    if (verified === 'true') query = query.eq('is_verified', true);
    if (verified === 'false') query = query.eq('is_verified', false);
    if (identityStatus && ['pending', 'under_review', 'approved', 'rejected'].includes(identityStatus)) {
      query = query.eq('identity_verification_status', identityStatus);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });

    let activeProviders = data || [];
    const userIds = Array.from(
      new Set(
        activeProviders
          .map((provider: any) => provider?.profile?.user_id)
          .filter((id: any) => typeof id === 'string' && id.length > 0)
      )
    );

    if (userIds.length > 0) {
      const { data: activeUsers, error: activeUsersError } = await supabaseAdmin
        .from('users')
        .select('id')
        .in('id', userIds)
        .eq('is_active', true);

      if (!activeUsersError) {
        const activeUserIds = new Set((activeUsers || []).map((row: any) => row.id));
        activeProviders = activeProviders.filter((provider: any) => {
          const userId = provider?.profile?.user_id;
          return !!userId && activeUserIds.has(userId);
        });
      } else {
        console.warn('searchProvidersAdmin active-user filter failed:', activeUsersError.message);
      }
    }

    const term = (q || '').trim().toLowerCase();
    const filtered = term
      ? activeProviders?.filter((p: any) =>
          (p.business_name || '').toLowerCase().includes(term) ||
          (p.profile?.full_name || '').toLowerCase().includes(term) ||
          (p.profile?.email || '').toLowerCase().includes(term)
        )
      : activeProviders;
    return res.json({ providers: filtered });
  } catch (err: any) {
    console.error('searchProvidersAdmin error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProviderAdmin(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('provider_profiles')
      .select(`
        *,
        profile:profiles(*),
        services:provider_services(*, service:services(*))
      `)
      .eq('id', id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Provider not found' });
    return res.json({ provider: data });
  } catch (err: any) {
    console.error('getProviderAdmin error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyProvider(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { verified } = req.body as { verified?: boolean };
    const { data, error } = await supabaseAdmin
      .from('provider_profiles')
      .update({ is_verified: !!verified })
      .eq('id', id)
      .select('id,is_verified')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ provider: data });
  } catch (err: any) {
    console.error('verifyProvider error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function approveProviderIdentity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { notes } = req.body as { notes?: string };

    const { data, error } = await supabaseAdmin
      .from('provider_profiles')
      .update({
        identity_verification_status: 'approved',
        identity_verified_at: new Date().toISOString(),
        identity_verification_notes: notes || null,
        is_verified: true,
      })
      .eq('id', id)
      .select('id,is_verified,identity_verification_status,identity_verified_at,identity_verification_notes')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ provider: data });
  } catch (err: any) {
    console.error('approveProviderIdentity error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function rejectProviderIdentity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };

    const { data, error } = await supabaseAdmin
      .from('provider_profiles')
      .update({
        identity_verification_status: 'rejected',
        identity_verified_at: null,
        identity_verification_notes: reason || null,
        is_verified: false,
      })
      .eq('id', id)
      .select('id,is_verified,identity_verification_status,identity_verified_at,identity_verification_notes')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ provider: data });
  } catch (err: any) {
    console.error('rejectProviderIdentity error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function suspendProvider(req: Request, res: Response) {
  try {
    const { id } = req.params;
    // Soft-suspend by disabling all services for this provider
    const { error } = await supabaseAdmin
      .from('provider_services')
      .update({ is_active: false })
      .eq('provider_id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('suspendProvider error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ------------------------------
// Services to Add (suggestions)
// ------------------------------

export async function listServicesToAdd(req: Request, res: Response) {
  try {
    const { minProviders = '3' } = req.query as { minProviders?: string };
    const threshold = Math.max(1, parseInt(String(minProviders), 10) || 3);

    const { data, error } = await supabaseAdmin
      .from('provider_services')
      .select('custom_service_name, provider_id')
      .not('custom_service_name', 'is', null)
      .eq('custom_service_status', 'approved');

    if (error) return res.status(400).json({ error: error.message });

    const map = new Map<string, Set<string>>();
    (data || []).forEach((row: any) => {
      const name = (row.custom_service_name || '').trim();
      if (!name) return;
      if (!map.has(name)) map.set(name, new Set());
      map.get(name)!.add(row.provider_id);
    });

    const suggestions = Array.from(map.entries())
      .map(([name, providers]) => ({ name, providers: providers.size }))
      .filter((x) => x.providers >= threshold)
      .sort((a, b) => b.providers - a.providers);

    return res.json({ suggestions, minProviders: threshold });
  } catch (err: any) {
    console.error('listServicesToAdd error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ------------------------------
// Analytics Summary
// ------------------------------

export async function analyticsSummary(req: Request, res: Response) {
  try {
    const { sinceDays = '30' } = req.query as { sinceDays?: string };
    const n = Math.max(1, parseInt(String(sinceDays), 10) || 30);
    const since = new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

    const [bookingsAll, bookingsCompleted, providersAll, providersVerified, customersAll] = await Promise.all([
      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).gte('created_at', since),
      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).gte('created_at', since).eq('status', 'completed'),
      supabaseAdmin.from('provider_profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('provider_profiles').select('id', { count: 'exact', head: true }).eq('is_verified', true),
      supabaseAdmin.from('customer_profiles').select('id', { count: 'exact', head: true }),
    ]);

    const result = {
      sinceDays: n,
      bookings: {
        total_since: bookingsAll.count || 0,
        completed_since: bookingsCompleted.count || 0,
      },
      providers: {
        total: providersAll.count || 0,
        verified: providersVerified.count || 0,
      },
      customers: {
        total: customersAll.count || 0,
      },
    };

    return res.json(result);
  } catch (err: any) {
    console.error('analyticsSummary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ------------------------------
// Settings (roles, CORS view)
// ------------------------------

export async function listUsers(req: Request, res: Response) {
  try {
    const { role, q } = req.query as { role?: string; q?: string };
    let query = supabaseAdmin.from('users').select('*');
    if (role) query = query.eq('role', role);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    const term = (q || '').trim().toLowerCase();
    const filtered = term ? data?.filter((u: any) => (u.email || '').toLowerCase().includes(term)) : data;
    return res.json({ users: filtered });
  } catch (err: any) {
    console.error('listUsers error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function setUserRole(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { role } = req.body as { role?: 'admin' | 'provider' | 'customer' };
    if (!role || !['admin', 'provider', 'customer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', id)
      .select('id,email,role')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ user: data });
  } catch (err: any) {
    console.error('setUserRole error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSettings(req: Request, res: Response) {
  try {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    return res.json({ allowedOrigins });
  } catch (err: any) {
    console.error('getSettings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
