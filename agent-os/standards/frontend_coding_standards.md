# Frontend Coding Standards

These standards apply to the frontend codebase, primarily built with React and JavaScript.

## Technologies

*   **Language:** JavaScript (ESNext) with JSX.
*   **Framework:** React.
*   **Build Tool:** Vite.

## Linting and Formatting

The project uses ESLint to enforce code quality and consistency. The configuration is based on `eslint.config.js` and includes:

*   **Base Configuration:** Recommended rules from `@eslint/js`.
*   **React Hooks:** Rules from `eslint-plugin-react-hooks` (recommended flat configuration).
*   **React Refresh:** Rules for React Fast Refresh from `eslint-plugin-react-refresh`.

### Specific ESLint Rules

*   **`no-unused-vars`:** Unused variables are treated as a **warning** (yellow), not an error, unless the variable name starts with an uppercase letter or an underscore (`^[A-Z_]`). This allows for some flexibility with unused variables during development but enforces stricter rules for clearly defined constants or global-like variables.

## File Naming Conventions

*   React components should use the `.jsx` extension (e.g., `App.jsx`, `main.jsx`).

## General Practices

*   Follow idiomatic React patterns for component structure, state management, and props.
*   Prioritize clear, readable, and maintainable code.
