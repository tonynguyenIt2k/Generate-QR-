import { useEffect, useRef } from 'react';

interface HotkeyOptions {
  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onNudge?: (dx: number, dy: number) => void;
  enabled?: boolean;
}

export function useHotkeys({
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onDelete,
  onDuplicate,
  onNudge,
  enabled = true,
}: HotkeyOptions) {
  const cbRef = useRef({ onUndo, onRedo, onCopy, onPaste, onDelete, onDuplicate, onNudge });

  useEffect(() => {
    cbRef.current = { onUndo, onRedo, onCopy, onPaste, onDelete, onDuplicate, onNudge };
  });

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore hotkeys when typing inside input or textarea elements
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          cbRef.current.onRedo?.();
        } else {
          e.preventDefault();
          cbRef.current.onUndo?.();
        }
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        cbRef.current.onRedo?.();
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        cbRef.current.onCopy?.();
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        cbRef.current.onPaste?.();
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        cbRef.current.onDuplicate?.();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        cbRef.current.onDelete?.();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : 0.2; // mm step
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        cbRef.current.onNudge?.(dx, dy);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
