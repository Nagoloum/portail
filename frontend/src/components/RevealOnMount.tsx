import { Box, BoxProps } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

/**
 * DIV charte calls for a scroll reveal (opacity 0->1, y 24->0, 0.55s,
 * cubic-bezier(0.22,1,0.36,1)). Our screens are short dashboards/forms
 * with little to scroll, so we trigger the same transition on mount
 * instead of wiring an IntersectionObserver for content that is already
 * in the viewport - see README "Limites connues".
 */
export function RevealOnMount({ delayMs = 0, children, ...boxProps }: BoxProps & { delayMs?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <Box
      opacity={visible ? 1 : 0}
      transform={visible ? 'translateY(0)' : 'translateY(24px)'}
      transition="opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1), transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)"
      {...boxProps}
    >
      {children}
    </Box>
  );
}
