import { FireflyClient } from "../src/index";

const client = new FireflyClient(
  "http://localhost:39205",
  "ws://localhost:39205",
  () => Promise.resolve("alice"),
  (msg) => {
    console.log(msg);
  },
  () => console.error(`Max retries exceeded`),
);

await client.initialize();

await new Promise((res) => setTimeout(() => res(1), 1000));

client.dispose();
