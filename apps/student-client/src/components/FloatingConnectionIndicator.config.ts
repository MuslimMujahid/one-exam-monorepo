/**
 * Configuration for the floating connection indicator
 */

export interface FloatingIndicatorConfig {
  /** Position of the indicator */
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  /** Whether to show the indicator by default */
  enabled: boolean;
  /** Whether to auto-expand on connection issues */
  autoExpandOnIssues: boolean;
  /** Whether to show minimal version (just dot) or full version */
  minimal: boolean;
  /** Custom styling options */
  styling?: {
    /** Distance from edges in pixels */
    offset?: number;
    /** Z-index for the indicator */
    zIndex?: number;
  };
}

export const defaultFloatingIndicatorConfig: FloatingIndicatorConfig = {
  position: 'bottom-left',
  enabled: true,
  autoExpandOnIssues: false,
  minimal: false,
  styling: {
    offset: 16, // 16px = 1rem (equals bottom-4/left-4 in Tailwind)
    zIndex: 50,
  },
};

/**
 * Get positioning classes based on config
 */
export function getPositionClasses(
  position: FloatingIndicatorConfig['position']
): string {
  switch (position) {
    case 'bottom-left':
      return `bottom-4 left-4`;
    case 'bottom-right':
      return `bottom-4 right-4`;
    case 'top-left':
      return `top-4 left-4`;
    case 'top-right':
      return `top-4 right-4`;
    default:
      return `bottom-4 left-4`;
  }
}

/**
 * Hook to manage floating indicator configuration
 */
export function useFloatingIndicatorConfig() {
  // This could be extended to read from localStorage, user preferences, etc.
  return defaultFloatingIndicatorConfig;
}
