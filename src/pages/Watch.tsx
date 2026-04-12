import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoCard } from '@/components/VideoCard';
import { getStream, searchVideos, StreamData, VideoItem } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Loader2 } from 'lucide-react';

export default function Watch() {
  const { videoId } = useParams<{ videoId: string }>();
  const [stream, setStream] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [relatedVideos, setRelatedVideos] = useState<VideoItem[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!videoId) return;
    setLoading(true);
    setError('');
    setStream(null);
    setRelatedVideos([]);
    setPage(1);
    window.scrollTo(0, 0);

    getStream(videoId)
      .then((data) => {
        setStream(data);
        const related = data.relatedStreams?.filter((v) => v.type === 'stream') || [];
        setRelatedVideos(related);
        // If no related from API, search for more
        if (related.length < 5 && data.title) {
          const q = data.title.split(' ').slice(0, 3).join(' ');
          searchVideos(q).then((r) => {
            const extra = r.items.filter((v) => !v.url.includes(videoId));
            setRelatedVideos((prev) => [...prev, ...extra]);
          }).catch(() => {});
        }
      })
      .catch(() => setError('Failed to load video'))
      .finally(() => setLoading(false));
  }, [videoId]);

  const loadMoreRelated = useCallback(() => {
    if (loadingMore || !stream?.title) return;
    setLoadingMore(true);
    const query = stream.title.split(' ').slice(0, 4).join(' ');
    searchVideos(query, String(page + 1))
      .then((result) => {
        const newVideos = result.items.filter((v) => !v.url.includes(videoId || ''));
        setRelatedVideos((prev) => [...prev, ...newVideos]);
        setPage((p) => p + 1);
      })
      .catch(console.error)
      .finally(() => setLoadingMore(false));
  }, [loadingMore, stream?.title, page, videoId]);

  const sentinelRef = useInfiniteScroll(loadMoreRelated, { enabled: !loadingMore && !loading });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 px-4 max-w-[1800px] mx-auto pb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            {loading && (
              <div>
                <Skeleton className="w-full aspect-video rounded-xl" />
                <Skeleton className="h-6 w-3/4 mt-4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </div>
            )}
            {error && (
              <div className="flex items-center justify-center aspect-video bg-secondary rounded-xl">
                <p className="text-muted-foreground">{error}</p>
              </div>
            )}
            {stream && videoId && <VideoPlayer stream={stream} videoId={videoId} />}
          </div>

          <div className="w-full lg:w-96 flex-shrink-0">
            <h3 className="text-base font-semibold text-foreground mb-4">Related Videos</h3>
            <div className="flex flex-col gap-2">
              {loading && Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="w-40 aspect-video rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
              {relatedVideos.map((video, i) => (
                <VideoCard key={`${video.url}-${i}`} video={video} layout="list" />
              ))}
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
              <div ref={sentinelRef} className="h-1" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
