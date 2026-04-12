import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { VideoGrid } from '@/components/VideoGrid';
import { CategoryChips } from '@/components/CategoryChips';
import { getTrending, searchVideos, VideoItem } from '@/lib/api';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Loader2, Sparkles } from 'lucide-react';

const CATEGORY_QUERIES: Record<string, string> = {
  trending: '',
  videos: 'popular videos today',
  shorts: 'youtube shorts viral',
  songs: 'trending music 2026',
  movies: 'latest movies trailers 2026',
  gaming: 'gaming highlights',
  news: 'breaking news today',
};

export default function Index() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [recommended, setRecommended] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('trending');

  const fetchVideos = useCallback(async (category: string) => {
    try {
      setLoading(true);
      setError('');
      setPage(1);

      let data: VideoItem[] = [];
      if (category === 'trending') {
        try { data = await getTrending('US'); } catch {}
        if (!data.length) {
          const r = await searchVideos('trending popular videos');
          data = r.items;
        }
      } else {
        const query = CATEGORY_QUERIES[category] || category;
        const r = await searchVideos(query);
        data = r.items;
      }
      setVideos(data);

      // Fetch recommended
      try {
        const rec = await searchVideos('recommended popular');
        setRecommended(rec.items.slice(0, 8));
      } catch {}
    } catch {
      setError('Failed to load videos. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos(activeCategory);
  }, [activeCategory]);

  const handleCategorySelect = (cat: string) => {
    // Check if it's a quick search or category
    const isCat = Object.keys(CATEGORY_QUERIES).includes(cat);
    if (isCat) {
      setActiveCategory(cat);
    } else {
      setActiveCategory(cat);
      // Add to queries map dynamically
      CATEGORY_QUERIES[cat] = cat;
    }
  };

  const loadMore = useCallback(() => {
    if (loadingMore) return;
    setLoadingMore(true);
    const query = CATEGORY_QUERIES[activeCategory] || 'popular videos';
    searchVideos(query, String(page + 1))
      .then((result) => {
        setVideos((prev) => [...prev, ...result.items]);
        setPage((p) => p + 1);
      })
      .catch(console.error)
      .finally(() => setLoadingMore(false));
  }, [loadingMore, page, activeCategory]);

  const sentinelRef = useInfiniteScroll(loadMore, { enabled: !loadingMore });

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-8">
      <Header />
      <main className="pt-16 px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto">
        <CategoryChips activeCategory={activeCategory} onSelect={handleCategorySelect} />

        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">{error}</p>
            <button onClick={() => fetchVideos(activeCategory)} className="text-primary hover:underline text-sm">
              Retry
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Popular Now</h2>
        </div>
        <VideoGrid videos={videos} loading={loading} />

        {recommended.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-4 mt-8">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Recommended For You</h2>
            </div>
            <VideoGrid videos={recommended} loading={false} />
          </>
        )}

        {loadingMore && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <div ref={sentinelRef} className="h-1" />
      </main>
      <BottomNav />
    </div>
  );
}
