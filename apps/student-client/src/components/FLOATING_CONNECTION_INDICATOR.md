# Floating Connection Indicator

The floating connection indicator provides a persistent, always-visible connection status that appears on every page of the exam platform.

## Overview

The floating indicator:
- **Fixed position**: Appears in the bottom-left corner by default
- **Global scope**: Available on every page automatically
- **Interactive**: Click to expand for detailed connection information
- **Responsive**: Adapts to different screen sizes
- **Accessible**: Includes proper ARIA labels and keyboard navigation

## Components

### `FloatingConnectionIndicator`

The main floating indicator with full functionality:

```tsx
import { FloatingConnectionIndicator } from '../components/FloatingConnectionIndicator';

// Already included globally in App.tsx - no need to add manually
```

**Features:**
- Compact status dot with text
- Click to expand detailed information
- Manual connection check button
- Error details display
- Responsive design

### `MinimalFloatingConnectionIndicator`

A simplified version showing just a status dot:

```tsx
import { MinimalFloatingConnectionIndicator } from '../components/FloatingConnectionIndicator';

// Use instead of full version for minimal impact
<MinimalFloatingConnectionIndicator />
```

**Features:**
- Just a colored status dot
- Hover tooltip with status
- Minimal visual footprint
- Always visible

## Status States

### 🟢 Online (Green)
- Network: Connected
- Server: Reachable
- **Meaning**: Fully functional, all features available

### 🟡 Limited (Yellow)
- Network: Connected
- Server: Unreachable
- **Meaning**: Internet available but exam server down

### 🔴 Offline (Red)
- Network: Disconnected
- Server: N/A
- **Meaning**: No internet connection, offline mode only

### ⚪ Checking (Gray, pulsing)
- Status: Determining connection state
- **Meaning**: Initial load or connection test in progress

## Interaction

### Collapsed State
- Shows status dot and text
- Minimal screen space usage
- Click to expand for details

### Expanded State
- Detailed connection information
- Network and server status breakdown
- Last check timestamp
- Manual check button
- Error details (if any)
- Click outside to collapse

## Positioning

Default position is bottom-left, but can be configured:

```tsx
// Configuration options (see FloatingConnectionIndicator.config.ts)
position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
```

## Integration

### Global Setup (Already Done)

The indicator is automatically included in your app:

```tsx
// In src/app/app.tsx
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
        <FloatingConnectionIndicator /> {/* Added globally */}
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
      <Toaster />
    </QueryClientProvider>
  );
}
```

### Page-Specific Usage

No additional setup needed - the indicator appears on all pages automatically.

### Custom Configuration

If you need to customize the indicator:

```tsx
import { useFloatingIndicatorConfig } from '../components/FloatingConnectionIndicator.config';

// Customize behavior (future enhancement)
const config = useFloatingIndicatorConfig();
```

## Responsive Design

The indicator adapts to different screen sizes:

- **Desktop**: Shows full status text and expand icon
- **Mobile**: Shows only status dot and expand icon (saves space)
- **Expanded**: Full details panel on all screen sizes

## Accessibility

The indicator includes:
- **Semantic markup**: Proper button and tooltip roles
- **Keyboard navigation**: Tab to focus, Enter/Space to activate
- **Screen reader support**: Descriptive text for status
- **High contrast**: Clear visual indicators for all states

## Styling

The indicator uses Tailwind CSS classes for consistent styling:

```css
/* Key classes used */
.fixed.bottom-4.left-4.z-50 /* Positioning */
.bg-white.shadow-lg.rounded-full /* Appearance */
.transition-all.duration-300 /* Animations */
.hover:shadow-xl /* Hover effects */
```

## Testing

The floating indicator can be tested by:

1. **Network simulation**: Disconnect/reconnect internet
2. **Server simulation**: Stop/start backend server
3. **Manual testing**: Click "Check Connection" button
4. **Responsive testing**: Resize browser window

## Troubleshooting

### Indicator not appearing
- Check that it's included in App.tsx
- Verify z-index isn't being overridden
- Ensure parent containers don't have overflow:hidden

### Status not updating
- Check useConnectionStatus hook is working
- Verify network event listeners are active
- Test manual connection check button

### Positioning issues
- Check CSS positioning values
- Verify viewport meta tag is present
- Test on different screen sizes

## Best Practices

1. **Don't duplicate**: The indicator is global - avoid adding it to individual pages
2. **Respect the status**: Use the connection state to enable/disable features appropriately
3. **Provide fallbacks**: Always have offline alternatives for critical functions
4. **Test thoroughly**: Verify behavior across different connection states

## Future Enhancements

Potential improvements could include:
- User preference for position/visibility
- Custom themes and colors
- Sound notifications for connection changes
- Detailed connection metrics (latency, etc.)
- Integration with offline data sync status
