# Contributing

Thank you for your interest in contributing to gg-friggin-ez!

## Reporting Bugs

Before opening an issue:

- Search existing issues to avoid duplicates
- Include clear reproduction steps with the exact sample text tested
- Include your runtime environment (Node.js version, Bun version, and operating system)
- Include any relevant error logs or unexpected classification outcomes

## Feature Requests & Language Presets

Contributions are very welcome, including:

- Additional language presets or regional dialect nuances
- Improved evasion patterns (leetspeak, zero-width characters, spacing tricks)
- Framework integrations (Express/Fastify moderation middleware, Discord bots, Twitch bots)

Please describe:

- The use case or problem you are solving
- Why it would benefit other developers
- Any proposed API or schema additions

## Development Workflow

Clone the repository and install dependencies:

```bash
git clone https://github.com/ItisShikhar/gg-friggin-ez.git
cd gg-friggin-ez
npm install
```

Build the library (`dist/`):

```bash
npm run build
```

Run the test suite (requires [Bun](https://bun.sh)):

```bash
bun test
```

Run the local interactive demo server:

```bash
bun run start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Pull Requests

Please make sure that:

- The project builds cleanly (`npm run build`)
- Existing tests pass (`bun test`)
- New functionality or language additions include corresponding test cases
- Core library code in `src/` remains strictly decoupled from demo data in `src/demo/`
- Documentation in `README.md` is updated when necessary
- Pull requests are focused on a single feature or bug fix

## Coding Style

- Written in TypeScript
- Keep public APIs simple, intuitive, and strongly typed
- Prefer small, focused, composable modules
- Keep core library bundle lightweight (no heavy dependencies)
- Write meaningful commit messages

Thank you for helping improve gg-friggin-ez!
