import { supabase } from '@/integrations/supabase/client';

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const BASE_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/video-api`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function apiCall(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  const url = `${BASE_URL}?${searchParams}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

export interface VideoItem {
  url: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  uploaderUrl: string;
  uploaderAvatar: string;
  uploadedDate: string;
  duration: number;
  views: number;
  type?: string;
}

export interface StreamData {
  title: string;
  description: string;
  uploadDate: string;
  uploader: string;
  uploaderUrl: string;
  uploaderAvatar: string;
  views: number;
  likes: number;
  dislikes: number;
  duration: number;
  hls: string;
  videoStreams: Array<{
    url: string;
    quality: string;
    mimeType: string;
    width: number;
    height: number;
    fps: number;
    videoOnly: boolean;
  }>;
  audioStreams: Array<{
    url: string;
    quality: string;
    mimeType: string;
    bitrate: number;
  }>;
  relatedStreams: VideoItem[];
  subtitles: Array<{
    url: string;
    mimeType: string;
    name: string;
    code: string;
  }>;
}

export interface SearchResult {
  items: VideoItem[];
  nextpage: string | null;
}

export async function getTrending(region = 'US'): Promise<VideoItem[]> {
  const data = await apiCall({ action: 'trending', region });
  return (data || []).filter((v: VideoItem) => v.type === 'stream');
}

export async function searchVideos(query: string, page?: string): Promise<SearchResult> {
  const params: Record<string, string> = { action: 'search', q: query };
  if (page) params.page = page;
  const data = await apiCall(params);
  return {
    items: (data.items || []).filter((v: VideoItem) => v.type === 'stream'),
    nextpage: data.nextpage || null,
  };
}

export async function getStream(videoId: string): Promise<StreamData> {
  return apiCall({ action: 'stream', videoId });
}

export async function getSuggestions(query: string): Promise<string[]> {
  return apiCall({ action: 'suggestions', q: query });
}

export function extractVideoId(url: string): string {
  return url.replace('/watch?v=', '');
}

export function formatViews(views: number): string {
  if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(1)}B views`;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} views`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 0) return 'LIVE';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function getApiBaseUrl(): string {
  return BASE_URL;
}
