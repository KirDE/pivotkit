# pivotkit

Pivot report builder for the web: drag-and-drop fields, table and chart (Apache ECharts), templates as
JSON, native Excel export; as a JavaScript core, a React component and a web component.

| | |
| --- | --- |
| Build | [![CI](https://github.com/eizedev/pivotkit/actions/workflows/ci.yml/badge.svg)](https://github.com/eizedev/pivotkit/actions/workflows/ci.yml) |
| License | [![MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE) |

Status: in development. Nothing is published to npm yet.

## Packages

| Package | What | Status |
| --- | --- | --- |
| [pivotkit-core](packages/pivotkit-core/) | The engine in plain JavaScript, no UI and no framework | in development |
| [pivotkit-react](packages/pivotkit-react/) | React 18/19 report builder; React is provided by the host | planned |
| [pivotkit-element](packages/pivotkit-element/) | Web component `<pivot-report>` with its own React, for Angular, PHP and plain HTML | planned |

## License

[MIT](LICENSE). Charts are drawn with [Apache ECharts](https://echarts.apache.org/) (Apache-2.0).
