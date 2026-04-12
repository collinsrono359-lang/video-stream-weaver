import { useState, useRef, useEffect } from 'react';
import { StreamData } from '@/lib/api';
import { Download, ThumbsUp, Share2, Play, Pause, Maximize, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VideoPlayerProps {
  stream: StreamData;
  videoId: string;
}

export function VideoPlayer({ stream, videoId }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [useEmbed, setUseEmbed] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();

  // Try direct stream first, fallback to embed
  const directStream = stream.videoStreams?.find(s => s.url && !s.videoOnly);
  const hlsUrl = stream.hls;

  useEffect(() => {
    if (!directStream?.url && !hlsUrl) {
      setUseEmbed(true);
    }
  }, [directStream, hlsUrl]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100 || 0);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pct * videoRef.current.duration;
  };

  const handleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (container?.requestFullscreen) container.requestFullscreen();
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  const handleVideoError = () => {
    setUseEmbed(true);
  };

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
      <div
        className="relative w-full aspect-video bg-background rounded-xl overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowControls(false)}
      >
        {useEmbed ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&showinfo=0&fs=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={stream.title}
            style={{ border: 'none' }}
          />
        ) : (
          <>
            <video
              ref={videoRef}
              src={directStream?.url || ''}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onPlaying={() => { setPlaying(true); setBuffering(false); }}
              onWaiting={() => setBuffering(true)}
              onCanPlay={() => setBuffering(false)}
              onError={handleVideoError}
              onClick={togglePlay}
              autoPlay
              playsInline
              preload="auto"
            />

            {buffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            )}

            {/* Custom controls overlay */}
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-3 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
              {/* Progress bar */}
              <div className="w-full h-1 bg-muted rounded-full cursor-pointer mb-3" onClick={handleSeek}>
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={togglePlay} className="text-foreground hover:text-primary transition-colors">
                    {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <button onClick={() => { setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted; }} className="text-foreground hover:text-primary transition-colors">
                    {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>
                <button onClick={handleFullscreen} className="text-foreground hover:text-primary transition-colors">
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-4">
        <h1 className="text-xl font-semibold text-foreground">{stream.title}</h1>

        <div className="flex flex-wrap items-center justify-between mt-3 gap-3">
          <div className="flex items-center gap-3">
            {stream.uploaderAvatar && (
              <img src={stream.uploaderAvatar} alt={stream.uploader} className="w-10 h-10 rounded-full" />
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
