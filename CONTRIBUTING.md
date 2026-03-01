# Contributing

Use the docs index for process and quality gates:
1. `docs/README.md`

For each MR:
1. Keep changes scoped to one checkpoint.
2. Follow implementation, testing, and review checklists in `docs/`.
3. Ensure `npm run build` passes in `agent_ts`.
4. Ensure GitHub Actions `pr-validation / agent-checks` is green before merge.
5. Ensure GitHub Actions `pr-validation / handoff-checks` is green before merge.
6. Update `docs/MR_HANDOFF.md` using `docs/MR_HANDOFF_TEMPLATE.md`.

Repository admins should set branch protection on `main` to require the
`pr-validation / agent-checks` and
`pr-validation / handoff-checks` status checks.

By participating, you agree to `CODE_OF_CONDUCT.md`.
