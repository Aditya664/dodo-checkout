# Dodo Checkout

Tiny embeddable checkout built for the Dodo Payments frontend assignment.

## Demo

Run the demo locally:

```bash
cd checkout
npm install
npm run dev -- --host localhost --port 5174
```

In a second terminal:

```bash
cd demo
npm install
npm run dev -- --host localhost --port 5173
```

Open `http://localhost:5173`.

The demo lets you choose between three fake products before opening checkout.
The checkout runs at `localhost:5174` in an iframe, so card fields belong to
the checkout origin rather than the merchant page.

## Deploy to Render

This repository includes a Render Blueprint in [`render.yaml`](./render.yaml).
It deploys one static site containing both apps:

- `/` serves the demo.
- `/checkout/` serves the hosted checkout iframe.

Using one static site makes the production iframe same-origin with the demo
while keeping the checkout UI and card fields isolated in a separate document.

To deploy:

1. Push the repository to GitHub or GitLab.
2. In Render, choose **New > Blueprint**.
3. Select the repository and apply `render.yaml`.
4. Open the generated `onrender.com` URL.

Do not create this as a Render **Web Service**. It is a Render **Static Site**
Blueprint. If you configure it manually, use **Static Site**, set the build
command to `npm run build:render`, and set the publish directory to
`demo/dist`. Leave the start command empty.

If the Render service was created manually as a Web Service instead of from
the Blueprint, use:

- **Build command:** `bash scripts/build-render.sh`
- **Start command:** `npm start`
- **Environment:** Node

The root `npm start` serves the already-built `demo/dist` folder on Render's
`PORT`. `npm run dev` is also available as a compatibility alias for an
existing service configured with that command; it is not the Vite development
server.

The build is performed by [`scripts/build-render.sh`](./scripts/build-render.sh).
It builds both Vite apps and copies the checkout output into
`demo/dist/checkout`. The SDK automatically uses `/checkout/` in production
and `localhost:5174` when running the two local dev servers.

## The embed API

The host page adds the bundled script and opens checkout:

```html
<script src="/dodo-checkout.js"></script>
<script>
  DodoCheckout.open({
    productId: "prod_123",
    amount: 49,
    onSuccess: ({ sessionId }) => {
      console.log("paid", sessionId);
    },
    onClose: ({ reason }) => {
      console.log("closed", reason);
    },
    onError: ({ code, message }) => {
      console.error(code, message);
    },
  });
</script>
```

`amount` is included in this demo so the selected fake product and modal
always show the same value. A real integration should resolve the amount from
the merchant's server or a signed checkout session, never trust a browser
amount for payment authorization.

## How the pieces communicate

1. `demo/src/App.tsx` selects a product and calls the SDK.
2. `sdk/dodo-checkout.ts` creates a full-screen overlay and iframe, passing
   `productId` and `amount` as URL parameters.
3. `checkout/src/App.tsx` resolves the product, collects customer/payment
   fields, and simulates payment locally.
4. The checkout iframe sends typed `postMessage` events to its parent.
5. The SDK accepts messages only from the configured checkout origin and the
   current iframe window, then invokes the host callback.

The checkout never sends card details to the host page. Only lifecycle data
crosses the iframe boundary:

- `DODO_CHECKOUT_READY`
- `DODO_PAYMENT_SUCCESS`
- `DODO_PAYMENT_ERROR`
- `DODO_CHECKOUT_CLOSE`

## Fake cards

| Card number | Result |
| --- | --- |
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Always declined |
| `4000 0000 0000 0341` | Fails once, then succeeds on retry |

Any other card is rejected as an unsupported test card.

## Product decisions

### 1. One checkout at a time

Calling `open` while a checkout is already open is a no-op. This prevents
double overlays and duplicate payment attempts. The checkout form also locks
while a payment request is processing.

### 2. Errors are explicit and recoverable

Validation errors stay inside the checkout so the customer can correct and
retry. Load failures and load timeouts are reported through `onError` and
clean up the overlay, leaving the host page usable. User close, successful
payment, and programmatic close each produce a host callback.

### Two decisions I went back and forth on

1. **Router dependency vs. a small success route.** I chose the browser History
   API for the demo success screen. It demonstrates the host receiving the
   payment result without adding a routing dependency to a tiny integration.
2. **Host-controlled amount vs. product-only checkout.** I exposed the amount
   to keep the fake product picker and iframe visibly synchronized, but called
   out the security boundary: production pricing must come from a trusted
   server-side session, not a client-controlled URL.

## What I would explore next

- Replace the local payment service with a server-created, signed checkout
  session.
- Make the checkout origin configurable and publish a versioned SDK artifact.
- Add a message schema validator and contract tests for malformed
  `postMessage` payloads.
- Add focus trapping and an explicit parent-page focus restoration strategy.
- Test browser/device behavior around iframe loading, network interruption,
  refresh, and back-button navigation.
- Add a custom domain and a short screen recording.

## Validation

Both apps use TypeScript and Vite. Run the checks from each app directory:

```bash
npm run lint
npm run build
```
