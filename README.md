# Release Check

Check if a push or pull request should trigger a release.

This action is a handy helper for checking if a change should lead to a release. The action checks if the changes affect the code base of the business logic or if only package logistics are affected. The action helps to keep unnecessary releases low if one uses automatic releases through github actions. This action is designed to work with `dependabot` updates. It aims to avoid extra releases when only the logistics have changed but not the actual business logic.

The `release-check` answers two questions. 

1. Have changed only files in protected paths?
2. Have changed only development dependencies?

If the answers to these questions are true, then no release is necessary. Development dependencies are currently only checked against JavaScript `package.json` objects.

`release-check` uses [`Octokit`](https://octokit.github.io/rest.js) for comparing the changes. There is no need to checkout the repository.

The default protected paths are: 

- `.github`
- `.gitignore`
- `tests/`
- `test/`
- `package-lock.json`
- `package.json`

It is possible to add additional paths through the `protected-paths` input. 

## Inputs

### `protected-paths`

**Optional** A list of protected paths that don't contain any business logic that would result into a release. Examples for such protected paths are the `.gitignore` file or the `.github` directories. 

## Outputs

###  `proceed`

Boolean: is set to true, if the changes affect non-protected paths or upstream dependencies

### `hold_development`

Boolean: is set to true, if the changes affect only development dependencies (`devDependencies` in `package.json`).

### `hold_protected`

Boolean: is set to true, if the changes affect only changes in protected paths. It is false, if only upstream dependencies in package.json have changed.

## Example Usage

Basic usage

```
name: Release Action

on:
- push
- pull_request:
    branches: 
      - master

jobs:
  build:
    runs-on: ubuntu-latest
    steps: 
    - id: release
      uses: phish108/release-check@1.0.6-main.3
      with: 
        github-token: ${{ secrets.GITHUB_TOKEN }}

    - if: ${{ steps.release.outputs.proceed }}
      uses: phish108/autotag-action@1.1.27
      with: 
        github-token: ${{ secrets.GITHUB_TOKEN }}
```

Advanced usage

```
name: Release Action

on:
- push
- pull_request:
    branches: 
      - master

jobs:
  build:
    runs-on: ubuntu-latest
    steps: 
    - id: release
      uses: phish108/release-check@1.0.6-main.3
      with: 
        github-token: ${{ secrets.GITHUB_TOKEN }}
        protected-paths: | 
          README.md
          .eslintrc

    - if: ${{ steps.release.outputs.proceed }}
      uses: phish108/autotag-action@1.1.27
      with: 
        github-token: ${{ secrets.GITHUB_TOKEN }}
```
