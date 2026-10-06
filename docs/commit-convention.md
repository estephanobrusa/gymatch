# Commit Message Convention

This repo enforces [Conventional Commits](https://www.conventionalcommits.org/) on every commit. A git hook rejects commits that don't follow the format, so it's worth understanding the rules before you commit.

## Why we enforce this

A consistent commit format makes the project history actually useful:

- **Readable history**: anyone can scan `git log` and immediately understand what each commit does and why, without opening the diff.
- **Automated tooling**: tools like changelog generators and semantic version bumpers read the commit type (`feat`, `fix`, etc.) to decide what changed and how the version number should move. This repo already has `cicd/release-version.mjs` doing semver bumps — keeping commit types consistent now makes it straightforward to wire that script (or a changelog generator) directly into commit history later, without needing to rewrite history first.
- **Easier code review and bisecting**: a well-formed commit message tells reviewers (and `git bisect`) the scope and intent of a change at a glance.

## Using the interactive CLI

You don't have to remember the exact format by hand — run `pnpm commit` instead of `git commit` and you'll be walked through it step by step:

1. **Type** — pick from a list (`feat`, `fix`, `docs`, etc.).
2. **Scope** — optional, e.g. `auth`, `mobile` (press enter to skip).
3. **Short description** — the required summary.
4. **Longer body** — optional, for extra context (press enter to skip).
5. **Breaking change?** — optional yes/no prompt; if yes, you'll be asked to describe it.
6. **Issue references** — optional yes/no prompt; if yes, you'll be asked for the closed/affected issue(s).

The CLI assembles all of this into a conventional-commits-compliant message and creates the commit for you. That commit still goes through the existing `.husky/commit-msg` hook (commitlint) as a safety net, same as any other commit.

This repo uses [Commitizen](https://github.com/commitizen/cz-cli) with the [`@commitlint/cz-commitlint`](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/cz-commitlint) adapter, so the type list and rules the CLI prompts with are read directly from `commitlint.config.mjs` — there's no separate list to keep in sync.

**Exact commands verified to work in this repo:**

- `pnpm commit` — the primary, recommended entry point.
- `pnpm exec cz` — equivalent, works the same way.
- `git cz` — only works if `./node_modules/.bin` happens to be on your `$PATH` (e.g. via direnv or a shell plugin). It is **not** on `$PATH` by default after a plain clone + `pnpm install`, so don't rely on it unless you've set that up yourself.

You can still write commits manually with `git commit -m "..."` if you prefer — the commit-msg hook validates either way, interactive CLI or not.

## The format

```
type(optional-scope): short description
```

- `type` — one of the allowed types below. Required.
- `(optional-scope)` — a short noun describing the affected area, e.g. `(auth)`, `(mobile)`, `(api)`. Optional — omit the parentheses entirely if there's no clear scope.
- `short description` — a brief summary in the imperative mood ("add", not "added" or "adds"), lowercase, no trailing period.

## Allowed types

These come from `@commitlint/config-conventional`:

| Type       | Meaning                                                              |
| ---------- | --------------------------------------------------------------------- |
| `feat`     | A new feature for the user                                            |
| `fix`      | A bug fix                                                              |
| `docs`     | Documentation-only changes                                            |
| `style`    | Changes that don't affect code behavior (formatting, whitespace, etc.) |
| `refactor` | Code change that neither fixes a bug nor adds a feature                |
| `perf`     | A change that improves performance                                     |
| `test`     | Adding or correcting tests                                             |
| `build`    | Changes to the build system or external dependencies                   |
| `ci`       | Changes to CI configuration or scripts                                 |
| `chore`    | Other changes that don't modify source or test files                   |
| `revert`   | Reverts a previous commit                                              |

## Examples

**Good:**

```
feat(mobile): add Google OAuth login button
fix(api): prevent duplicate user creation on OAuth sync
docs: explain commit convention for new contributors
refactor(auth): extract token refresh logic into a hook
```

**Bad:**

```
bad commit message
```

Rejected because there's no `type:` prefix at all — commitlint doesn't know what kind of change this is.

```
Fixed the login bug
```

Rejected because it doesn't match `type(scope?): description` — there's no colon-separated type, and "Fixed" isn't a recognized type keyword.

## How it's enforced

The check runs automatically via a git hook at `.husky/commit-msg`, which runs on every `git commit`. The hook is installed automatically whenever you run `pnpm install`, thanks to the `prepare` script in the root `package.json` — there's no manual setup needed after cloning the repo.

If your commit message doesn't follow the format, the commit is rejected before it's created, and commitlint tells you exactly what's wrong.

## Bypassing (emergency only)

In a genuine emergency, you can skip the check with:

```sh
git commit --no-verify -m "your message"
```

This should be rare and discouraged — it defeats the purpose of consistent history. If you find yourself using `--no-verify` often, it's worth revisiting the commit type you're trying to use, or asking whether a new scope/type is needed.
