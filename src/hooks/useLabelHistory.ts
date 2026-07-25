import { useState, useCallback } from 'react';
import { LabelElement } from '../types/label';

export function useLabelHistory(initialElements: LabelElement[]) {
  const [history, setHistory] = useState<LabelElement[][]>([initialElements]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const currentElements = history[currentIndex] || [];

  const updateElements = useCallback(
    (newElements: LabelElement[], saveHistory = true) => {
      if (!saveHistory) {
        setHistory((prev) => {
          const next = [...prev];
          next[currentIndex] = newElements;
          return next;
        });
        return;
      }

      setHistory((prev) => {
        const sliced = prev.slice(0, currentIndex + 1);
        return [...sliced, newElements];
      });
      setCurrentIndex((prev) => prev + 1);
    },
    [currentIndex]
  );

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, history.length]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const resetHistory = useCallback((elements: LabelElement[]) => {
    setHistory([elements]);
    setCurrentIndex(0);
  }, []);

  return {
    elements: currentElements,
    updateElements,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  };
}
