import { VideoItem } from '@/lib/api';
import { VideoCard } from './VideoCard';
import { Skeleton } from '@/components/ui/skeleton';

interface VideoGridProps {
  videos: VideoItem[];
  loading?: boolean;
}

function VideoSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-video rounded-xl" />
      <div className="flex gap-3 mt-3">
        <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-3 w-2/3 mb-1" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function VideoGrid({ videos, loading }: VideoGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
      {videos.map((video, i) => (
        <VideoCard key={`${video.url}-${i}`} video={video} />
      ))}
      {loading && Array.from({ length: 8 }).map((_, i) => <VideoSkeleton key={`skel-${i}`} />)}
    </div>
  );
}
