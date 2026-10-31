# Local Setup

This connects your machine to AWS through SSO, then connects Alchemy to those AWS profiles.

The chain is:

```text
bun alchemy deploy
  → Alchemy profile     (~/.alchemy/profiles/default/aws.json)
  → AWS CLI profile     (~/.aws/config)
  → SSO session         (your portal login)
  → AWS account + role
```

## Requirements

- [Bun](https://bun.sh)
- AWS CLI v2
- GitHub CLI, only for [CI/CD](06-ci-cd.md)

Run `bun install`. Alchemy is a project dependency, so use `bun alchemy`. Docs showing bare `alchemy` mean the same thing. Avoid a global install, as a beta CLI can drift from the project's version. Homebrew has no package for it.

## AWS CLI

`aws configure sso` is the standard way to create profiles. It signs you in and lists your accounts.

```bash
aws configure sso
```

| Prompt | Answer |
| --- | --- |
| SSO session name | Your first name |
| SSO start URL | Portal URL from Identity Center settings |
| SSO region | `eu-central-1` |
| SSO registration scopes | Press Enter |
| Account and role | Choose one |
| Default client region | `eu-central-1` |
| Output format | `json` |
| Profile name | See below |

Run it once per account, reusing the same session name.

| Profile | Account | Role |
| --- | --- | --- |
| `admin-dev` | `development` | `DevAdmin` |
| `admin-prod` | `production` | `ProdAdmin` |
| `admin-mgmt` | Management | `ManagementAdmin` |

The result in `~/.aws/config`:

```ini
[sso-session christian]
sso_start_url = <PORTAL_URL>
sso_region = eu-central-1
sso_registration_scopes = sso:account:access

[profile admin-dev]
sso_session = christian
sso_account_id = <DEV_ACCOUNT_ID>
sso_role_name = DevAdmin
region = eu-central-1
output = json
```

The session says who you are, and each profile says where you're working. One sign-in covers every profile on that session.

```bash
aws sso login --sso-session christian
```

```bash
aws sts get-caller-identity --profile admin-dev
```

Keep `[default]` without credentials, so every AWS command must name a profile.

## Alchemy profiles

| Alchemy profile | AWS profile | Used for |
| --- | --- | --- |
| `default` | `admin-dev` | Everyday work |
| `production` | `admin-prod` | Production reads and role changes |
| `admin` | `admin-dev` | The GitHub stack |

```bash
bun alchemy profile edit --add AWS --method sso --set ssoProfile=admin-dev
```

```bash
bun alchemy profile create production
```

```bash
bun alchemy profile edit --profile production --add AWS --method sso --set ssoProfile=admin-prod
```

```bash
bun alchemy profile create admin
```

```bash
bun alchemy profile edit --profile admin --add AWS --method sso --set ssoProfile=admin-dev
```

SSO profiles hold no secrets. Check them with:

```bash
bun alchemy profile list
```

## Stage names

Copy the example file, then set your name:

```bash
cp .env.example .env
```

```bash
ALCHEMY_STAGE=dev-christian-stamati
ALCHEMY_TEST_STAGE=test-christian-stamati
```

`.env` is ignored by Git and only needs setting once per machine. Without it, Alchemy falls back to `live_<username>` and `test_<username>`.

Pass `--stage local-<name>` to `bun alchemy dev`, or it will replace your real `dev-<name>` copy. See [Local development](04-alchemy-stack.md#local-development).

Always pass `--stage` for production. Otherwise `--profile production` alone would deploy a copy named after your dev stage into the production account.

## Where configuration lives

| Location | Controls |
| --- | --- |
| `alchemy.run.ts` | Stack, resources and outputs |
| `~/.alchemy/profiles/*/aws.json` | Which AWS profile each Alchemy profile uses |
| `~/.aws/config` | SSO sessions and CLI profiles |
| `.env` | Your personal stage names |
| `~/.aws/sso/cache` | Sign-in tokens, managed by the CLI |
| `.alchemy/` | Local logs, ignored by Git |
