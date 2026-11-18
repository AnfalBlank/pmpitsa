'use client';

import React, { useLayoutEffect, useRef } from 'react';

/**
 * Multi-line text field that grows with its content. Used for notes /
 * findings so long text stays fully visible on phones (a single-line input
 * would cut it off).
 */
export const AutoTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = '', rows = 1, ...props }) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [props.value]);
  return <textarea ref={ref} rows={rows} className={`${className} resize-none overflow-hidden leading-snug`} {...props} />;
};
