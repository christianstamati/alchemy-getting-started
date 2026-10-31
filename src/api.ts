import * as Lambda from "@alchemy.run/aws/Lambda";
import * as S3 from "@alchemy.run/aws/S3";
import { Stack } from "alchemy/Stack";
import * as Effect from "effect/Effect";
import { HttpServerRequest } from "effect/http/HttpServerRequest";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import * as Layer from "effect/Layer";

export default class Api extends Lambda.Function<Api>()(
  "Api",
  Stack.useSync((stack) => ({
    main: import.meta.url,
    functionUrl: true,
    memory: stack.stage === "prod" ? 1024 : 512,
  })),
  Effect.gen(function* () {
    const bucket = yield* S3.Bucket("Bucket", {
      forceDestroy: true,
    });
    const putObject = yield* S3.PutObject(bucket);
    const getObject = yield* S3.GetObject(bucket);

    return {
      fetch: Effect.gen(function* () {
        const request = yield* HttpServerRequest;
        const key = new URL(request.url).pathname.slice(1);

        if (request.method === "PUT") {
          const body = yield* request.text;
          yield* putObject({ Key: key, Body: body });
          return HttpServerResponse.empty({ status: 204 });
        }

        if (request.method === "GET") {
          const result = yield* getObject({ Key: key }).pipe(
            Effect.catchTag("NoSuchKey", () => Effect.succeed(undefined)),
          );
          if (!result?.Body) {
            return HttpServerResponse.text("Not found", { status: 404 });
          }
          return HttpServerResponse.stream(result.Body!);
        }

        return HttpServerResponse.text("Method not allowed", { status: 405 });
      }).pipe(Effect.orDie),
    };
  }).pipe(Effect.provide(Layer.mergeAll(S3.PutObjectHttp, S3.GetObjectHttp))),
) {}
