import { onMounted, onUnmounted } from 'vue';

interface SwipeNavigationOptions {
  views: string[];
  currentView: () => string;
  onNavigate: (view: string) => void;
  threshold?: number;
  edgeWidth?: number; // How close to screen edge to trigger navigation
}

/**
 * Composable for edge-swipe navigation between views.
 * Only triggers when swipe starts near screen edge to avoid
 * interfering with content scrolling.
 */
export function useSwipeNavigation(options: SwipeNavigationOptions) {
  const {
    views,
    currentView,
    onNavigate,
    threshold = 80,
    edgeWidth = 30, // Only trigger from within 30px of screen edge
  } = options;

  let startX = 0;
  let startY = 0;
  let isEdgeSwipe = false;

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;

    // Only consider swipes that start from screen edges
    const screenWidth = window.innerWidth;
    const isLeftEdge = startX < edgeWidth;
    const isRightEdge = startX > screenWidth - edgeWidth;

    isEdgeSwipe = isLeftEdge || isRightEdge;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    // Only process edge swipes
    if (!isEdgeSwipe) return;
    isEdgeSwipe = false;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    // Must be primarily horizontal movement (at least 2:1 ratio)
    if (Math.abs(deltaX) < Math.abs(deltaY) * 2) return;

    // Must exceed threshold
    if (Math.abs(deltaX) < threshold) return;

    const current = currentView();
    const currentIndex = views.indexOf(current);

    if (currentIndex === -1) return;

    if (deltaX > 0 && currentIndex > 0) {
      // Swipe right from left edge - go to previous view
      onNavigate(views[currentIndex - 1]);
    } else if (deltaX < 0 && currentIndex < views.length - 1) {
      // Swipe left from right edge - go to next view
      onNavigate(views[currentIndex + 1]);
    }
  };

  onMounted(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
  });

  onUnmounted(() => {
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchend', handleTouchEnd);
  });
}
