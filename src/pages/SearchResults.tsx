import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { VideoGrid } from '@/components/VideoGrid';
import { searchVideos, VideoItem } from '@/lib/api';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Loader2 } from 'lucide-react';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setVideos([]);
    setNextPage(null);

    searchVideos(query)
      .then((data) => {
        setVideos(data.items);
        setNextPage(data.nextpage);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query]);

  const loadMore = useCallback(() => {
    if (loadingMore || !nextPage || !query) return;
    setLoadingMore(true);

    searchVideos(query, nextPage)
      .then((data) => {
        setVideos((prev) => [...prev, ...data.items]);
        setNextPage(data.nextpage);
      })
      .catch(console.error)
      .finally(() => setLoadingMore(false));
  }, [loadingMore, nextPage, query]);

  const sentinelRef = useInfiniteScroll(loadMore, {
    enabled: !loadingMore && !!nextPage,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto pb-8">
        {query && (
          <h2 className="text-lg font-semibold text-foreground mb-6">
            Results for "{query}"
          </h2>
        )}

        {!loading && videos.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No results found</p>
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
