# Firefly Client



```typescript

  const client = new FireflyClient("ws://localhost:34002",
    () => AuthHandler.getToken(),
    (message) => {
      console.log("Received Message: ", message)
    },
    () => {
      console.log(`Retries exceeded, should probably reinitialize`)
    })

    client.initialize()
    client.sendMessage({})

    // sends through the websocket 
    const response = await client.sendRequest({})

    // extend functionality using custom protobufs
  
```
