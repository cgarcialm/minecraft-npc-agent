# Contributing

Thanks for contributing.

## Workflow
1. Open an issue for significant changes before coding.
2. Create a focused branch per checkpoint or feature.
3. Keep pull requests scoped and easy to review.
4. Use clear commit messages (`feat(...)`, `fix(...)`, `refactor(...)`, `chore(...)`).

## Planning and Checkpoints
Follow the project plan and testing gates:
1. `docs/PROJECT_PLAN.md`
2. `docs/TESTING_CHECKLIST.md`

## Development Expectations
1. Keep changes focused in `agent_ts/src` unless broader change is necessary.
2. Preserve local-first defaults (no AWS requirement for baseline runtime).
3. Route tool/action execution through shared safety controls.
4. Avoid introducing unrelated refactors in the same PR.

## Before Opening a PR
1. Run required checks from `docs/TESTING_CHECKLIST.md`.
2. Ensure `npm run build` passes in `agent_ts`.
3. Confirm the diff matches only intended scope.

## Pull Request Checklist
1. Problem statement and scope are clear.
2. Acceptance criteria for the checkpoint are satisfied.
3. Test evidence is included (build output and runtime checks).
4. Any temporary exceptions (e.g., missing lint script) are noted.

## Code of Conduct
By participating, you agree to follow `CODE_OF_CONDUCT.md`.
