import { useState, useEffect } from 'react';

/**
 * Hook to detect whether the on-screen / virtual keyboard is currently visible on mobile/tablet devices.
 * Uses a combination of:
 * 1. window.visualViewport API (height reduction detection)
 * 2. navigator.virtualKeyboard API (Chromium / PWA)
 * 3. Focus/blur event listeners on text input/textarea/editable elements on touch devices
 * 4. Window resize heuristics
 */
export function useVirtualKeyboard(): boolean {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isInputFocused = false;
    let initialHeight = window.innerHeight;
    if (window.visualViewport) {
      initialHeight = window.visualViewport.height;
    }

    const isEditableElement = (el: Element | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tagName = el.tagName.toLowerCase();
      if (tagName === 'textarea') return true;
      if (tagName === 'input') {
        const type = (el as HTMLInputElement).type?.toLowerCase() || 'text';
        // Non-keyboard input types
        const nonKeyboardTypes = [
          'checkbox',
          'radio',
          'button',
          'submit',
          'reset',
          'file',
          'image',
          'color',
          'range',
          'hidden',
        ];
        return !nonKeyboardTypes.includes(type);
      }
      if (el.isContentEditable) return true;
      if (el.getAttribute('role') === 'textbox' || el.getAttribute('role') === 'searchbox') return true;
      return false;
    };

    const checkKeyboardState = () => {
      const activeEl = document.activeElement;
      isInputFocused = isEditableElement(activeEl);

      let viewportShrunk = false;
      if (window.visualViewport) {
        const currentVpHeight = window.visualViewport.height;
        // If viewport height decreased by more than 120px
        if (window.innerHeight - currentVpHeight > 120 || initialHeight - currentVpHeight > 120) {
          viewportShrunk = true;
        }
      }

      // Check innerHeight vs screen height for Android browsers where innerHeight shrinks
      const windowHeightShrunk =
        window.screen &&
        window.screen.height - window.innerHeight > 160 &&
        isInputFocused;

      // On mobile / touch screens: if an input is focused OR viewport shrunk significantly
      const isTouchOrMobile =
        window.innerWidth <= 1024 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      const keyboardActive = viewportShrunk || windowHeightShrunk || (isInputFocused && isTouchOrMobile);

      setIsKeyboardOpen(keyboardActive);
    };

    // 1. Focusin / Focusout events
    const handleFocusIn = (e: FocusEvent) => {
      if (isEditableElement(e.target as Element)) {
        isInputFocused = true;
        setTimeout(checkKeyboardState, 50);
        setTimeout(checkKeyboardState, 300);
      }
    };

    const handleFocusOut = () => {
      isInputFocused = false;
      setTimeout(checkKeyboardState, 80);
      setTimeout(checkKeyboardState, 300);
    };

    // 2. Visual Viewport events
    const vv = window.visualViewport;
    const handleViewportChange = () => {
      checkKeyboardState();
    };

    if (vv) {
      vv.addEventListener('resize', handleViewportChange);
      vv.addEventListener('scroll', handleViewportChange);
    }

    // 3. Window resize
    window.addEventListener('resize', checkKeyboardState);

    // 4. Focus / Blur on document
    document.addEventListener('focusin', handleFocusIn, { passive: true });
    document.addEventListener('focusout', handleFocusOut, { passive: true });

    // 5. Virtual Keyboard API if supported
    const navVk = (navigator as unknown as { virtualKeyboard?: EventTarget })?.virtualKeyboard;
    if (navVk) {
      try {
        navVk.addEventListener('geometrychange', checkKeyboardState);
      } catch {
        // ignore
      }
    }

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleViewportChange);
        vv.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', checkKeyboardState);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (navVk) {
        try {
          navVk.removeEventListener('geometrychange', checkKeyboardState);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return isKeyboardOpen;
}
