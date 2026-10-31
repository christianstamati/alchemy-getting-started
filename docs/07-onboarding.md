# Onboarding a Developer

A new developer needs a user, a group, and about 15 minutes.

## Admin

1. In **IAM Identity Center → Users**, add the user.
2. Add them to `Developers`.
3. Send them the portal URL.

Add `Platform` only if they need `production`.

## Developer

1. Accept the invitation, then set a password and MFA.

2. Sign in to the portal, and confirm you only see `development`.

3. Install Bun and the AWS CLI, then clone the repo and run `bun install`.

4. Create your AWS profile. See [Local setup](03-local-setup.md) for the prompts, using your own name as the session name and `dev` as the profile name.

   ```bash
   aws configure sso
   ```

5. Confirm it works:

   ```bash
   aws sts get-caller-identity --profile dev
   ```

6. Connect Alchemy:

   ```bash
   bun alchemy profile edit --add AWS --method sso --set ssoProfile=dev
   ```

7. Set your stage names:

   ```bash
   cp .env.example .env
   ```

   ```bash
   ALCHEMY_STAGE=dev-mario-rossi
   ALCHEMY_TEST_STAGE=test-mario-rossi
   ```

8. Deploy your own copy:

   ```bash
   bun alchemy deploy
   ```

## Daily workflow

```bash
aws sso login --sso-session mario
```

```bash
bun alchemy deploy
```

```bash
bun test test/integ.test.ts
```

Remove test copies when finished, because they have public URLs.

## Remove a developer

Remove them from their groups or disable the user in Identity Center. Then destroy their stages:

```bash
bun alchemy destroy --stage dev-mario-rossi
```

```bash
bun alchemy destroy --stage test-mario-rossi
```

The `mario.rossi` flow is documented here but hasn't been tested end to end.
