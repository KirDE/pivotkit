# Security policy

## Scope

The packages in this repository (`pivotkit-core`, `pivotkit-react`, `pivotkit-element`). A view
(report template) and the data can come from users; anything that lets a view run code, read data it
should not, or makes an exported CSV or XLSX file dangerous to open is in scope. Vulnerabilities in a
dependency (for example Apache ECharts or fflate) belong to that project; tell us too if a package
ships an affected version.

## Reporting a vulnerability

Please report privately through GitHub's
[Report a vulnerability](https://github.com/eizedev/pivotkit/security/advisories/new)
(Security tab, Advisories), not in a public issue. If you cannot use GitHub, email `oss@eize.dev`.

Include the package and version, the host (browser, framework), steps to reproduce and what you
expected.

## Supported versions

The latest released version of each package.
