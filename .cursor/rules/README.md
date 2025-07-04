# Cursor Rules for Danmaku Anywhere

This directory contains Cursor rules that help maintain code quality and consistency across the Danmaku Anywhere monorepo.

## Rule Files

### `project-overview.mdc`
- **Always Applied**: Yes
- **Purpose**: Provides overall project context, technology stack, and project structure
- **Content**: Project overview, technology stack details, key configuration files

### `typescript-standards.mdc`
- **Applied to**: All TypeScript files (`*.ts`, `*.tsx`)
- **Purpose**: General TypeScript coding standards and best practices
- **Content**: TypeScript best practices, code style, file organization, testing, performance, error handling, state management, API design

### `angular-standards.mdc`
- **Applied to**: Angular files (`app/web/**/*.ts`, `app/web/**/*.html`)
- **Purpose**: Angular-specific best practices and patterns
- **Content**: Component development, state management, performance, testing

### `react-standards.mdc`
- **Applied to**: React files (`packages/danmaku-anywhere/**/*.tsx`, `packages/danmaku-anywhere/**/*.ts`)
- **Purpose**: React-specific best practices and patterns
- **Content**: Component development, state management, performance, testing, error handling

### `backend-standards.mdc`
- **Applied to**: Backend files (`backend/**/*.ts`)
- **Purpose**: Backend development standards for Cloudflare Workers
- **Content**: Cloudflare Workers best practices, API design, security, performance, testing

### `extension-standards.mdc`
- **Applied to**: Extension files (`packages/danmaku-anywhere/**/*.ts`, `packages/danmaku-anywhere/**/*.tsx`)
- **Purpose**: Browser extension development best practices
- **Content**: Extension best practices, security, performance, user experience, testing

### `web-scraping-standards.mdc`
- **Applied to**: Web scraper files (`packages/web-scraper/**/*.ts`)
- **Purpose**: Web scraping guidelines and best practices
- **Content**: Ethical scraping, technical implementation, performance, data processing

## Migration from Legacy Rules

These rules have been migrated from the legacy `.cursorrules` file to the new `.cursor/rules` format. The new format provides:

1. **Better Organization**: Rules are split by concern and file type
2. **Targeted Application**: Rules only apply to relevant files using glob patterns
3. **Improved Maintainability**: Each rule focuses on a specific area
4. **Better Performance**: Rules are only loaded when needed

## Usage

The rules are automatically applied by Cursor based on their configuration:
- `alwaysApply: true` - Applied to all files
- `globs: "pattern"` - Applied only to files matching the pattern
- `description: "text"` - Can be manually applied by referencing the description

## Maintenance

When updating rules:
1. Keep rules focused and specific
2. Use appropriate glob patterns to target relevant files
3. Reference configuration files using the `[filename](mdc:filename)` format
4. Test rules by editing files in the targeted directories 