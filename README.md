Contains source code for a semi-3D boids simulation.

## Requirements

- `python` (see `.python-version`) to run CI scripts. No external dependencies required though.
- `node` (see `.nvmrc`) to support vite and vitest mostly, or `nvm` to install it.
- `pnpm` to install npm dependencies. Only if you want to be able to use reliably the pnpm scripts.

These are not strict requirements and you might get away using older versions, but I don't want to test all possible combinations.

## Quick start

0. Make sure the right version of `node` and `pnpm` are available.
  - `node` can be activated using `nvm`
    ```sh
    nvm use
    ```
  - `pnpm` can be installed globally using `npm`
    ```sh
    npm install -g pnpm
    ```

1. Install dependencies, build the project and start the dev server (vite) to see the demo

```sh
pnpm install
pnpm build
pnpm demo
```
