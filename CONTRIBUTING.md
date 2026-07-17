# Contributing to MoveMind

Thanks for helping improve the experiment. Keep changes small, explainable, and grounded in an
observable problem.

## Before you start

1. Search existing issues and pull requests.
2. Open an issue before large behavioral or visual changes.
3. Use Node.js 24 LTS and install dependencies with `npm ci`.
4. Never commit `.env`, generated checkpoints, reports, or build output.

## Development

```bash
cp .env.example .env
npm ci
npm run dev
```

Before opening a pull request:

```bash
npm run check
npm run test:e2e
npm audit --omit=dev
```

Add tests for changed behavior. UI changes should cover keyboard use, both locales, desktop, and
mobile layout where applicable.

New games must implement the `GamePlugin` contract, register through the central game registry,
keep game-specific branches out of the trainer, and include migration notes when their persisted
format changes. The README's “Adding a game” section is the implementation checklist.

## Pull requests

- Describe the problem and the chosen approach.
- Keep unrelated refactors out of the change.
- Include before/after screenshots for visual work.
- Note any checkpoint format or API compatibility impact.
- Do not regenerate the lockfile without a dependency change.

By contributing, you agree that your work is released under the MIT License and that you will
follow the [Code of Conduct](CODE_OF_CONDUCT.md).
