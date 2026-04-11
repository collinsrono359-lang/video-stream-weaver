import { useEffect, useRef, useState } from 'react';
import { StreamData } from '@/lib/api';
import { Download, ThumbsUp, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VideoPlayerProps {
  stream: StreamData;
  videoId: string;
}

export function VideoPlayer({ stream, videoId }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [quality, setQuality] = useState('');
  const [showQuality, setShowQuality] = useState(false);

  // Get best combined stream (video+audio)
  const combinedStreams = stream.videoStreams
    .filter((s) => !s.videoOnly && s.url)
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  const hlsUrl = stream.hls;

  // Playable streams: prefer HLS, fallback to combined
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsUrl) {
      video.src = hlsUrl;
    } else if (combinedStreams.length > 0) {
      video.src = combinedStreams[0].url;
      setQuality(combinedStreams[0].quality);
    }
  }, [hlsUrl, stream]);

  const handleDownload = async () => {
    // Get best available stream for download
    const downloadStream = combinedStreams[0] || stream.videoStreams.find(s => s.url);
    if (!downloadStream) {
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
      // Fallback: open in new tab
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
        <video
          ref={videoRef}
          controls
          autoPlay
          className="w-full h-full"
          playsInline
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
