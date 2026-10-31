# IAM Identity Center

Identity Center provides SSO. You enable it rather than install it, and it has no charge of its own.

An organization has one instance, in one primary region. Everyone signs in at one portal URL, and their groups decide which accounts they see.

> Do not delete the instance. There is no disable option, and deleting it removes all users, groups, permission sets and assignments. A new instance also gets a new portal URL.

## Enable it

1. Sign in as root to the management account.
2. Set the console region. This project uses `eu-central-1`.
3. Open **IAM Identity Center** and enable it for the organization.
4. Note the portal URL from **Settings → Identity source**.

The region is where Identity Center runs, not a limit on where you can deploy.

## Permission sets

A permission set is a reusable list of what someone can do. Assigning one to a group on an account creates a matching IAM role there.

Create these under **Multi-account permissions → Permission sets**, using **Predefined → AdministratorAccess**:

| Name | Session | Assigned to |
| --- | --- | --- |
| `DevAdmin` | 12 hours | `development` |
| `ProdAdmin` | 8 hours | `production` |
| `ManagementAdmin` | 1 hour | Management account |

The account limits the access, so `DevAdmin` gives nothing in `production`.

Avoid `PowerUserAccess` for deployers. It cannot manage IAM, and Alchemy may need to create IAM roles.

## Groups

Assign access to groups, not users.

| Group | Purpose |
| --- | --- |
| `Developers` | Day-to-day development work |
| `Platform` | Runs and deploys production |
| `OrgAdmins` | Manages the organization, SSO and billing |

## Assignments

Under **Multi-account permissions → AWS accounts**, tick an account, choose **Assign users or groups**, open the **Groups** tab, then pick the group and permission set.

| Account | Group | Permission set |
| --- | --- | --- |
| `development` | `Developers` | `DevAdmin` |
| `development` | `Platform` | `DevAdmin` |
| `production` | `Platform` | `ProdAdmin` |
| Management | `OrgAdmins` | `ManagementAdmin` |

## Users

Under **Users → Add user**, enter a username and email, choose **Send an email to this user with password setup instructions**, then add the user to groups.

| Username | Groups |
| --- | --- |
| `mario.rossi` | `Developers` |
| `christian.stamati` | `Platform`, `OrgAdmins` |

- Usernames cannot be changed in the console. To rename one, delete and recreate the user.
- Each user needs a unique email.
- Invitations expire after 7 days. Resend with **Reset password**.
- Real companies usually sync users from Google Workspace, Okta or Microsoft Entra ID, with the work email as the username.

## Require MFA

Check **Settings → Authentication** and require MFA at sign-in.

## Verify

Sign in at the portal and open the **Accounts** tab.

| User | Should see |
| --- | --- |
| Developer | `development` only |
| Admin | All three accounts |

Then click a role to open the console in that account. Set an account color in the account menu so `production` is easy to recognise.
