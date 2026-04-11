import { Header } from '@/components/Header';
import { getApiBaseUrl } from '@/lib/api';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API_URL = getApiBaseUrl();

const endpoints = [
  {
    name: 'Trending Videos',
    method: 'GET',
    path: '?action=trending&region=US',
    description: 'Get trending videos. Supports region codes: US, GB, DE, FR, JP, IN, BR, KR.',
  },
  {
    name: 'Search Videos',
    method: 'GET',
    path: '?action=search&q=YOUR_QUERY&filter=videos',
    description: 'Search for videos. Supports pagination via nextpage parameter.',
  },
  {
    name: 'Video Stream',
    method: 'GET',
    path: '?action=stream&videoId=VIDEO_ID',
    description: 'Get video stream data including direct URLs, related videos, and metadata.',
  },
  {
    name: 'Search Suggestions',
    method: 'GET',
    path: '?action=suggestions&q=YOUR_QUERY',
    description: 'Get search autocomplete suggestions.',
  },
];

export default function Developers() {
  const copyUrl = (path: string) => {
    navigator.clipboard.writeText(`${API_URL}${path}`);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 px-4 sm:px-6 max-w-4xl mx-auto pb-8">
        <div className="py-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Developer Portal</h1>
          <p className="text-muted-foreground mb-8">
            Access the VidStream API to integrate video data into your applications.
          </p>

          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-2">API Base URL</h2>
            <div className="flex items-center gap-2 bg-secondary rounded-lg p-3">
              <code className="text-sm text-foreground flex-1 break-all font-mono">{API_URL}</code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(API_URL);
                  toast.success('Base URL copied!');
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Note: Include the Supabase anon key as the <code className="text-primary">apikey</code> header for authentication.
            </p>
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-4">Endpoints</h2>

          <div className="space-y-4">
            {endpoints.map((ep) => (
              <div key={ep.name} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary">
                        {ep.method}
                      </span>
                      <h3 className="font-semibold text-foreground">{ep.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{ep.description}</p>
                    <code className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded break-all block font-mono">
                      {API_URL}{ep.path}
                    </code>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => copyUrl(ep.path)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`${API_URL}${ep.path}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-6 mt-8">
            <h2 className="text-lg font-semibold text-foreground mb-2">Quick Example</h2>
            <pre className="bg-secondary rounded-lg p-4 overflow-x-auto text-sm text-foreground font-mono">
{`// Fetch trending videos
const response = await fetch(
  '${API_URL}?action=trending&region=US',
  {
    headers: {
      'apikey': 'YOUR_SUPABASE_ANON_KEY',
      'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY'
    }
  }
);
const videos = await response.json();
console.log(videos);`}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}
