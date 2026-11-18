'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

let openCount = 0;

/**
 * Renders a modal straight into <body> so it always sits above the sticky
 * header, sidebar and mobile bottom bars (it can't be trapped under them by a
 * parent layout), and locks page scrolling while it is open.
 */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    openCount++;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) body.style.overflow = prevOverflow === 'hidden' ? '' : prevOverflow;
    };
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
