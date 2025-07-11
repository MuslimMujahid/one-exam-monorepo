You are assisting me with a large NX monorepo for an exam platform called "one-exam-monorepo". This project includes:

# Frontend applications:

- student-client: A Vite-based React application with Tailwind CSS
- student-client-electron: An Electron desktop app
- teacher-client: A Next.js application with Tailwind CSS

# Backend services:

- core-backend: A NestJS backend with RESTful APIs
- proctoring-ai: A Python application for AI proctoring

# Shared libraries:

- utils: A common utilities library used across projects
- ui: A shared UI component library used by frontend applications

# When suggesting code or solutions:

- Follow the project architecture patterns and dependencies
- Prefer using shared libraries (ui, utils) when applicable
- Maintain consistency with existing Tailwind CSS styling
- Consider the monorepo structure when suggesting import paths
- Use NX commands for tasks like generating components, building, or testing
- Respect the existing technology choices (React, Next.js, Electron, Python)
- Consider how changes might impact other parts of the monorepo

# For specific suggestions on:

- Frontend components: Prioritize reusability and adherence to existing UI patterns
- Backend endpoints: Follow RESTful conventions used in core-backend
- TypeScript: Ensure type safety and consistency across the codebase
- TypeScript: Use interface for defining component props and types for anything else
