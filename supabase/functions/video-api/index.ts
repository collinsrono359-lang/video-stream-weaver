const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const YT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function extractJsonFromHtml(html: string, varName: string): any {
  const pattern = new RegExp(`${varName}\\s*=\\s*`, 'g');
  const match = pattern.exec(html);
  if (!match) return null;

  const start = match.index + match[0].length;
  // Bracket-count based extraction for reliability
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.substring(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function parseDuration(text: string): number {
  const parts = text.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function parseViewCount(text: string): number {
  return parseInt(text.replace(/[^0-9]/g, '')) || 0;
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
  const publishedText = renderer.publishedTimeText?.simpleText || renderer.publishedTimeText?.runs?.[0]?.text || '';
  const lengthText = renderer.lengthText?.simpleText || '0:00';

  return {
    url: `/watch?v=${videoId}`,
    title,
    thumbnail,
    uploaderName: channelName,
    uploaderUrl: `/channel/${channelId}`,
    uploaderAvatar: channelThumb,
    uploadedDate: publishedText,
    duration: parseDuration(lengthText),
    views: parseViewCount(viewText),
    type: 'stream',
  };
}

function extractLockupViewModel(lvm: any) {
  if (!lvm) return null;
  const videoId = lvm.contentId;
  if (!videoId) return null;

  const meta = lvm.metadata?.lockupMetadataViewModel || {};
  const title = meta.title?.content || '';
  const thumbnail = lvm.contentImage?.thumbnailViewModel?.image?.sources?.slice(-1)[0]?.url ||
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  // Extract metadata parts (channel, views, date)
  const rows = meta.metadata?.contentMetadataViewModel?.metadataRows || [];
  let channelName = '';
  let viewsText = '';
  let uploadedDate = '';
  for (const row of rows) {
    for (const part of (row.metadataParts || [])) {
      const text = part.text?.content || '';
      if (!channelName && !text.includes('view') && !text.includes('ago') && !text.includes('hour') && !text.includes('minute') && !text.includes('day') && !text.includes('week') && !text.includes('month') && !text.includes('year') && !text.includes('Stream')) {
        channelName = text;
      } else if (text.includes('view')) {
        viewsText = text;
      } else if (text.includes('ago') || text.includes('hour') || text.includes('day') || text.includes('week') || text.includes('month') || text.includes('year') || text.includes('Stream')) {
        uploadedDate = text;
      }
    }
  }

  // Duration from overlay badge
  let durationText = '0:00';
  const overlays = lvm.contentImage?.thumbnailViewModel?.overlays || [];
  for (const ov of overlays) {
    const badge = ov.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel;
    if (badge?.text && badge.text.includes(':')) {
      durationText = badge.text;
      break;
    }
  }

  return {
    url: `/watch?v=${videoId}`,
    title,
    thumbnail,
    uploaderName: channelName,
    uploaderUrl: '',
    uploaderAvatar: '',
    uploadedDate,
    duration: parseDuration(durationText),
    views: parseViewCount(viewsText),
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

function extractRelatedVideos(ytData: any): any[] {
  const videos: any[] = [];
  const secondaryResults = ytData?.contents?.twoColumnWatchNextResults?.secondaryResults
    ?.secondaryResults?.results || [];

  for (const item of secondaryResults) {
    // Old format
    if (item.compactVideoRenderer) {
      const v = extractVideoRenderer(item.compactVideoRenderer);
      if (v) videos.push(v);
    }
    // New format: itemSectionRenderer containing lockupViewModels
    if (item.itemSectionRenderer) {
      for (const content of (item.itemSectionRenderer.contents || [])) {
        if (content.lockupViewModel) {
          const v = extractLockupViewModel(content.lockupViewModel);
          if (v) videos.push(v);
        }
        if (content.compactVideoRenderer) {
          const v = extractVideoRenderer(content.compactVideoRenderer);
          if (v) videos.push(v);
        }
      }
    }
    // Direct lockupViewModel
    if (item.lockupViewModel) {
      const v = extractLockupViewModel(item.lockupViewModel);
      if (v) videos.push(v);
    }
  }
  return videos;
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
        const ytData = extractJsonFromHtml(html, 'ytInitialData');
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
        const ytData = extractJsonFromHtml(html, 'ytInitialData');
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
        const ytData = extractJsonFromHtml(html, 'ytInitialData');
        const playerData = extractJsonFromHtml(html, 'ytInitialPlayerResponse');

        const videoDetails = playerData?.videoDetails || {};
        const microformat = playerData?.microformat?.playerMicroformatRenderer || {};
        const streamingData = playerData?.streamingData || {};

        const relatedVideos = extractRelatedVideos(ytData);

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
