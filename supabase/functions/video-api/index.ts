const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://watchapi.whatever.social',
  'https://pipedapi.in.projectsegfau.lt',
];

async function fetchWithFallback(path: string): Promise<any> {
  let lastError = '';
  for (const instance of PIPED_INSTANCES) {
    try {
      console.log(`Trying ${instance}${path}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${instance}${path}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        lastError = `${instance} returned ${res.status}`;
        continue;
      }
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        lastError = `${instance} returned non-JSON`;
        continue;
      }
    } catch (e) {
      lastError = `${instance} failed: ${e instanceof Error ? e.message : 'unknown'}`;
      continue;
    }
  }
  throw new Error(`All API instances failed. Last error: ${lastError}`);
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
        data = await fetchWithFallback(`/trending?region=${region}`);
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
        data = await fetchWithFallback(path);
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
        data = await fetchWithFallback(`/streams/${videoId}`);
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
        data = await fetchWithFallback(`/channel/${channelId}`);
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
        data = await fetchWithFallback(`/suggestions?query=${encodeURIComponent(query)}`);
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
