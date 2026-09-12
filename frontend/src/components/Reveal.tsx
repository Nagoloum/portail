import { Box, BoxProps } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';

/**
 * The DIV charte's scroll reveal, to the letter: opacity 0 -> 1,
 * y 24 -> 0, 0.55s, cubic-bezier(0.22, 1, 0.36, 1).
 *
 * Driven by an IntersectionObserver rather than by mount, so content
 * below the fold animates when it is actually reached. Elements already
 * in the viewport on load fire immediately, which makes this a superset
 * of the previous mount-based behaviour - there is no case where it
 * animates less.
 *
 * Reveals once and then stops observing: re-animating on every scroll
 * back would be noise, not information.
 */
export function Reveal({ delayMs = 0, children, ...boxProps }: BoxProps & { delayMs?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Respect the OS setting: show the content, skip the motion.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        timer = setTimeout(() => setVisible(true), delayMs);
      },
      // A small negative bottom margin keeps the reveal from firing on
      // an element whose first pixel has barely entered the viewport.
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [delayMs]);

  return (
    <Box
      ref={ref}
      opacity={visible ? 1 : 0}
      transform={visible ? 'translateY(0)' : 'translateY(24px)'}
      transition="opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1), transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)"
      {...boxProps}
    >
      {children}
    </Box>
  );
}
