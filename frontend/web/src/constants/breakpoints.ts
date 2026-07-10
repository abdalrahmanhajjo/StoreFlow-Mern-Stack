export const BREAKPOINTS = {
  mobile: 768,
  tablet: 900,
  desktop: 1024,
  wide: 1280,
} as const;

export const MEDIA = {
  mobile: `(max-width: ${BREAKPOINTS.mobile}px)`,
  tablet: `(max-width: ${BREAKPOINTS.tablet}px)`,
  desktop: `(min-width: ${BREAKPOINTS.desktop}px)`,
  wide: `(min-width: ${BREAKPOINTS.wide}px)`,
} as const;
