# Dodo Checkout

A small embeddable checkout demo. The demo website opens a separate checkout
app inside an iframe through a plain TypeScript SDK.

## Run locally

Install dependencies:

```bash
cd demo
npm install

cd ../checkout
npm install
```

Start the checkout app in one terminal:

```bash
cd checkout
npm run dev -- --host localhost --port 5174
```

Start the demo app in another terminal:

```bash
cd demo
npm run dev -- --host localhost --port 5173
```

Open **http://localhost:5173**.

The root shortcuts are also available:

```bash
npm run checkout
npm run demo
```

## How the pieces talk

```text
demo page
  └─ DodoCheckout.open(...)
       └─ SDK creates iframe
            └─ checkout app collects payment details
                 └─ postMessage event
                      └─ SDK calls the host callback
```

- `demo/` is the merchant website. It selects a fake product and displays
  callback events.
- `sdk/dodo-checkout.ts` is the embeddable SDK. It creates and removes the
  iframe, validates message origin/source, and exposes callbacks.
- `checkout/` is the payment form. It runs in the iframe and never sends card
  details to the demo page.

The checkout sends these events to the SDK:

```text
DODO_CHECKOUT_READY
DODO_PAYMENT_SUCCESS
DODO_PAYMENT_ERROR
DODO_CHECKOUT_CLOSE
```

## SDK usage

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

## Test cards

| Card number | Result |
| --- | --- |
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Payment is declined |
| `4000 0000 0000 0341` | Fails once, succeeds on retry |

## Render deployment

This project deploys as one **Render Static Site** using `render.yaml`.

1. Create a new Render Blueprint from this repository.
2. Render runs `npm run build:render`.
3. Render publishes `demo/dist`.

The build places the checkout app at `demo/dist/checkout`, so the deployed
demo and iframe use the same site:

```text
https://your-app.onrender.com/
https://your-app.onrender.com/checkout/
```

Do not deploy this as a Web Service and do not add a start command.

## Important behavior

- Only one checkout can be open at a time.
- The pay button is disabled while payment is processing.
- Declines and network failures stay in the modal and can be retried.
- Load failures and timeouts call `onError` and clean up the iframe.
- Opening `/checkout/` directly is blocked; it must be opened by the SDK.
