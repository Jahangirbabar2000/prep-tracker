'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  /** The hoverable/focusable trigger — usually a short text or badge. */
  children: ReactNode;
  /** Tooltip body content. */
  content: ReactNode;
  width?: number;
}

const VIEWPORT_MARGIN = 8;
const GAP = 8;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

/** Generic hover/focus tooltip, portaled to <body> so it escapes overflow-hidden
 *  ancestors (cards, scroll areas). Positioning logic mirrors ProficiencyBadge. */
export default function InfoTooltip({ children, content, width = 256 }: Props) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; arrowLeft: number; placement: 'top' | 'bottom' } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  function show() {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    const placement: 'top' | 'bottom' = rect.top > 200 ? 'top' : 'bottom';

    const idealLeft = rect.right - width;
    const left = clamp(idealLeft, VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);

    const triggerCenter = rect.left + rect.width / 2;
    const arrowLeft = clamp(triggerCenter - left, 16, width - 16);

    const top = placement === 'top' ? rect.top - GAP : rect.bottom + GAP;

    setPos({ top, left, arrowLeft, placement });
    setVisible(true);
  }

  function hide() {
    setVisible(false);
  }

  useEffect(() => {
    if (!visible) return;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [visible]);

  return (
    <span
      ref={triggerRef}
      className="inline-flex items-center cursor-default"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
    >
      {children}

      {visible && pos && createPortal(
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            width,
            left: pos.left,
            ...(pos.placement === 'top'
              ? { bottom: window.innerHeight - pos.top }
              : { top: pos.top }),
          }}
        >
          {pos.placement === 'bottom' && (
            <div
              className="absolute bottom-full w-2.5 h-2.5 bg-surface border-l border-t border-border-strong rotate-45 translate-y-[6px]"
              style={{ left: pos.arrowLeft }}
            />
          )}
          <div className="bg-surface border border-border-strong rounded-xl shadow-lg px-3.5 py-3">
            {content}
          </div>
          {pos.placement === 'top' && (
            <div
              className="absolute top-full w-2.5 h-2.5 bg-surface border-r border-b border-border-strong rotate-45 -translate-y-[6px]"
              style={{ left: pos.arrowLeft }}
            />
          )}
        </div>,
        document.body,
      )}
    </span>
  );
}
