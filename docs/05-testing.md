# Testing

Integration tests deploy the real stack to its own stage, then call it over HTTP.

```bash
bun test test/integ.test.ts
```

The test stage comes from `ALCHEMY_TEST_STAGE`, then `test_<username>`. It ignores `ALCHEMY_STAGE`, so tests can't overwrite your dev copy.

| Test | Checks |
| --- | --- |
| Function URL | The stack outputs a URL |
| Round trip | `PUT` then `GET` returns the same body |
| Missing key | `GET` returns 404 |

The first run creates the resources, and later runs reuse them.

## Clean up

Locally, the test copy stays deployed on purpose, so re-runs are fast. It has a public URL, so remove it when you're done:

```bash
bun alchemy destroy --stage test-christian-stamati
```

`forceDestroy` empties the bucket on non-`prod` stages.

## Writing tests

Use `Test.make` with `beforeAll(deploy(Stack))`, then read outputs with `yield* stack`.

Two details matter:

- Build URLs with `new URL("hello.txt", url).href`. Function URLs end in `/`, so `${url}/hello.txt` produces a double slash.
- Retry requests, because a new Function URL can fail its first calls:

```ts
Effect.retry({ schedule: Schedule.exponential("500 millis"), times: 10 })
```

## Tests in CI

`afterAll.skipIf(!process.env.CI)(destroy(Stack))` is meant to remove the copy in CI.

That teardown doesn't work yet. The tests pass, but `destroy` fails with `another deploy holds the S3 state lock`, so the copy stays deployed. Tests aren't part of the workflow yet. If you add them, destroy in a separate step after `bun test` finishes, and verify it worked.

`CI=true` also makes Alchemy read AWS credentials from environment variables instead of your SSO profile.

## Manual checks

```bash
bun alchemy deploy
```

```bash
curl -X PUT <url>hello.txt -d 'Hello, world!'
```

```bash
curl <url>hello.txt
```

## Verified behaviour

| Stage | Result |
| --- | --- |
| `dev-<name>` | Routes pass, 512 MB |
| `test-<name>` | 3 of 3 tests pass |
| `pr-<number>` | Deploys, comments, updates the same comment, cleans up on close |
| `staging` | Deploys on push, 512 MB |
| `prod` | Routes pass, 1024 MB, unreachable from the development account |
