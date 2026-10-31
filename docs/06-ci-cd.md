# CI/CD

> CI is currently turned off. This guide describes the full setup. To restore it, bootstrap both accounts, follow Setup below, and recover the workflow from Git history:
>
> ```bash
> mkdir -p .github/workflows && git show 41ac010:.github/workflows/deploy.yml > .github/workflows/deploy.yml
> ```

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

## The stacks folder

`stacks/` holds CI setup, not the app. These are separate stacks with their own state, and `bun alchemy deploy` never touches them. The folder name is only a convention.

| | `alchemy.run.ts` | `stacks/*` |
| --- | --- | --- |
| Stack | `Pluto` | `github`, `github-prod` |
| Creates | App resources | OIDC provider, IAM role, GitHub variables and environment |
| Deployed | All the time, per stage | Once per account, then rarely |
| Deployed by | CI or a developer | An admin, from a laptop |

They're kept apart because:

- CI needs the role before it can deploy anything.
- A role exists once per account, while previews would each try to create it.
- Creating IAM roles needs admin access.
- Destroying the app shouldn't remove CI access.

Each account needs its own role, which is why there are two files.

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

Only re-run the stack files when changing a role or the environment.

## Repository variables

Values live in GitHub, under **Settings → Secrets and variables → Actions → Variables**, not in the code or AWS.

```bash
GH_PAGER=cat gh variable list --repo <OWNER>/<REPO>
```

| Where | Holds |
| --- | --- |
| GitHub repo settings | The value |
| `stacks/*.ts` | The definition |
| Alchemy state in S3 | A record that Alchemy created it |
| `deploy.yml` | Reads it as `${{ vars.AWS_ROLE_ARN }}` |

Change variables in the stack file, not the settings page, so Alchemy's state stays correct.

Variables are for non-sensitive values and can appear in logs. Secrets are hidden. A role ARN or region isn't sensitive, so no AWS secrets are stored in GitHub.

## Removing CI

Roles are safe to leave idle, as they cost nothing and hold no keys. To remove one, destroy its stack rather than using the console:

```bash
GITHUB_TOKEN="$(gh auth token)" bun alchemy destroy --config stacks/github.ts --profile admin --stage github
```

```bash
GITHUB_TOKEN="$(gh auth token)" bun alchemy destroy --config stacks/github-prod.ts --profile production --stage github
```

`bun alchemy destroy` on the app won't remove these. Check the plan lists only the stack's resources before confirming.

Removing the development stack removes `AWS_ROLE_ARN` and `AWS_REGION`, which breaks previews and `staging`. It also blocks `prod`, because `deploy-prod` needs the `deploy` job and uses `AWS_REGION`. Live apps keep running.

Update `deploy.yml` afterwards, or those workflows will fail at AWS sign-in. To restore a role, run its `deploy` command again.

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
