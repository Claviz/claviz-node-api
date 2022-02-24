# claviz-node-api

[Docs](https://claviz-node-api.netlify.app/)

Node.js API wrapper for Claviz.

## Installation

```
npm install claviz-node-api
```

## Example

```ts
const { ClavizClient, getClavizToken } = require("claviz-node-api");

(async () => {
  const url = "https://forms.claviz";
  const token = await getClavizToken(url, "admin@claviz.com", "Passw0rd");
  const clavizClient = new ClavizClient(url, token);

  console.log(await clavizClient.getCurrentUser());
})();
```
