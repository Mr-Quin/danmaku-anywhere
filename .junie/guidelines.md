# Danmaku Anywhere Development Guidelines

This document provides essential information for developers working on the Danmaku Anywhere project.

## Build/Configuration Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) (version specified in package.json)
- [pnpm](https://pnpm.io/) (version specified in package.json)

### Project Structure

This is a monorepo managed with pnpm workspaces. The main directories are:

- `packages/`: Contains the core packages
    - `danmaku-anywhere/`: Browser extension
    - `danmaku-converter/`: Danmaku conversion utilities
    - `danmaku-engine/`: Danmaku rendering engine
    - `danmaku-provider/`: Danmaku data provider and other api wrappers
- `app/`: Standalone apps
    - `web/` Angular web app
- `backend/`: Cloudflare worker based backend

## TypeScript

The project uses TypeScript with strict type checking. Configuration is in the `tsconfig.json` files.

## React

The project uses React for UI components with the following patterns:

- Functional components with hooks
- Material-UI (MUI) for UI components
- React Router for routing
- React Query for data fetching
- Zustand for state management

## Angular

For angular, follow the below best practices

- Use Tailwind CSS and DaisyUI for styling

### TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

### Angular Best Practices

- Always use standalone components over NgModules
- Don't use explicit `standalone: true` (it is implied by default)
- Use signals for state management
- Implement lazy loading for feature routes
- Use `NgOptimizedImage` for all static images.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- DO NOT use `ngStyle`, use `style` bindings instead

### State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable

### Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables

### Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
