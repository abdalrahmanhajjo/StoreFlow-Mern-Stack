import { useMediaQuery } from './useMediaQuery';
import { MEDIA } from '@/constants/breakpoints';

export function useBreakpoint() {
  const isMobile = useMediaQuery(MEDIA.mobile);
  const isTablet = useMediaQuery(MEDIA.tablet);
  const isDesktop = useMediaQuery(MEDIA.desktop);
  const isWide = useMediaQuery(MEDIA.wide);

  return { isMobile, isTablet, isDesktop, isWide };
}
