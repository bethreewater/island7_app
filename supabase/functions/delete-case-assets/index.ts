// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type CasePayload = {
  zones?: Array<{
    items?: Array<{ photos?: string[] }>;
  }>;
  logs?: Array<{
    photos?: string[];
    beforePhotos?: string[];
    afterPhotos?: string[];
  }>;
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const extractPhotoPaths = (caseData: CasePayload): string[] => {
  const urls = new Set<string>();

  (caseData.zones || []).forEach((zone) => {
    (zone.items || []).forEach((item) => {
      (item.photos || []).forEach((url) => {
        if (url) urls.add(url);
      });
    });
  });

  (caseData.logs || []).forEach((log) => {
    [...(log.photos || []), ...(log.beforePhotos || []), ...(log.afterPhotos || [])].forEach((url) => {
      if (url) urls.add(url);
    });
  });

  return Array.from(urls)
    .map((url) => {
      const marker = '/case-photos/';
      const index = url.indexOf(marker);
      return index >= 0 ? url.slice(index + marker.length) : null;
    })
    .filter((path): path is string => Boolean(path));
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const caseId = typeof body?.caseId === 'string' ? body.caseId.trim() : '';
    if (!caseId) {
      return new Response(JSON.stringify({ error: 'caseId is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { data: caseData, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('zones, logs')
      .eq('caseId', caseId)
      .single();

    if (caseError || !caseData) {
      return new Response(JSON.stringify({ error: 'Case not found', detail: caseError?.message }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const paths = extractPhotoPaths(caseData as CasePayload);
    if (paths.length === 0) {
      return new Response(JSON.stringify({ success: true, removed: 0 }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { error: removeError } = await supabaseAdmin.storage.from('case-photos').remove(paths);
    if (removeError) {
      return new Response(JSON.stringify({ error: 'Failed to remove files', detail: removeError.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, removed: paths.length }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Unexpected error', detail: (error as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
