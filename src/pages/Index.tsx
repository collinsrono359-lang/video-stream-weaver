import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { VideoGrid } from '@/components/VideoGrid';
import { getTrending, VideoItem } from '@/lib/api';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Loader2 } from 'lucide-react';

const REGIONS = ['US', 'GB', 'DE', 'FR', 'JP', 'IN', 'BR', 'KR'];

export default function Index() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [regionIdx, setRegionIdx] = useState(0);
  const [error, setError] = useState('');

  const fetchTrending = useCallback(async (region: string, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError('');

      const data = await getTrending(region);
      setVideos((prev) => (append ? [...prev, ...data] : data));
    } catch (err) {
      setError('Failed to load videos. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending('US');
  }, [fetchTrending]);

  const loadMore = useCallback(() => {
    if (loadingMore || regionIdx >= REGIONS.length - 1) return;
    const nextIdx = regionIdx + 1;
    setRegionIdx(nextIdx);
    fetchTrending(REGIONS[nextIdx], true);
  }, [loadingMore, regionIdx, fetchTrending]);

  const sentinelRef = useInfiniteScroll(loadMore, {
    enabled: !loadingMore && regionIdx < REGIONS.length - 1,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto pb-8">
        <h2 className="text-lg font-semibold text-foreground mb-6">Trending</h2>

        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => fetchTrending('US')}
              className="text-primary hover:underline text-sm"
            >
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
