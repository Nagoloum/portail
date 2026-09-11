import { useState } from 'react';

export function useCopyToClipboard(resetAfterMs = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetAfterMs);
    } catch {
      // Clipboard API can be unavailable (older browsers, insecure context);
      // failing silently beats crashing the copy button.
    }
  };

  return { copy, copied };
}
