# Dodo Checkout

Small embeddable checkout demo for the Dodo Payments assignment.

## What is here?

```text
sdk/                 iframe SDK used by the merchant page
demo/                example store and callback log
checkout/            payment form and fake payment logic
scripts/             Render build script
render.yaml          one-click Render Static Site configuration
```

The flow is intentionally simple:

1. The demo selects a fake product.
2. `DodoCheckout.open(...)` creates an iframe.
3. The checkout collects email and card details.
4. The checkout sends payment events with `postMessage`.
5. The SDK calls `onSuccess`, `onError`, or `onClose`.

Card details never leave the checkout iframe.

Opening `/checkout/` directly is intentionally blocked. The checkout only
initializes when it is embedded by the SDK, so customers enter payment details
inside the intended merchant flow rather than treating the hosted form as a
standalone page.

## Run locally

Install dependencies:

```bash
cd checkout
npm install
cd ../demo
npm install
```

Start the checkout in one terminal:

```bash
cd checkout
npm run dev -- --host localhost --port 5174
```

Start the demo in another terminal:

```bash
cd demo
npm run dev -- --host localhost --port 5173
```

Open `http://localhost:5173`.

From the repository root, these shortcuts do the same thing:

```bash
npm run checkout
npm run demo
```

## Deploy to Render

This is a **Static Site**, not a Web Service.

1. Push the repository to GitHub or GitLab.
2. In Render, choose **New > Blueprint**.
3. Select the repository.
4. Render reads `render.yaml` automatically.

The important settings are:

```text
Build command:    npm run build:render
Publish directory: demo/dist
Start command:    leave empty
```

The build creates:

```text
demo/dist/              demo website
demo/dist/checkout/     checkout iframe
```

## Embed API

```html
<script src="/dodo-checkout.js"></script>
<script>
  DodoCheckout.open({
    productId: "prod_123",
    amount: 49,
    onSuccess: ({ sessionId }) => console.log("paid", sessionId),
    onClose: ({ reason }) => console.log("closed", reason),
    onError: ({ code, message }) => console.error(code, message),
  });
</script>
```

`amount` is only for keeping this fake demo synchronized. A real payment
integration must use a server-created, signed checkout session for pricing.

## Test cards

| Card | Result |
| --- | --- |
| `4242 4242 4242 4242` | succeeds |
| `4000 0000 0000 0002` | declines |
| `4000 0000 0000 0341` | fails once, then succeeds on retry |

## Why this flow?

- Only one checkout can be open at a time, preventing duplicate overlays.
- The pay button locks while payment is processing.
- Declines stay in the modal so the customer can retry.
- Load failures and timeouts notify the host and clean up the iframe.
- If the browser goes offline during payment, the attempt stops with
  `NETWORK_ERROR`; the modal stays open so the customer can reconnect and
  retry, and the host receives `onError`.
- The SDK validates the message origin and iframe source.
- Escape closes the modal and page scrolling is restored after close.

## Decisions and next steps

I chose the browser History API instead of adding a router because the demo
only needs one success route. I also pass the fake amount into the iframe so
the product picker and checkout visibly agree; production pricing must not
trust this client-controlled value.

Next I would add a server-created checkout session, configurable checkout
origins, runtime message validation, focus trapping, and browser tests for
network interruption and refresh.

## Checks

```bash
cd demo
npm run lint
npm run build

cd ../checkout
npm run lint
npm run build
```
