import { useState } from 'react';
import { StreamData } from '@/lib/api';
import { Download, ThumbsUp, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VideoPlayerProps {
  stream: StreamData;
  videoId: string;
}

export function VideoPlayer({ stream, videoId }: VideoPlayerProps) {
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`;

  const handleDownload = async () => {
    const downloadStream = stream.videoStreams?.find(s => s.url && !s.videoOnly);
    if (!downloadStream?.url) {
      toast.error('No downloadable stream available');
      return;
    }
    toast.info('Starting download...');
    try {
      const response = await fetch(downloadStream.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stream.title || videoId}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download started!');
    } catch {
      window.open(downloadStream.url, '_blank');
      toast.info('Opening video in new tab for download');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div>
      <div className="relative w-full aspect-video bg-background rounded-xl overflow-hidden">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={stream.title}
        />
      </div>

      <div className="mt-4">
        <h1 className="text-xl font-semibold text-foreground">{stream.title}</h1>

        <div className="flex flex-wrap items-center justify-between mt-3 gap-3">
          <div className="flex items-center gap-3">
            {stream.uploaderAvatar && (
              <img
                src={stream.uploaderAvatar}
                alt={stream.uploader}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{stream.uploader}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" size="sm" className="gap-1.5 rounded-full">
              <ThumbsUp className="w-4 h-4" />
              {stream.likes > 0 ? `${(stream.likes / 1000).toFixed(1)}K` : 'Like'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleShare} className="gap-1.5 rounded-full">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownload} className="gap-1.5 rounded-full">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>

        {stream.description && (
          <details className="mt-4 bg-secondary rounded-xl p-3">
            <summary className="text-sm text-muted-foreground cursor-pointer">
              {stream.views?.toLocaleString()} views • {stream.uploadDate}
            </summary>
            <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{stream.description}</p>
          </details>
        )}
      </div>
    </div>
  );
}
