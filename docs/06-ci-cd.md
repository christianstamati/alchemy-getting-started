# CI/CD

GitHub Actions deploys with short-lived credentials through OIDC, so no AWS keys are stored in GitHub.

| Event | Stage | Account | Role |
| --- | --- | --- | --- |
| PR opened or updated | `pr-<number>` | Development | `github-actions` |
| PR closed | Destroys `pr-<number>` | Development | `github-actions` |
| Push to `main` | `staging` | Development | `github-actions` |
| After `staging`, with approval | `prod` | Production | `github-actions-prod` |

## Files

| File | Purpose | Run |
| --- | --- | --- |
| `stacks/github.ts` | OIDC provider, dev role, repo variables | Once, from a laptop |
| `stacks/github-prod.ts` | OIDC provider, prod role, approval environment | Once, from a laptop |
| `.github/workflows/deploy.yml` | Deploys and cleanup | On every event |

## Setup

1. Create the GitHub repo and note its numeric IDs:

   ```bash
   gh api repos/<OWNER>/<REPO>/actions/oidc/customization/sub
   ```

2. Update the owner, repo and `sub` values in both stack files.

3. Bootstrap both accounts. See [Alchemy stack](04-alchemy-stack.md).

4. Deploy the dev role:

   ```bash
   GITHUB_TOKEN="$(gh auth token)" bun alchemy deploy --config stacks/github.ts --profile admin --stage github
   ```

5. Deploy the prod role:

   ```bash
   GITHUB_TOKEN="$(gh auth token)" bun alchemy deploy --config stacks/github-prod.ts --profile production --stage github
   ```

6. Confirm these repository variables exist: `AWS_ROLE_ARN`, `AWS_ROLE_ARN_PROD` and `AWS_REGION`.

7. Push to `main`.

Variables hold no secrets. Only re-run the stack files when changing a role or the environment.

## OIDC subject

Newer GitHub repos use an immutable subject with numeric IDs, so `repo:owner/repo:*` never matches. Use the value from step 1:

| Role | Condition | Value |
| --- | --- | --- |
| Dev | `StringLike` | `repo:<OWNER>@<OWNER_ID>/<REPO>@<REPO_ID>:*` |
| Prod | `StringEquals` | `repo:<OWNER>@<OWNER_ID>/<REPO>@<REPO_ID>:environment:production` |

The prod role only trusts jobs running in the `production` environment.

To debug a sign-in failure, look up `AssumeRoleWithWebIdentity` in CloudTrail. Its `userName` shows the exact subject GitHub sent.

## Production approval

`stacks/github-prod.ts` creates a GitHub environment named `production`, with a required reviewer and deployments limited to `main`.

To release, open the run in **Actions**, choose **Review deployments**, tick `production`, then **Approve and deploy**. Reject to stop it, which changes nothing.

Turn on `preventSelfReview` in a real team, so authors can't approve their own deploys.

## Previews

Each PR gets its own stage, and the URL is posted as a comment. Later pushes update that comment. Closing the PR destroys the stage, while the old comment stays on the PR.

The cleanup job refuses to touch `prod` and `staging`.

`GITHUB_TOKEN` must be passed to both the deploy and destroy steps, and the job needs `pull-requests: write`.

## Differences from the Alchemy tutorial

| Tutorial | This repo | Why |
| --- | --- | --- |
| One role and account | One role per account | Dev and prod are separate accounts |
| `main` deploys `prod` | `main` deploys `staging`, then `prod` with approval | Adds a gate |
| Branch name as a stage | Removed | Unused, and avoids a branch name in a shell command |
| `yield* AWS.Region` | `yield* yield* AWS.Region` | The single form breaks the variable at deploy time |
| No `GITHUB_TOKEN` on cleanup | Added | Destroy may need to reach the comment |

## Known limits

- Both roles use `AdministratorAccess`. Anyone who can push can use the dev role, so narrow it.
- This repo is public, so Actions logs and PR comments expose function URLs.
- Local `plan` on `prod` shows `[Api] update` with no code changes, because Alchemy stores the file path, which differs between a laptop and CI. Deploy `prod` through CI only.
