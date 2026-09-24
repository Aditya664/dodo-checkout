export {};

type CloseReason = "user" | "success" | "programmatic" | "load_error";

interface CheckoutOptions {
  productId: string;
  amount: number;

  onSuccess?: (data: { sessionId: string }) => void;

  onClose?: (data: { reason: CloseReason }) => void;

  onError?: (data: { code: string; message: string }) => void;
}

interface DodoCheckout {
  open(options: CheckoutOptions): void;

  close(reason?: CloseReason): void;
}

declare global {
  interface Window {
    DodoCheckout: DodoCheckout;
  }
}
