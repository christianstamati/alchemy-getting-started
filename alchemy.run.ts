import * as Alchemy from "alchemy";
import * as AWS from "@alchemy.run/aws";
import * as GitHub from "@alchemy.run/github";
import * as Output from "alchemy/Output";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import Api from "./src/api.ts";

export default Alchemy.Stack(
  "Pluto",
  {
    providers: Layer.mergeAll(AWS.providers(), GitHub.providers()),
    state: AWS.state(),
  },
  Effect.gen(function* () {
    const api = yield* Api;

    if (process.env.PULL_REQUEST) {
      yield* GitHub.Comment("preview-comment", {
        owner: "christianstamati",
        repository: "alchemy-getting-started",
        issueNumber: Number(process.env.PULL_REQUEST),
        body: Output.interpolate`
          ## Preview Deployed

          **URL:** ${api.functionUrl}

          Built from commit ${process.env.GITHUB_SHA?.slice(0, 7)}

          ---
          _This comment updates automatically with each push._
        `,
      });
    }

    return {
      url: api.functionUrl,
    };
  }),
);