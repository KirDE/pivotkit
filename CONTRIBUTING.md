# Contributing

Thanks for helping. Bug reports and ideas go into [issues](https://github.com/eizedev/pivotkit/issues),
questions into [discussions](https://github.com/eizedev/pivotkit/discussions),
security reports privately (see [SECURITY.md](SECURITY.md)).

## Changes

1. Fork, create a branch named after the change (`feat/...`, `fix/...`, `docs/...`).
2. Follow [AGENTS.md](AGENTS.md): layout, commands and the rules that keep the packages safe and small.
3. Run `npm ci`, `npm run lint` and `npm test`; for engine changes also `npm run bench -w pivotkit-core`.
4. Add an entry under `[Unreleased]` in the `CHANGELOG.md` of each package you changed.
5. Open a pull request with a short description and what you tested; use Conventional Commits
   (`feat(core): ...`, `fix(react): ...`).

## Dependencies

Every package is pinned to an exact version with the lock file. Check the license of every library
you add: permissive (MIT, Apache-2.0, BSD) and free for companies. `pivotkit-core` has no runtime
dependency except `fflate` for the XLSX zip; keep it that way.
