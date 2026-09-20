# Glob Regex

Convert glob patterns to anchored regular expressions.

```js
import { globToRegExp } from 'glob-regex';

const re = globToRegExp('src/**/*.js', { globstar: true });
re.test('src/components/Button.js'); // true
```

## Why this library exists

Glob matching and regular expressions solve overlapping problems, but translating between
them by hand is error-prone. This library encodes one clear subset of glob syntax and returns
a `RegExp` that matches the entire string, so callers can use standard regex methods without
surprises from partial matches.

The trade-off is deliberate: only `*`, `**`, `?`, `[...]`, and `{a,b}` (with `extended`)
are supported. Extglob, nested braces, and platform-specific path handling are out of scope.
Patterns that use unsupported syntax are treated as literal text rather than guessed at.

## Awkward edge

`**` is opt-in via `{ globstar: true }`. Without that option, `**` behaves like two
consecutive `*` patterns, which matches only within a single path segment. This avoids
surprising cross-directory matches when callers expect plain `*` semantics.
