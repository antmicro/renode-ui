# Renode UI

Copyright (c) 2025-2026 [Antmicro](https://www.antmicro.com)

## Introduction

Renode UI is a modern graphical interface for interacting with [Renode](www.renode.io).
This graphical layer can be hosted either by a web browser or other web runtimes such as Neutralino or VS Code.
It communicates with a Renode instance running in server-mode using the WebSocket protocol.

Renode UI can be deployed as a static web application, packaged as a standalone desktop application (MacOS, Windows, and Linux are supported), or integrated as a component within another web page.

While this project can be used in a standalone way, its primary use is via `renode --ui` - for details see [Renode's README](https://github.com/renode/renode/blob/master/README.md).

## Project structure

The `renode-ui` project consists of the following directories:

* `frontend` - Svelte library, can build a Svelte component or a static webpage
* `neutralino` - Logic for building standalone Neutralino.js app
* `scripts` - Utilities for CI and local development

## Installation

To build Renode UI you need node and npm (node 24 is recommended).

Running via Neutralino on Linux may require [WebKitGTK](https://webkitgtk.org/) to be installed on your system.

## Development

First install & start a Renode server using:

```bash
./scripts/install_renode.sh

# Follow the instructions to add Renode to your PATH

renode --server-mode
```

Then start a Vite environment with live code reloading:

```bash
npm i --prefix=frontend/
npm run dev --prefix=frontend/
```

## Usage

| Target           | Command                                   | Output location   |
| ------           | -------                                   | ---------------   |
| Web app          | `npm run build:web --prefix="frontend/"`  | `frontend/build`  |
| Svelte component | `npm run build:lib --prefix="frontend/"`  | `frontend/dist`   |
| Desktop app      | `scripts/build_neutralino.sh`             | `neutralino/dist` |


### Use as a standalone application

In order to build a production/debug standalone app you need to simply run:

```bash
./scripts/build_neutralino.sh # For debug build set DEBUG_BUILD env var to `true`
```

The "debug" build contains additional log messages and it starts Neutralino with web developer tools opened.
Then you can start Renode websocket server with:

```bash
renode --server-mode
```

And then you can run renode-ui using one of executables present in `./neutralino/dist/renode-ui`:

```bash
./neutralino/dist/renode-ui/renode-ui-linux_x64
```

### Use as a web app

You can build renode-ui as a static web app using

```bash
npm run build:web --prefix=frontend
```

You can then start renode via `renode --servier-mode` and host the HTML/JS/CSS files present in `frontend/build` directory via any web server:

```bash
python -m http.server -d frontend/build
```

### Use as a Svelte component

renode-ui can be packaged as a Svelte component using:

```bash
npm run build:lib --prefix=frontend
```

You can then import and use the component in your project:

```jsx
import RenodeUI from 'renode-ui';

<RenodeUI
  onLoad={() => console.log('loaded')}
  onQuit={() => console.log('quit')}
  onError={() => console.log('error')}
  ...
/>
```

## License

This project is published under the [Apache-2.0](LICENSE) license.
