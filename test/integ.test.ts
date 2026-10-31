import * as AWS from "@alchemy.run/aws";
import * as Test from "alchemy/Test/Bun";
import { expect } from "bun:test";
import * as Effect from "effect/Effect";
import * as HttpBody from "effect/http/HttpBody";
import * as HttpClient from "effect/http/HttpClient";
import * as Schedule from "effect/Schedule";
import Stack from "../alchemy.run.ts";

const { test, beforeAll, afterAll, deploy, destroy } = Test.make({
  providers: AWS.providers(),
  state: AWS.state(),
});

const stack = beforeAll(deploy(Stack));

afterAll.skipIf(!process.env.CI)(destroy(Stack));

test(
  "stack exposes a function url",
  Effect.gen(function* () {
    const { url } = yield* stack;

    expect(url).toBeString();
  }),
);

test(
  "PUT and GET round-trip an object",
  Effect.gen(function* () {
    const { url } = yield* stack;

    const put = yield* HttpClient.put(new URL("hello.txt", url).href, {
      body: HttpBody.text("Hello, World!"),
    }).pipe(
      Effect.retry({ schedule: Schedule.exponential("500 millis"), times: 10 }),
    );
    expect(put.status).toBe(204);

    const get = yield* HttpClient.get(new URL("hello.txt", url).href).pipe(
      Effect.retry({ schedule: Schedule.exponential("500 millis"), times: 10 }),
    );
    expect(yield* get.text).toBe("Hello, World!");
  }),
);

test(
  "GET missing key returns 404",
  Effect.gen(function* () {
    const { url } = yield* stack;

    const response = yield* HttpClient.get(new URL("no-such-key", url).href).pipe(
      Effect.retry({ schedule: Schedule.exponential("500 millis"), times: 10 }),
    );
    expect(response.status).toBe(404);
  }),
);
