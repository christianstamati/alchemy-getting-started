# Monorepo

A monorepo doesn't need an `alchemy.run.ts` in every app. One file at the root can deploy everything, and that's the recommended starting point.

This guide is based on Alchemy's docs and hasn't been built in this repo yet.

## Choosing a structure

| | Single Stack | One Stack per package |
| --- | --- | --- |
| `alchemy.run.ts` | One at the repo root | One in each app |
| Deploys | Everything in one plan | Each app on its own |
| Sharing values | Direct, in the same plan | Typed cross-stack reference |
| Deploy order | Handled for you | You manage it |
| Best when | One team ships together | Separate teams or schedules, or the API has other consumers |

Start with a single Stack. Split only when `api` and `web` need to ship or be destroyed separately.

## Single Stack with TanStack Start

The app lives in `apps/web`, and only the root stack changes:

```ts
const Website = AWS.Website.TanStackStart("Website", {
  rootDir: "./apps/web",
});

export default Alchemy.Stack(
  "Pluto",
  {
    providers: Layer.mergeAll(AWS.providers(), GitHub.providers()),
    state: AWS.state(),
  },
  Effect.gen(function* () {
    const api = yield* Api;
    const site = yield* Website;

    return {
      url: api.functionUrl,
      site: site.url,
    };
  }),
);
```

`rootDir` points to the folder with the app's `package.json` and `vite.config.*`. Leave it out when the app sits beside `alchemy.run.ts`.

The `site.url` output is an assumption, and so is how to pass `api.functionUrl` into the site. Check both before building.

## Setup

- Install `@alchemy.run/frontend-frameworks` as a dev dependency.
- Keep the scaffolded `vite.config.ts`, and remove `@cloudflare/vite-plugin` if the CLI added it.
- Check `eu-central-1` first. The server uses Lambda Web Functions, which only run in some regions. Elsewhere, set `server: "function"`.

## What it creates

| Resource | Purpose |
| --- | --- |
| Server Lambda | Runs SSR and streams responses |
| Private S3 bucket | Client assets |
| CloudFront | Serves assets and routes requests |
| CloudFront Function | Sends built assets to S3 and everything else to the server |
| ACM certificate and Route 53 records | Custom domain only. The certificate is in `us-east-1` |

The site's execution role is managed for you, and you can't add permissions to it through a prop.

## Sources

- [Alchemy monorepo guide](https://alchemy.run/project-structure/monorepo)
- [TanStack Start on AWS](https://alchemy.run/aws/frontend/tanstack-start)
