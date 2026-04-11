const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const YT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function extractInitialData(html: string): any {
  const match = html.match(/var ytInitialData = ({.*?});<\/script>/s);
  if (match) {
    try { return JSON.parse(match[1]); } catch {}
  }
  const match2 = html.match(/ytInitialData\s*=\s*({.*?});\s*(?:window|var)/s);
  if (match2) {
    try { return JSON.parse(match2[1]); } catch {}
  }
  return null;
}

function extractVideoRenderer(renderer: any) {
  if (!renderer) return null;
  const videoId = renderer.videoId;
  if (!videoId) return null;

  const title = renderer.title?.runs?.[0]?.text || renderer.title?.simpleText || '';
  const thumbnail = renderer.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const channelName = renderer.ownerText?.runs?.[0]?.text ||
    renderer.shortBylineText?.runs?.[0]?.text ||
    renderer.longBylineText?.runs?.[0]?.text || '';
  const channelId = renderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
    renderer.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
  const channelThumb = renderer.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails?.[0]?.url || '';
  const viewText = renderer.viewCountText?.simpleText || renderer.viewCountText?.runs?.map((r: any) => r.text).join('') || '0 views';
  const views = parseInt(viewText.replace(/[^0-9]/g, '')) || 0;
  const publishedText = renderer.publishedTimeText?.simpleText || renderer.publishedTimeText?.runs?.[0]?.text || '';
  const lengthText = renderer.lengthText?.simpleText || '0:00';
  const parts = lengthText.split(':').map(Number);
  let duration = 0;
  if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (parts.length === 2) duration = parts[0] * 60 + parts[1];

  return {
    url: `/watch?v=${videoId}`,
    title,
    thumbnail,
    uploaderName: channelName,
    uploaderUrl: `/channel/${channelId}`,
    uploaderAvatar: channelThumb,
    uploadedDate: publishedText,
    duration,
    views,
    type: 'stream',
  };
}

async function fetchYouTubePage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { headers: YT_HEADERS, signal: controller.signal });
    clearTimeout(timeout);
    return await res.text();
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
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
        const html = await fetchYouTubePage(`https://www.youtube.com/feed/trending?gl=${region}`);
        const ytData = extractInitialData(html);
        if (!ytData) throw new Error('Failed to extract data');

        const videos: any[] = [];
        const tabs = ytData?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
        for (const tab of tabs) {
          const sections = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];
          for (const section of sections) {
            const items = section?.itemSectionRenderer?.contents || [];
            for (const item of items) {
              const shelf = item?.shelfRenderer?.content?.expandedShelfContentsRenderer?.items || [];
              for (const vi of shelf) {
                const v = extractVideoRenderer(vi.videoRenderer);
                if (v) videos.push(v);
              }
            }
          }
        }
        data = videos;
        break;
      }

      case 'search': {
        const query = url.searchParams.get('q');
        const page = url.searchParams.get('page') || '1';
        if (!query) {
          return new Response(JSON.stringify({ error: 'Query required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const html = await fetchYouTubePage(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`
        );
        const ytData = extractInitialData(html);
        if (!ytData) throw new Error('Failed to extract search data');

        const videos: any[] = [];
        const contents = ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents || [];
        for (const section of contents) {
          const items = section?.itemSectionRenderer?.contents || [];
          for (const item of items) {
            const v = extractVideoRenderer(item.videoRenderer);
            if (v) videos.push(v);
          }
        }

        data = { items: videos, nextpage: String(parseInt(page) + 1) };
        break;
      }

      case 'stream': {
        const videoId = url.searchParams.get('videoId');
        if (!videoId) {
          return new Response(JSON.stringify({ error: 'videoId required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const html = await fetchYouTubePage(`https://www.youtube.com/watch?v=${videoId}`);
        const ytData = extractInitialData(html);

        // Extract player data
        const playerMatch = html.match(/var ytInitialPlayerResponse = ({.*?});<\/script>/s) ||
          html.match(/ytInitialPlayerResponse\s*=\s*({.*?});\s*(?:var|window)/s);
        let playerData: any = null;
        if (playerMatch) {
          try { playerData = JSON.parse(playerMatch[1]); } catch {}
        }

        const videoDetails = playerData?.videoDetails || {};
        const microformat = playerData?.microformat?.playerMicroformatRenderer || {};

        // Get related videos
        const relatedVideos: any[] = [];
        const secondaryResults = ytData?.contents?.twoColumnWatchNextResults?.secondaryResults
          ?.secondaryResults?.results || [];
        for (const item of secondaryResults) {
          const renderer = item.compactVideoRenderer;
          if (renderer) {
            const v = extractVideoRenderer(renderer);
            if (v) relatedVideos.push(v);
          }
        }

        // Get streaming data - use embed URL as primary source (no watermark)
        const streamingData = playerData?.streamingData || {};

        data = {
          title: videoDetails.title || '',
          description: videoDetails.shortDescription || '',
          uploadDate: microformat.publishDate || '',
          uploader: videoDetails.author || '',
          uploaderUrl: `/channel/${videoDetails.channelId || ''}`,
          uploaderAvatar: '',
          views: parseInt(videoDetails.viewCount) || 0,
          likes: 0,
          dislikes: 0,
          duration: parseInt(videoDetails.lengthSeconds) || 0,
          hls: streamingData.hlsManifestUrl || '',
          videoStreams: (streamingData.formats || []).map((f: any) => ({
            url: f.url || '',
            quality: f.qualityLabel || f.quality || '',
            mimeType: f.mimeType || '',
            width: f.width || 0,
            height: f.height || 0,
            fps: f.fps || 30,
            videoOnly: false,
          })),
          audioStreams: (streamingData.adaptiveFormats || [])
            .filter((f: any) => f.mimeType?.startsWith('audio/'))
            .map((f: any) => ({
              url: f.url || '',
              quality: f.audioQuality || '',
              mimeType: f.mimeType || '',
              bitrate: f.bitrate || 0,
            })),
          relatedStreams: relatedVideos,
          subtitles: [],
          // Provide embed URL as a reliable playback method
          embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
        };
        break;
      }

      case 'suggestions': {
        const query = url.searchParams.get('q');
        if (!query) {
          return new Response(JSON.stringify({ error: 'Query required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(
          `https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&q=${encodeURIComponent(query)}&ds=yt`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        const text = await res.text();
        // Parse JSONP response
        const match = text.match(/\[.*\]/s);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            data = (parsed[1] || []).map((s: any) => s[0]);
          } catch {
            data = [];
          }
        } else {
          data = [];
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: trending, search, stream, suggestions' }),
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
