# `@bun-and-butter/error`

<img src="doc/logo.webp" alt="Logo" width="200" style="border-radius: 32px; padding: 8px 0;" />

A tiny Bun-first foundation for strongly typed domain errors in TypeScript.
Define consistent error classes with machine-readable codes, default messages,
optional causes, and structured metadata.

`@bun-and-butter/error` gives you a single base class for building application errors
with:

- machine-readable error codes
- consistent default messages
- optional `cause` support
- structured metadata for logs and diagnostics
- a discriminator field for easier narrowing

## Installation

This package is Bun-only.

We do not publish prebuilt artifacts to npm or another package registry. `@bun-and-butter/error` is installed directly from the GitHub repository and that is the recommended install path for the current version.

For the exact `bun add` behavior, see the
[Bun docs on Git dependencies](https://bun.com/docs/pm/cli/add#git-dependencies).

```sh
bun add git@github.com:bun-and-butter/error.git
```

## Quick Start

```ts
import { BaseError } from "@bun-and-butter/error";

enum UserErrorCode {
    InvalidID = "USER-1000",
    InvalidUsername = "USER-1001",
}

class UserError extends BaseError<UserErrorCode> {
    readonly type = "UserError" as const;

    static readonly messages = {
        [UserErrorCode.InvalidID]: "The provided user identifier is not a valid UUID v7",
        [UserErrorCode.InvalidUsername]: "The username must be between 3 and 20 characters long",
    } as const satisfies Record<UserErrorCode, string>;

    static invalidID(cause?: unknown): UserError {
        return new UserError(UserErrorCode.InvalidID, { cause });
    }

    static invalidUsername(username: string): UserError {
        return new UserError(UserErrorCode.InvalidUsername, {
            meta: { username },
        });
    }
}
```

## Why Use It

Plain `Error` objects are often enough until you need one of these:

- distinguish failures by stable codes instead of parsing strings
- preserve low-level exceptions with `cause`
- attach structured context like IDs or field names
- model domain errors with a type-safe API

`BaseError` keeps those concerns small and consistent.

## Works Well With "TypeScript Result"

If you prefer returning typed results instead of throwing immediately,
`@bun-and-butter/error` pairs nicely with
[`typescript-result`](https://www.typescript-result.dev).

That combination works especially well when you want:

- strongly typed domain errors
- explicit success and failure return values
- predictable error handling without relying only on exceptions

## Examples

The repository currently includes two examples:

- [`examples/demo.ts`](./examples/demo.ts) shows the "throwing" style with a
  typed domain error, static factory methods, and narrowing via `instanceof`
- [`examples/with_typescript_result.ts`](./examples/with_typescript_result.ts)
  shows a result-based alternative using `typescript-result`, `Result.try(...)`,
  and explicit success and failure return values

## Design Notes

- `BaseError` restores the prototype chain so `instanceof` checks work
  reliably.
- The `type` discriminator helps keep concrete subclasses distinct during
  TypeScript narrowing.
- The generic `Code` parameter ensures only valid codes can be assigned to an
  error instance.

## Recommended Pattern

For each domain, define:

1. an enum of stable error codes
2. one error class extending `BaseError`
3. a `messages` map covering every code
4. optional static factories like `invalidID()` for common failure cases

This gives you readable call sites and a consistent error surface across the
codebase.
