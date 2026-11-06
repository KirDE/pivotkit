# AGENTS.md

pivotkit is a pivot report builder for the web (Excel's PivotTable is the reference), in three npm
packages built from this repository with npm workspaces; see [README.md](README.md).

## Layout

- `packages/pivotkit-core/` - the engine: plain JavaScript ES modules with JSDoc types, no UI, no
  framework. `src/` (one module per concern), `test/` (`node --test`), `bench/`.
- `packages/pivotkit-react/` - the React 18/19 UI on the core. React is a peer dependency: the host
  provides it (PowerShell Universal provides React 18.3.1 at runtime), it is never bundled.
- `packages/pivotkit-element/` - the web component `<pivot-report>`; it bundles its own React for hosts
  without one (Angular, PHP, plain HTML).

## Commands

```bash
npm ci                              # install all workspaces from the lock file
npm run lint                        # ESLint, recommended rules only (as CI)
npm test                            # node --test in every workspace (as CI)
npm run bench -w pivotkit-core      # engine timings for 2k, 4k and 100k rows
```

## Rules that matter here

- A view (report template) is user input: it holds names only. Field names, aggregators, formats and
  colours are resolved against fixed lists or the data's schema; never evaluate a string from a view
  as code, never use it as an object key without an own-property check.
- Column names are matched case-insensitively; the data's own spelling is kept for display.
- `pivotkit-core` has no runtime dependency except `fflate` (zip for XLSX). The XLSX XML is written by
  hand; no SheetJS, no ExcelJS. The core builds plain ECharts option objects and does not import
  ECharts.
- Every package is pinned to an exact version with the lock file; CI installs with
  `npm ci --ignore-scripts`. Chart wrapper packages have been hijacked on npm before: prefer a small
  own wrapper over a wrapper package.
- Exports must be safe to open: CSV text cells starting with `= + - @`, tab or carriage return get a
  leading `'`; XLSX writes text as inline strings, never as formulas.
- Designed for up to about 100,000 rows: typed arrays, no per-row objects in hot loops. Run the
  benchmark before and after engine changes.
- Docs describe the current state; history belongs in each package's `CHANGELOG.md`, commits and pull
  requests. Conventional Commits with the package as scope (`feat(core): ...`).

## Do not

- Commit `node_modules/` or build output.
- Add a runtime dependency to `pivotkit-core`, or bundle React into `pivotkit-react`.
- Put secrets, host names or real data into code, examples or tests.

## Exceptions to the repository standards

- Brand assets (icon, README header, social preview): not generated yet in `eizedev/brand`; added when
  they are.
- Docs website (pivotkit.eize.dev): not built yet; follows with the React package.
- Secret scanning, push protection, private vulnerability reporting and rulesets: not available while
  the repository is private on GitHub Free; switched on when it becomes public.
