import { onMounted, onUnmounted, ref } from 'vue';

/**
 * Composable to handle iOS viewport and keyboard behavior
 * Uses visualViewport API for accurate keyboard detection
 */
export function useIOSViewport() {
  const viewportHeight = ref(window.innerHeight);
  const keyboardHeight = ref(0);
  const isKeyboardVisible = ref(false);

  let initialHeight = window.innerHeight;

  const updateViewport = () => {
    if (window.visualViewport) {
      const vh = window.visualViewport.height;
      const offset = window.innerHeight - vh;

      viewportHeight.value = vh;
      keyboardHeight.value = Math.max(0, offset);
      isKeyboardVisible.value = offset > 100; // Threshold to detect keyboard

      // Update CSS variables
      document.documentElement.style.setProperty('--viewport-height', `${vh}px`);
      document.documentElement.style.setProperty('--keyboard-offset', `${offset}px`);
      document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight.value}px`);
    }
  };

  const handleResize = () => {
    updateViewport();
  };

  const handleScroll = () => {
    // Prevent layout shift during keyboard interactions
    if (window.visualViewport && isKeyboardVisible.value) {
      window.scrollTo(0, 0);
    }
  };

  onMounted(() => {
    initialHeight = window.innerHeight;

    // Set initial viewport height
    document.documentElement.style.setProperty('--viewport-height', `${initialHeight}px`);
    document.documentElement.style.setProperty('--keyboard-offset', '0px');
    document.documentElement.style.setProperty('--keyboard-height', '0px');

    // Listen to visualViewport changes (more reliable on iOS)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleScroll);
    }

    // Fallback for browsers without visualViewport
    window.addEventListener('resize', handleResize);

    // Initial update
    updateViewport();
  });

  onUnmounted(() => {
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', handleResize);
      window.visualViewport.removeEventListener('scroll', handleScroll);
    }
    window.removeEventListener('resize', handleResize);
  });

  return {
    viewportHeight,
    keyboardHeight,
    isKeyboardVisible,
  };
}
