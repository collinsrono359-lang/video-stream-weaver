import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { VideoGrid } from '@/components/VideoGrid';
import { getTrending, searchVideos, VideoItem } from '@/lib/api';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Loader2 } from 'lucide-react';

const POPULAR_QUERIES = ['trending music 2026', 'popular videos today', 'viral videos', 'top clips'];

export default function Index() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const fetchVideos = useCallback(async (append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError('');

      // Try trending first, fallback to search
      let data: VideoItem[] = [];
      try {
        data = await getTrending('US');
      } catch {}

      if (!data || data.length === 0) {
        const query = POPULAR_QUERIES[Math.floor(Math.random() * POPULAR_QUERIES.length)];
        const result = await searchVideos(query, append ? String(page) : '1');
        data = result.items;
      }

      setVideos((prev) => (append ? [...prev, ...data] : data));
    } catch (err) {
      setError('Failed to load videos. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page]);

  useEffect(() => {
    fetchVideos();
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore) return;
    setPage((p) => p + 1);
    setLoadingMore(true);
    const query = POPULAR_QUERIES[Math.floor(Math.random() * POPULAR_QUERIES.length)];
    searchVideos(query, String(page + 1))
      .then((result) => {
        setVideos((prev) => [...prev, ...result.items]);
      })
      .catch(console.error)
      .finally(() => setLoadingMore(false));
  }, [loadingMore, page]);

  const sentinelRef = useInfiniteScroll(loadMore, { enabled: !loadingMore });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto pb-8">
        <h2 className="text-lg font-semibold text-foreground mb-6">Trending</h2>

        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">{error}</p>
            <button onClick={() => fetchVideos()} className="text-primary hover:underline text-sm">
              Retry
            </button>
          </div>
        )}

        <VideoGrid videos={videos} loading={loading} />

        {loadingMore && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        <div ref={sentinelRef} className="h-1" />
      </main>
    </div>
  );
}
