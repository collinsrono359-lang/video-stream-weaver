import { VideoItem, formatViews, formatDuration, extractVideoId } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface VideoCardProps {
  video: VideoItem;
  layout?: 'grid' | 'list';
}

export function VideoCard({ video, layout = 'grid' }: VideoCardProps) {
  const navigate = useNavigate();
  const videoId = extractVideoId(video.url);

  const handleClick = () => {
    navigate(`/watch/${videoId}`);
  };

  if (layout === 'list') {
    return (
      <div
        onClick={handleClick}
        className="flex gap-2 p-2 rounded-lg cursor-pointer hover:bg-surface-hover transition-colors"
      >
        <div className="relative w-40 min-w-[10rem] aspect-video rounded-lg overflow-hidden bg-secondary">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <span className="absolute bottom-1 right-1 bg-background/90 text-foreground text-xs px-1 rounded font-medium">
            {formatDuration(video.duration)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium line-clamp-2 text-foreground">{video.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{video.uploaderName}</p>
          <p className="text-xs text-muted-foreground">
            {formatViews(video.views)} • {video.uploadedDate}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div onClick={handleClick} className="cursor-pointer group">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <span className="absolute bottom-2 right-2 bg-background/90 text-foreground text-xs px-1.5 py-0.5 rounded font-medium">
          {formatDuration(video.duration)}
        </span>
      </div>
      <div className="flex gap-3 mt-3">
        {video.uploaderAvatar && (
          <img
            src={video.uploaderAvatar}
            alt={video.uploaderName}
            className="w-9 h-9 rounded-full bg-secondary flex-shrink-0"
            loading="lazy"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium line-clamp-2 text-foreground leading-5">
            {video.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{video.uploaderName}</p>
          <p className="text-xs text-muted-foreground">
            {formatViews(video.views)} • {video.uploadedDate}
          </p>
        </div>
      </div>
    </div>
  );
}
