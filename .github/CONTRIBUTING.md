# Contributing Guidelines

Thank you for your interest in contributing to **WoodworkingShop**!

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the issue, not the person

## Development Setup

### Prerequisites

- Node.js 20 or higher
- npm 10+
- Git
- VS Code (recommended — see `.vscode/extensions.json`)

### Setup Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/RajwanYair/WoodworkingShop.git
   cd WoodworkingShop
   ```

2. Install dependencies:

   ```bash
   npm ci
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Run the full check suite:

   ```bash
   npm run check   # typecheck + lint + format check + test
   ```

## Coding Standards

### TypeScript

- Strict mode enabled
- No unused variables or parameters (enforced by TS + ESLint)
- Use `type` imports for type-only references (`import type { ... }`)

### Formatting & Linting

- **Prettier** for formatting (`npm run format`)
- **ESLint** for code quality (`npm run lint`)
- Both are enforced in CI with zero warnings allowed

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `refactor:` restructuring without behaviour change
- `ci:` CI/CD changes
- `chore:` maintenance tasks

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run check` to verify everything passes
4. Open a PR — CI will verify typecheck, lint, format, test, and build

## Architecture

See [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for project structure, data flow, and module descriptions.
