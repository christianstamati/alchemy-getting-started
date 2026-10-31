# AWS Organization

Set up one organization with a management account and separate accounts per environment.

## Concepts

| Term | Meaning |
| --- | --- |
| Organization | A group of accounts with one combined bill |
| Management account | Owns the organization and pays for members. Keep workloads out of it |
| Member account | Any other account, such as `development` |
| Root user | The all-powerful login every account has. Separate from the management account |

Billing is per organization. Member costs roll up to the management account, and Cost Explorer can show them per account. Use a separate organization for each separate business.

## Secure the management account

1. Sign in as root.
2. Open **Security credentials** and add MFA.
3. Confirm root has no access keys.

## Create the member accounts

In **AWS Organizations → AWS accounts**, choose **Add an AWS account → Create an AWS account**.

| Field | Development | Production |
| --- | --- | --- |
| Name | `development` | `production` |
| Email | `you+development@example.com` | `you+production@example.com` |
| IAM role name | `OrganizationAccountAccessRole` | `OrganizationAccountAccessRole` |

Each account needs a unique email, including accounts that were closed. Use a company address in real organizations, so the root email can move with the company.

Accounts created this way usually have no root password until you use "Forgot password".

## Remove vs close

| Action | Result | Requirement |
| --- | --- | --- |
| Remove from organization | Becomes a standalone account with its own bill | Own payment method and contact details |
| Close account | Shuts down, permanently after 90 days | Management account access |

To get rid of an account, close it. Removing a closed account fails and isn't needed.

```bash
aws organizations close-account --account-id <ACCOUNT_ID> --profile admin-mgmt
```

The management account closes last, as root, in the console only, after all members are closed or removed.

## After setup

Do not keep IAM users. Once [Identity Center](02-identity-center.md) works, remove them, and use root only for root-only tasks.

Before deleting the last IAM user, confirm an SSO user can reach the management account. Otherwise root is the only way in.
