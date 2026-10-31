# Troubleshooting

## SSO and AWS CLI

| Error | Cause | Fix |
| --- | --- | --- |
| `Token has expired and refresh failed` | SSO session expired | `aws sso login --sso-session <name>` |
| `AWS SSO credentials need to be refreshed` | Same | Same |
| `No AWS accounts are available to you` | Sign-in worked, but the user has no assignments | Create the permission sets and assign the groups |
| `Request refers to an Identity Center instance that does not exist` | `sso_start_url` points to a deleted instance | Use the current portal URL |
| `InvalidRequestException` on `RegisterClient` | Same | Same |
| `Unable to locate credentials` | The AWS `default` profile has no credentials | Add `--profile admin-dev` |
| `Profile 'default' is already configured with Access Key credentials` | `aws login` won't use a profile with keys | Use SSO |

Deleting an Identity Center instance also deletes its permission sets and assignments. Recreate them on the new instance.

## Alchemy

| Error | Cause | Fix |
| --- | --- | --- |
| `Could not read package manifests` | A `.DS_Store` in `node_modules/@alchemy.run/` | Delete that file from the project root |
| `Unknown subcommand "aws"` | Same. The file hides provider commands | Same |
| `Assets bucket not found` | The account isn't bootstrapped | Run the bootstrap command |
| `Profile default not found` | `bootstrap` or `teardown` ran without flags | Add `--aws-profile` and `--region` |
| `Provider 'AWS' is not registered` | Alchemy ran outside the project | Run it from the project root |
| `BucketNotEmpty` | The bucket has files and `forceDestroy` is off | Empty it, then destroy again |
| `alchemy not found` | The CLI isn't on your PATH | Use `bun alchemy` |
| `another deploy holds the S3 state lock` | Another run holds the stage, or `CI=true` test teardown | Wait for the other run. See [Testing](05-testing.md) |
| `[UNRESOLVED_IMPORT]` | Optional drivers in a broad import | Harmless. Import from `@alchemy.run/aws/Lambda` |

`forceDestroy` only applies once deployed. Adding it to code won't help a bucket that's already blocking a destroy.

If `destroy` finishes without removing what you expected, check the stage. Plain `destroy` targets `ALCHEMY_STAGE` from `.env`.

Finder can recreate `.DS_Store` if you open that folder.

## AWS Organizations

| Error | Cause | Fix |
| --- | --- | --- |
| `ConstraintViolationException` on Remove | The account isn't ready to be standalone | Close it instead |

Root can't switch roles. Use the SSO portal, or sign in as an IAM user if you have one.

## GitHub Actions

| Error | Cause | Fix |
| --- | --- | --- |
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` | The role's `sub` condition doesn't match | Use the numeric subject. Check CloudTrail for the value sent |
| `Invalid property /value` when creating a variable | `yield* AWS.Region` returned an Effect | Use `yield* yield* AWS.Region` |

## Stale settings

| Symptom | Cause | Fix |
| --- | --- | --- |
| `alchemy dev` deleted a real bucket or Lambda | It shared a stage with a real deployment | Use `--stage local-<name>` |
| `alchemy dev` created resources in `us-east-1` | The emulator's region is hardcoded | Nothing. It's local only |
| Lambda has 128 MB | `memory` was used | Use `memorySize` |
| Renaming the stack created a new bucket | The stack name is its identity | Destroy the old stack, using the old name in code temporarily |
| A second copy appeared | The stage changed | `bun alchemy destroy --stage <old>` |
