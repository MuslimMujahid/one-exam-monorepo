# Shared UI Components

This document demonstrates the `AlertBanner` and `LoadingSpinner` components that are now part of the shared UI library.

## AlertBanner

A flexible alert component with multiple types and consistent styling.

### Usage

```tsx
import { AlertBanner } from '@one-exam-monorepo/ui';

// Basic usage
<AlertBanner type="success" message="Operation completed successfully!" />
<AlertBanner type="error" message="Something went wrong." />
<AlertBanner type="warning" message="Please review this information." />
<AlertBanner type="info" message="Here's some helpful information." />

// With custom classes
<AlertBanner
  type="success"
  message="Custom styled alert"
  className="shadow-lg border-2"
/>
```

### Variants

- **error**: Red background with red text for error messages
- **success**: Green background with green text for success messages
- **warning**: Yellow background with yellow text for warnings
- **info**: Blue background with blue text for informational messages (default)

## LoadingSpinner

A flexible loading spinner with multiple sizes and colors.

### Usage

```tsx
import { LoadingSpinner } from '@one-exam-monorepo/ui';

// Basic usage
<LoadingSpinner />

// Full screen loader
<LoadingSpinner fullScreen size="2xl" />

// Different sizes
<LoadingSpinner size="sm" />
<LoadingSpinner size="md" />
<LoadingSpinner size="lg" />
<LoadingSpinner size="xl" />
<LoadingSpinner size="2xl" />

// Different colors
<LoadingSpinner color="primary" />
<LoadingSpinner color="secondary" />
<LoadingSpinner color="success" />
<LoadingSpinner color="danger" />
<LoadingSpinner color="warning" />

// Custom container
<LoadingSpinner
  size="lg"
  color="success"
  containerClassName="p-8 bg-gray-100 rounded-lg"
/>
```

### Size Variants

- **sm**: 16x16px (h-4 w-4)
- **md**: 32x32px (h-8 w-8) - default
- **lg**: 48x48px (h-12 w-12)
- **xl**: 64x64px (h-16 w-16)
- **2xl**: 128x128px (h-32 w-32)

### Color Variants

- **primary**: Blue spinner (default)
- **secondary**: Gray spinner
- **success**: Green spinner
- **danger**: Red spinner
- **warning**: Yellow spinner

### Props

Both components support the standard CVA pattern with type-safe variants and the ability to add custom classes via the `className` prop.

## Benefits

1. **Consistency**: Shared components ensure consistent UI patterns across all apps
2. **Maintainability**: Updates to shared components benefit all consuming apps
3. **Type Safety**: Full TypeScript support with proper variant types
4. **Flexibility**: CVA-powered variants make customization easy
5. **Performance**: Optimized class merging with `cn` utility
6. **Reusability**: Can be used in any app within the monorepo
