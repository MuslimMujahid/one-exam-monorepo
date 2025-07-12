# Dashboard Components

This directory contains the ### `AlertBanner`
- **Purpose**: Reusable alert/notification banner for various types of messages
- **Props**:
  - `type`: 'error' | 'success' | 'warning' | 'info' (default: 'info')
  - `message`: String message to display
  - `className`: Optional additional CSS classes
- **Features**: Uses `cva` (Class Variance Authority) for consistent styling variantsar components that make up the Student Dashboard page. Each component has a single responsibility to improve maintainability and reusability.

## Components Overview

### `DashboardHeader`
- **Purpose**: Renders the top header with welcome message, title, and action buttons
- **Props**:
  - `userName`, `userEmail`: User information
  - `onLogout`: Logout handler
  - `onJoinExam`: Join exam modal trigger

### `ExamStatsGrid`
- **Purpose**: Displays a grid of statistical cards showing exam counts
- **Props**:
  - `totalExams`: Total number of exams
  - `availableNow`: Number of exams available to take now
  - `upcoming`: Number of scheduled exams
  - `downloaded`: Number of downloaded exams

### `ExamCard`
- **Purpose**: Renders an individual exam card with all exam details and actions
- **Props**:
  - `exam`: Exam object
  - `status`: Exam status object with text and color
  - `canTakeExam`: Boolean indicating if exam can be taken
  - `isDownloaded`: Boolean indicating if exam is downloaded
  - `isDownloading`: Boolean indicating if exam is currently downloading
  - `timeUntilStart`, `timeUntilEnd`: Optional time remaining strings
  - `onDownload`: Download handler
  - `onTakeExam`: Take exam handler

### `ExamGrid`
- **Purpose**: Container component that renders a grid of exam cards or empty state
- **Props**:
  - `exams`: Array of exam objects
  - `downloadedExams`: Record of downloaded exam statuses
  - `downloadingExams`: Set of currently downloading exam codes
  - Various utility functions and handlers

### `JoinExamModal`
- **Purpose**: Modal dialog for joining an exam with code and pass key
- **Props**:
  - `isOpen`: Boolean controlling modal visibility
  - `examCode`, `passKey`: Form field values
  - `joinError`, `joinSuccess`: Status messages
  - `isPending`: Loading state
  - Various handlers for form interaction

### `LoadingSpinner` (from `@one-exam-monorepo/ui`)
- **Purpose**: Reusable loading spinner component with multiple size and color variants
- **Props**:
  - `size`: 'sm' | 'md' | 'lg' | 'xl' | '2xl' (default: 'md')
  - `color`: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' (default: 'primary')
  - `fullScreen`: Boolean to make the container full screen (default: false)
  - `className`, `containerClassName`: Optional additional CSS classes
- **Features**: CVA-powered variants for consistent sizing and theming

### `AlertBanner` (from `@one-exam-monorepo/ui`)
- **Purpose**: Reusable alert/notification banner for various types of messages
- **Props**:
  - `type`: 'error' | 'success' | 'warning' | 'info' (default: 'info')
  - `message`: String message to display
  - `className`: Optional additional CSS classes
- **Features**: Uses `cva` (Class Variance Authority) for consistent styling variants

## Benefits of This Structure

1. **Single Responsibility**: Each component has one clear purpose
2. **Reusability**: Components can be easily reused in other parts of the app
3. **Testability**: Individual components can be unit tested in isolation
4. **Maintainability**: Changes to specific functionality are contained to relevant components
5. **Readability**: The main DashboardPage is much cleaner and easier to understand
6. **Type Safety**: Each component has well-defined TypeScript interfaces
7. **Consistent Styling**: Uses `cva` (Class Variance Authority) and `cn` utilities for maintainable CSS classes

## Utility Functions

The components leverage utility functions from `@one-exam-monorepo/utils`:

- **`cn`**: Utility for merging CSS classes with conflict resolution
- **`cva`**: Class Variance Authority for creating component variants with consistent styling
- **`VariantProps`**: TypeScript utility for extracting variant prop types from cva definitions

## Usage

```tsx
// Dashboard-specific components
import {
  DashboardHeader,
  ExamStatsGrid,
  ExamGrid,
  JoinExamModal,
} from '../components/dashboard';

// Shared UI components
import { LoadingSpinner, AlertBanner } from '@one-exam-monorepo/ui';
```

## File Structure

```
components/dashboard/
├── index.ts              # Barrel export file
├── DashboardHeader.tsx   # Header component
├── ExamStatsGrid.tsx     # Stats grid component
├── ExamCard.tsx          # Individual exam card
├── ExamGrid.tsx          # Exam cards container
├── JoinExamModal.tsx     # Join exam modal
└── README.md             # This documentation

# Shared UI components (from @one-exam-monorepo/ui)
shared/ui/src/lib/
├── loading-spinner/      # Loading spinner component
└── alert-banner/         # Alert/notification banner
```
