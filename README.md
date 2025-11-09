Contains source code for a semi-3D boids simulation.

## Requirements

- [bun.sh](https://bun.sh) (see `.bun-version`) to install dependencies and run tests.
- [python](https://www.python.org/about/) (see `.python-version`) to run CI scripts, since way easier to debug than Bash.
  <br>No external dependencies to install though.
  <br>Python standard lib is more than enough (battery included).

These are not strict requirements and you can get away using older versions - or completely different tools by tweaking the scripts.

## Quick start

0. Make sure the correct version of `python` and `bun` are available.

1. Install dependencies, build the project and start the dev server (vite) to see the demo
```sh
bun install
bun run build
bun demo
```
