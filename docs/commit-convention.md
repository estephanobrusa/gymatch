# Commit Message Convention

This repo enforces [Conventional Commits](https://www.conventionalcommits.org/) on every commit. A git hook rejects commits that don't follow the format, so it's worth understanding the rules before you commit.

## Why we enforce this

A consistent commit format makes the project history actually useful:

- **Readable history**: anyone can scan `git log` and immediately understand what each commit does and why, without opening the diff.
- **Automated tooling**: tools like changelog generators and semantic version bumpers read the commit type (`feat`, `fix`, etc.) to decide what changed and how the version number should move. This repo already has `cicd/release-version.mjs` doing semver bumps — keeping commit types consistent now makes it straightforward to wire that script (or a changelog generator) directly into commit history later, without needing to rewrite history first.
- **Easier code review and bisecting**: a well-formed commit message tells reviewers (and `git bisect`) the scope and intent of a change at a glance.

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
