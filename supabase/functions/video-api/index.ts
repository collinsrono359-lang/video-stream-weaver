const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.in.projectsegfau.lt',
];

async function fetchWithFallback(path: string): Promise<Response> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}${path}`, {
        headers: { 'User-Agent': 'VideoApp/1.0' },
      });
      if (res.ok) return res;
    } catch {
      continue;
    }
  }
  throw new Error('All API instances failed');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    let data: unknown;

    switch (action) {
      case 'trending': {
        const region = url.searchParams.get('region') || 'US';
        const res = await fetchWithFallback(`/trending?region=${region}`);
        data = await res.json();
        break;
      }

      case 'search': {
        const query = url.searchParams.get('q');
        const filter = url.searchParams.get('filter') || 'videos';
        const nextpage = url.searchParams.get('nextpage');
        if (!query) {
          return new Response(JSON.stringify({ error: 'Query required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const path = nextpage
          ? `/nextpage/search?q=${encodeURIComponent(query)}&filter=${filter}&nextpage=${encodeURIComponent(nextpage)}`
          : `/search?q=${encodeURIComponent(query)}&filter=${filter}`;
        const res = await fetchWithFallback(path);
        data = await res.json();
        break;
      }

      case 'stream': {
        const videoId = url.searchParams.get('videoId');
        if (!videoId) {
          return new Response(JSON.stringify({ error: 'videoId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const res = await fetchWithFallback(`/streams/${videoId}`);
        data = await res.json();
        break;
      }

      case 'channel': {
        const channelId = url.searchParams.get('channelId');
        if (!channelId) {
          return new Response(JSON.stringify({ error: 'channelId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const res = await fetchWithFallback(`/channel/${channelId}`);
        data = await res.json();
        break;
      }

      case 'suggestions': {
        const query = url.searchParams.get('q');
        if (!query) {
          return new Response(JSON.stringify({ error: 'Query required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const res = await fetchWithFallback(`/suggestions?query=${encodeURIComponent(query)}`);
        data = await res.json();
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action. Use: trending, search, stream, channel, suggestions' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Video API error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
