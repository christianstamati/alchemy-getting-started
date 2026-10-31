# Alchemy Stack

The app is a Lambda with a public function URL that stores objects in S3.

| Route | Result |
| --- | --- |
| `PUT /<key>` | Saves the body, returns 204 |
| `GET /<key>` | Returns the object, or 404 |
| Other methods | 405 |

## Files

| File | Purpose |
| --- | --- |
| `alchemy.run.ts` | Stack name, providers, state, outputs, PR comment |
| `src/api.ts` | Lambda, bucket, permissions, request handling |

## Bootstrap each account

Lambda code is uploaded to an assets bucket, which Alchemy won't create on real AWS. Run this once per account and region, before the first Lambda deploy:

```bash
bun alchemy provider aws bootstrap --aws-profile admin-dev --region eu-central-1
```

Both flags are needed. Without `--aws-profile`, it uses the AWS `default` profile, which has no credentials here.

| Bucket | Created by | Holds |
| --- | --- | --- |
| `alchemy-assets-<account>-<region>-an` | Bootstrap | Lambda zips |
| `alchemy-state-<account>-<region>-an` | First deploy | Deployment state. Do not touch it |

Stages, developers and projects in the same account share these. Old zips can be removed safely:

```bash
aws s3 rm s3://alchemy-assets-<ACCOUNT_ID>-eu-central-1-an/lambda/ --recursive --profile admin-dev
```

## Commands

| Command | Does |
| --- | --- |
| `bun alchemy plan` | Previews changes |
| `bun alchemy deploy` | Applies changes after confirmation |
| `bun alchemy destroy` | Removes the stage's resources |
| `bun alchemy dev` | Runs with live reload |
| `bun alchemy logs --tail` | Streams logs |
| `bun alchemy drift` | Compares the stack with what's deployed |
| `bun alchemy profile list` | Lists profiles |
| `bun alchemy state list` | Lists stored state |

Useful flags are `--stage`, `--profile`, `--yes`, `--dry-run`, `--detailed` and `--no-input`.

## Profile vs stage

| Flag | Chooses | Example |
| --- | --- | --- |
| `--profile` | AWS account | `--profile production` |
| `--stage` | Which copy of the app | `--stage prod` |

Each stage has its own state and resources, so stages don't affect each other.

## Identity and naming

A resource's identity comes from the stack name, its logical ID and the stage.

```text
pluto-bucket-dev-christian-stamati-<random-suffix>
stack  logical ID  stage
```

- Treat stack names and logical IDs as permanent once deployed. Renaming the stack creates a new stack and leaves the old one running.
- Changing the stage also leaves the old copy behind. Destroy it with `--stage <old>`.
- Always check `bun alchemy plan` before a rename.
- Prefer generated names. S3 names are global, and a fixed name would clash across stages.

## Stage-specific settings

Read the stage in `src/api.ts`:

```ts
Stack.useSync((stack) => ({
  main: import.meta.url,
  functionUrl: true,
  memorySize: stack.stage === "prod" ? 1024 : 512,
})),
```

```ts
const { stage } = yield* Stack;
const bucket = yield* S3.Bucket("Bucket", {
  forceDestroy: stage !== "prod",
});
```

| Setting | `prod` | Other stages |
| --- | --- | --- |
| `memorySize` | 1024 MB | 512 MB |
| `forceDestroy` | Off | On |

The property is `memorySize`. The tutorial's `memory` passes the type check and even appears in the plan, but it's ignored, leaving the 128 MB default.

## Protecting data

| Goal | Option |
| --- | --- |
| Refuse to delete a bucket with files | `forceDestroy: false` |
| Keep a resource when its stack is destroyed | `RemovalPolicy.retain(stack.stage === "prod")` |

`retain` leaves the resource in AWS and stops tracking it. It takes effect on the next deploy, even if the plan shows no changes. Import it through `Alchemy.RemovalPolicy` from `alchemy`. It is not used in this project yet.

There's no built-in equivalent of SST's stage-level `protect`.

## Imports

Import narrowly in Lambda code:

```ts
import * as Lambda from "@alchemy.run/aws/Lambda";
```

Importing the whole `@alchemy.run/aws` package makes the bundler warn about optional `mongodb`, `pg` and `mysql2` drivers. Those warnings are harmless, and you shouldn't install those packages to silence them.
