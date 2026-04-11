import { useEffect, useRef, useCallback } from 'react';

export function useInfiniteScroll(
  callback: () => void,
  options: { enabled?: boolean; threshold?: number } = {}
) {
  const { enabled = true, threshold = 300 } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const setSentinel = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node || !enabled) return;

      sentinelRef.current = node;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            callback();
          }
        },
        { rootMargin: `${threshold}px` }
      );

      observerRef.current.observe(node);
    },
    [callback, enabled, threshold]
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return setSentinel;
}
