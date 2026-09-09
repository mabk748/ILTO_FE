# ILTO Frontend

ILTO is a dark-mode personal operations dashboard covering projects,
infrastructure, health, finances, learning, work, social, appearance, and
logistics. It is built with React, TypeScript, Vite, Tailwind CSS, Radix UI,
TanStack Query, and Recharts.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run build
npm run lint
npm test
npm run prettier-check
```

## Current data sources

The nine domain clients in `src/lib/api` still use their existing n8n webhook
defaults. The Intelligence, trigger-rule, and notification screens are
explicitly frontend simulations and are not an operational automation engine.

The API URL field in Settings is saved locally for the upcoming backend
integration, but intentionally does not alter the existing clients yet. Domain
visibility settings are active immediately after saving and control both the
sidebar and dashboard cards.

## Backend integration boundary

Before connecting the new backend, centralize the domain-specific URL handling,
authentication headers, request cancellation, and response validation in one
HTTP client. Avoid changing individual endpoints independently: the current
clients do not all interpret `VITE_API_BASE` in the same way.

Deferred legacy code in the original API modules is marked with
`TO BE CLEANED: START` and `TO BE CLEANED: END` comments so it can be removed in
a separate cleanup pass.
