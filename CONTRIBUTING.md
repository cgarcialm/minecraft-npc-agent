# Contributing

Use the docs index for process and quality gates:
1. `docs/README.md`

For each MR:
1. Keep changes scoped to one checkpoint.
2. Follow implementation, testing, and review checklists in `docs/`.
3. Ensure `npm run build` passes in `agent_ts`.
4. Ensure GitHub Actions `PR Validation / Validate agent_ts` is green before merge.
5. Ensure GitHub Actions `PR Validation / Validate MR handoff format` is green before merge.

Repository admins should set branch protection on `main` to require the
`PR Validation / Validate agent_ts` and
`PR Validation / Validate MR handoff format` status checks.

By participating, you agree to `CODE_OF_CONDUCT.md`.
