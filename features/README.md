# Springstack BDD Specs

Behavior-driven development tests using Cucumber.js and Gherkin.

## Framework

- **Cucumber.js** v10.7.0
- **Config:** `cucumber.js` (project root)
- **Run:** `npm test`

## Directory Structure

```
features/
├── *.feature              - Gherkin scenarios
├── step_definitions/      - Step implementations (.js)
└── support/               - World, hooks, utilities
```

## Writing Tests

1. **Create feature file:** `features/my-feature.feature`
2. **Write Gherkin scenarios:**
   ```gherkin
   Feature: My feature
     Scenario: Do something
       Given initial state
       When action happens
       Then expect result
   ```
3. **Implement steps:** `features/step_definitions/my-steps.js`
4. **Run:** `npm test`

## Tag System

- **`@skip`** - Excludes scenario from test runs
  - Configured via `cucumber.js`: `tags: 'not @skip'`
  - Use for unimplemented scenarios
  - Remove when step definitions are ready

## Running Tests

```bash
npm test                              # All tests (excluding @skip)
npm test features/springstack.feature # Specific feature
npm test -- --tags "@wip"             # Filter by tag
npm test -- --tags "not @skip"        # Explicit skip filter
```

## Current Status

The `springstack.feature` file is tagged with `@skip` and will be excluded until step definitions are implemented.
