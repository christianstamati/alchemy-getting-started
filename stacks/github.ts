import * as Alchemy from "alchemy";
import * as AWS from "@alchemy.run/aws";
import * as GitHub from "@alchemy.run/github";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export default Alchemy.Stack(
  "github",
  {
    providers: Layer.mergeAll(AWS.providers(), GitHub.providers()),
    state: AWS.state(),
  },
  Effect.gen(function* () {
    const oidc = yield* AWS.IAM.OpenIDConnectProvider("GitHubOidc", {
      url: "https://token.actions.githubusercontent.com",
      clientIDList: ["sts.amazonaws.com"],
      // GitHub's well-known OIDC thumbprint. AWS auto-discovers
      // thumbprints for github.com these days, but the provider's
      // thumbprint sync still requires a non-empty list.
      thumbprintList: ["6938fd4d98bab03faadb97b34396831e3780aea1"],
    });

    const role = yield* AWS.IAM.Role("GitHubActionsRole", {
      roleName: "github-actions",
      assumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Federated: oidc.openIDConnectProviderArn,
            },
            Action: ["sts:AssumeRoleWithWebIdentity"],
            Condition: {
              StringEquals: {
                "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
              },
              StringLike: {
                "token.actions.githubusercontent.com:sub":
                  "repo:christianstamati@48362853/alchemy-getting-started@1440759436:*",
              },
            },
          },
        ],
      },
      managedPolicyArns: ["arn:aws:iam::aws:policy/AdministratorAccess"],
    });

    const region = yield* yield* AWS.Region;

    yield* GitHub.Variable("aws-role-arn", {
      owner: "christianstamati",
      repository: "alchemy-getting-started",
      name: "AWS_ROLE_ARN",
      value: role.roleArn,
    });

    yield* GitHub.Variable("aws-region", {
      owner: "christianstamati",
      repository: "alchemy-getting-started",
      name: "AWS_REGION",
      value: region,
    });
  }),
);
