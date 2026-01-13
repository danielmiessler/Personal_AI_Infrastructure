import { ref, onMounted, onUnmounted, type Ref } from 'vue';

interface PullToRefreshOptions {
  threshold?: number;
  onRefresh: () => Promise<void>;
}

export function usePullToRefresh(
  containerRef: Ref<HTMLElement | null>,
  options: PullToRefreshOptions
) {
  const { threshold = 80, onRefresh } = options;

  const isPulling = ref(false);
  const pullDistance = ref(0);
  const isRefreshing = ref(false);

  let startY = 0;
  let currentY = 0;

  const handleTouchStart = (e: TouchEvent) => {
    const container = containerRef.value;
    if (!container || isRefreshing.value) return;

    // Only trigger if scrolled to top
    if (container.scrollTop > 0) return;

    startY = e.touches[0].clientY;
    isPulling.value = true;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling.value || isRefreshing.value) return;

    currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    // Only allow pulling down
    if (diff < 0) {
      pullDistance.value = 0;
      return;
    }

    // Apply resistance to pull
    pullDistance.value = Math.min(diff * 0.5, threshold * 1.5);

    // Prevent default scroll when pulling
    if (pullDistance.value > 0) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.value) return;

    isPulling.value = false;

    if (pullDistance.value >= threshold && !isRefreshing.value) {
      isRefreshing.value = true;
      pullDistance.value = threshold;

      try {
        await onRefresh();
      } finally {
        isRefreshing.value = false;
        pullDistance.value = 0;
      }
    } else {
      pullDistance.value = 0;
    }
  };

  onMounted(() => {
    const container = containerRef.value;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
  });

  onUnmounted(() => {
    const container = containerRef.value;
    if (!container) return;

    container.removeEventListener('touchstart', handleTouchStart);
    container.removeEventListener('touchmove', handleTouchMove);
    container.removeEventListener('touchend', handleTouchEnd);
  });

  return {
    isPulling,
    pullDistance,
    isRefreshing,
  };
}
