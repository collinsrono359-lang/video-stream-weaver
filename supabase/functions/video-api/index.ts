const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.jing.rocks',
  'https://iv.ggtyler.dev',
  'https://invidious.privacyredirect.com',
];

async function fetchWithFallback(path: string): Promise<any> {
  let lastError = '';
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      console.log(`Trying ${instance}${path}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${instance}${path}`, {
        headers: { 'Accept': 'application/json' },
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
        lastError = `${instance} returned non-JSON: ${text.substring(0, 100)}`;
        continue;
      }
    } catch (e) {
      lastError = `${instance} failed: ${e instanceof Error ? e.message : 'unknown'}`;
      continue;
    }
  }
  throw new Error(`All instances failed. Last: ${lastError}`);
}

// Transform Invidious video format to our standard format
function transformVideo(v: any) {
  return {
    url: `/watch?v=${v.videoId}`,
    title: v.title || '',
    thumbnail: v.videoThumbnails?.[0]?.url || '',
    uploaderName: v.author || '',
    uploaderUrl: `/channel/${v.authorId}`,
    uploaderAvatar: v.authorThumbnails?.[0]?.url || '',
    uploadedDate: v.publishedText || '',
    duration: v.lengthSeconds || 0,
    views: v.viewCount || 0,
    type: 'stream',
  };
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
        const raw = await fetchWithFallback(`/api/v1/trending?region=${region}`);
        data = Array.isArray(raw) ? raw.map(transformVideo) : [];
        break;
      }

      case 'search': {
        const query = url.searchParams.get('q');
        const page = url.searchParams.get('page') || '1';
        if (!query) {
          return new Response(JSON.stringify({ error: 'Query required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const raw = await fetchWithFallback(
          `/api/v1/search?q=${encodeURIComponent(query)}&page=${page}&type=video`
        );
        data = {
          items: Array.isArray(raw) ? raw.map(transformVideo) : [],
          nextpage: String(parseInt(page) + 1),
        };
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
        const raw = await fetchWithFallback(`/api/v1/videos/${videoId}`);
        
        // Transform to our stream format
        data = {
          title: raw.title || '',
          description: raw.description || '',
          uploadDate: raw.publishedText || '',
          uploader: raw.author || '',
          uploaderUrl: `/channel/${raw.authorId}`,
          uploaderAvatar: raw.authorThumbnails?.[0]?.url || '',
          views: raw.viewCount || 0,
          likes: raw.likeCount || 0,
          dislikes: raw.dislikeCount || 0,
          duration: raw.lengthSeconds || 0,
          hls: raw.hlsUrl || '',
          videoStreams: (raw.formatStreams || []).map((s: any) => ({
            url: s.url,
            quality: s.qualityLabel || s.quality || '',
            mimeType: s.type || '',
            width: s.size ? parseInt(s.size.split('x')[0]) : 0,
            height: s.size ? parseInt(s.size.split('x')[1]) : 0,
            fps: 30,
            videoOnly: false,
          })),
          audioStreams: (raw.adaptiveFormats || [])
            .filter((s: any) => s.type?.startsWith('audio/'))
            .map((s: any) => ({
              url: s.url,
              quality: s.audioQuality || '',
              mimeType: s.type || '',
              bitrate: s.bitrate || 0,
            })),
          relatedStreams: (raw.recommendedVideos || []).map(transformVideo),
          subtitles: (raw.captions || []).map((c: any) => ({
            url: c.url || '',
            mimeType: 'text/vtt',
            name: c.label || '',
            code: c.language_code || '',
          })),
        };
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
        const raw = await fetchWithFallback(`/api/v1/channels/${channelId}`);
        data = raw;
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
        const raw = await fetchWithFallback(
          `/api/v1/search/suggestions?q=${encodeURIComponent(query)}`
        );
        data = raw?.suggestions || [];
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: trending, search, stream, channel, suggestions' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Video API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
