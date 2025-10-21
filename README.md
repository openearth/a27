# A27 Frontend

A Vue.js application with Vuetify for mapping and data visualization.

## Quick Start

### Prerequisites
- Node.js 22+
- npm

### Installation


1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run lint` - Fix ESLint issues automatically
- `npm run lint:check` - Check for ESLint issues (used in CI)

## Branching Strategy

### Creating Feature Branches
Always create branches with descriptive names that include the ticket/issue number:


### Branch Naming Convention
- `feature/a27plat-XXX-description` - New features
- `bugfix/a27plat-XXX-description` - Bug fixes


### Branch Strategy
- **Major changes**: Create PR to `develop` branch
  - New features
  - Significant refactoring
  - Breaking changes
  - Complex bug fixes
- **Small changes**: Create PR directly to `main` branch
  - Minor bug fixes
  - Documentation updates
  - Small UI improvements
  - Dependency updates


