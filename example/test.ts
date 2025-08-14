import { FireflyClient, protos } from "../src/index";

const authTokenGenerator = (username: string) => {
  // just for testing
  //
  // In lupyd use : () => auth.getToken()
  //
  return async () => {
    const data = JSON.stringify({
      uname: username,
      perms: 255,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    return btoa(data)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };
};

async function main() {
  const apiUrl = "http://localhost:37373";
  const wsUrl = "ws://localhost:37373/ws";

  const onMessageCallback = (msg: protos.ClientMessage) => {
    console.log(
      JSON.stringify(protos.ClientMessage.toJSON(msg), undefined, " "),
    );
  };

  const aliceClient = new FireflyClient(
    apiUrl,
    wsUrl,
    authTokenGenerator("alice"),
    onMessageCallback,
    () => {
      console.log(`Retrying failed`);
    },
  );

  const bobClient = new FireflyClient(
    apiUrl,
    wsUrl,
    authTokenGenerator("bob"),
    onMessageCallback,
    () => {
      console.log(`Retrying failed`);
    },
  );

  const _chatId = await aliceClient.createUserChat("bob"); // create or get existing chat session

  console.log(await bobClient.getUserChats()); // get all user last messages from others

  await aliceClient.initialize();
  await bobClient.initialize();

  const response = await aliceClient.sendRequest(
    protos.Request.create({
      getUserMessages: protos.GetUserMessages.create({
        before: Uint8Array.from(atob("AZikaucjQELtkqTAoNCUHQ=="), (c) =>
          c.charCodeAt(0),
        ), // this shouldn't be this complicated, just javascript nuisance
        count: 100,
        from: "bob",
      }),
    }),
  );

  for (const message of response.userMessages!.messages) {
    console.log(
      JSON.stringify(protos.UserMessage.toJSON(message), undefined, " "),
    );
    // add message to ui, probably sorted by "message.id"
  }

  // const group = await aliceClient.createGroupChat(
  //   protos.GroupChat.create({ name: "AliceGroup" }),
  // );

  // console.log({ groupCreated: group });

  {
    const response = await aliceClient.sendRequest(
      protos.Request.create({
        addChannel: protos.GroupChannel.create({
          name: "general",
          groupId: 1,
        }),
      }),
    );

    console.log(response);
  }
}

function prettyString(o: any) {
  return JSON.stringify(o, undefined, " ");
}

main();
