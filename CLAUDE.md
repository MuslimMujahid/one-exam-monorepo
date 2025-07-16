# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a secure online exam platform with offline capabilities, built as an Nx monorepo with multiple applications:

- **core-backend**: NestJS API server with PostgreSQL/Prisma
- **student-client**: React/Vite client for taking exams
- **student-client-electron**: Electron wrapper for offline exam support
- **teacher-client**: Next.js app for creating and managing exams
- **proctoring-ai**: Python app for AI-based exam proctoring
- **shared/ui**: Reusable React components with Tailwind CSS
- **shared/utils**: Shared TypeScript utilities

## Development Commands

### Start Development Environment
```bash
# Start all student apps (client + electron + backend)
pnpm student/all:start:dev

# Start only student client apps (no backend)
pnpm student/client:start:dev

# Start all teacher apps (client + backend)
pnpm teacher/all:start:dev

# Start individual apps
nx serve core-backend
nx serve student-client
nx serve teacher-client
```

### Build Commands
```bash
# Build all projects
nx run-many -t build

# Build specific project
nx build core-backend
nx build student-client
nx build teacher-client
```

### Testing
```bash
# Run tests for all projects
nx run-many -t test

# Run tests for specific project
nx test core-backend
nx test student-client
nx test teacher-client

# Run e2e tests
nx e2e teacher-client-e2e
nx e2e core-backend-e2e
```

### Linting
```bash
# Lint all projects
nx run-many -t lint

# Lint specific project
nx lint student-client
nx lint teacher-client
```

### Database Operations
```bash
# Generate Prisma client
npx prisma generate --schema=apps/core-backend/prisma/schema.prisma

# Run migrations
npx prisma migrate dev --schema=apps/core-backend/prisma/schema.prisma

# Reset database
npx prisma migrate reset --schema=apps/core-backend/prisma/schema.prisma

# Open Prisma Studio
npx prisma studio --schema=apps/core-backend/prisma/schema.prisma
```

### Security & Keys
```bash
# Generate encryption keys
node generate-keys.js

# Reset keys
pnpm reset-keys
```

## Architecture Overview

### Backend Architecture (NestJS)
- **Prisma ORM**: Database operations with PostgreSQL
- **JWT Authentication**: Role-based access (STUDENT/TEACHER)
- **Exam Management**: Create, publish, and manage exams
- **Session Management**: Track exam sessions and submissions
- **Cryptographic Security**: Exam content encryption with unique keys
- **Offline Support**: ZIP-based submission processing

### Frontend Architecture

#### Student Client (React/Vite)
- **React Query**: API state management
- **Zustand**: Local state management
- **React Router**: Navigation
- **Tailwind CSS**: Styling
- **Offline Capabilities**: Service worker for offline exams
- **Connection Monitoring**: Real-time connection status

#### Teacher Client (Next.js)
- **Next.js App Router**: Server-side rendering
- **React Query**: API state management
- **Tailwind CSS**: Styling
- **JWT Authentication**: Server and client-side auth

#### Electron Client
- **Offline Exam Support**: Desktop app for secure offline exams
- **Cryptographic Operations**: Client-side encryption/decryption
- **Submission Management**: ZIP file creation and processing

### Key Features
- **Exam Creation**: CSV import, question management
- **Secure Exam Sessions**: Encrypted content, time limits
- **Offline Exam Support**: Full offline capability with sync
- **Proctoring**: AI-based suspicious activity detection
- **Submission Processing**: Automated grading and analysis

### Database Schema
- **Users**: Role-based (STUDENT/TEACHER)
- **Exams**: Encrypted content with status tracking
- **ExamSessions**: User exam attempts
- **Questions**: Support for multiple question types
- **ExamSubmissions**: Final processed submissions with anomaly detection

### Shared Libraries
- **@one-exam-monorepo/ui**: Reusable components (Button, Dialog, Input, etc.)
- **@one-exam-monorepo/utils**: Shared utilities and types

## Security Considerations

- All exam content is encrypted using unique per-exam keys
- JWT tokens for authentication with role-based access
- Offline submissions are cryptographically signed
- Proctoring AI analyzes submissions for suspicious patterns
- Database cascading deletes ensure data consistency

## Environment Setup

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `PORT`: Backend server port (default: 5000)

## Common Development Patterns

### Adding New Components
1. Create in appropriate shared/ui location if reusable
2. Export from shared/ui/src/index.ts
3. Import using @one-exam-monorepo/ui in apps

### API Development
1. Create schemas in NestJS modules using Zod
2. Use Prisma for database operations
3. Implement proper error handling and validation

### State Management
- Use React Query for server state
- Use Zustand for complex local state
- Context API for simple shared state

### Testing
- Jest for unit tests
- React Testing Library for component tests
- Cypress for e2e tests
- Use nx test commands for consistency
