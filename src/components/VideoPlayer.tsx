import { useState, useRef, useEffect } from 'react';
import { StreamData } from '@/lib/api';
import { Download, ThumbsUp, Share2, Play, Pause, Maximize, Volume2, VolumeX, Loader2, ChevronDown } from 'lucide-react';
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
  const [showControls, setShowControls] = useState(true);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloading, setDownloading] = useState('');
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();

  // Always use embed but strip branding as much as possible
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=0&showinfo=0&fs=1&disablekb=0&playsinline=1&cc_load_policy=0&origin=${window.location.origin}`;

  // Get available download qualities
  const downloadStreams = (stream.videoStreams || [])
    .filter(s => s.url && !s.videoOnly && s.quality)
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  const allDownloadOptions = downloadStreams.length > 0
    ? downloadStreams.map(s => ({
        label: s.quality || `${s.height}p`,
        url: s.url,
        quality: s.quality,
        size: s.width && s.height ? `${s.width}x${s.height}` : '',
      }))
    : [];

  // Also include audio-only option
  const bestAudio = (stream.audioStreams || []).find(a => a.url);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100 || 0);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    // Send seek command via postMessage to iframe
    // For custom overlay progress, we track via iframe API
  };

  const handleFullscreen = () => {
    const container = document.querySelector('.video-container');
    if (container?.requestFullscreen) container.requestFullscreen();
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  const handleDownload = async (url: string, quality: string) => {
    if (!url) {
      toast.error('No downloadable stream available');
      return;
    }
    setDownloading(quality);
    setShowDownloadMenu(false);
    toast.info(`Downloading ${quality}...`);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${(stream.title || videoId).replace(/[^a-zA-Z0-9 ]/g, '')}_${quality}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('Download complete!');
    } catch {
      window.open(url, '_blank');
      toast.info('Opening in new tab for download');
    } finally {
      setDownloading('');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  // Close download menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.download-menu-container')) {
        setShowDownloadMenu(false);
      }
    };
    if (showDownloadMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDownloadMenu]);

  return (
    <div>
      <div
        className="video-container relative w-full aspect-video bg-black rounded-xl overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Privacy-enhanced embed with no branding */}
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={stream.title}
          style={{ border: 'none' }}
          loading="eager"
        />

        {/* Overlay to hide YouTube logo at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
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

            {/* Download with quality picker */}
            <div className="relative download-menu-container">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (allDownloadOptions.length === 0 && !bestAudio) {
                    toast.error('No downloads available for this video');
                    return;
                  }
                  setShowDownloadMenu(!showDownloadMenu);
                }}
                className="gap-1.5 rounded-full"
                disabled={!!downloading}
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download
                <ChevronDown className="w-3 h-3" />
              </Button>

              {showDownloadMenu && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[180px] overflow-hidden">
                  <p className="text-xs text-muted-foreground px-3 py-2 border-b border-border">Select Quality</p>
                  {allDownloadOptions.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleDownload(opt.url, opt.label)}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <span className="font-medium">{opt.label}</span>
                      {opt.size && <span className="text-xs text-muted-foreground">{opt.size}</span>}
                    </button>
                  ))}
                  {bestAudio && (
                    <button
                      onClick={() => handleDownload(bestAudio.url, 'Audio Only')}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors border-t border-border"
                    >
                      <span className="font-medium">Audio Only</span>
                      <span className="text-xs text-muted-foreground">MP3</span>
                    </button>
                  )}
                  {allDownloadOptions.length === 0 && !bestAudio && (
                    <p className="text-xs text-muted-foreground px-3 py-3 text-center">No streams available</p>
                  )}
                </div>
              )}
            </div>
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
