export type CloseReason = "user" | "success" | "programmatic" | "load_error";

export interface CheckoutOptions {
  productId: string;
  amount: number;
  onSuccess?: (data: { sessionId: string }) => void;
  onClose?: (data: { reason: CloseReason }) => void;
  onError?: (data: { code: string; message: string }) => void;
}

type CheckoutMessage =
  | { type: "DODO_CHECKOUT_READY" }
  | {
      type: "DODO_PAYMENT_SUCCESS";
      sessionId: string;
    }
  | {
      type: "DODO_PAYMENT_ERROR";
      code: string;
      message: string;
    }
  | {
      type: "DODO_CHECKOUT_CLOSE";
      reason: CloseReason;
    };

class DodoCheckoutSDK {
  private iframe: HTMLIFrameElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private options: CheckoutOptions | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private loadTimer: number | null = null;
  private previousBodyOverflow = "";

  private get checkoutOrigin() {
    return window.location.port === "5173"
      ? "http://localhost:5174"
      : window.location.origin;
  }

  private get checkoutUrl() {
    return this.checkoutOrigin === window.location.origin
      ? `${this.checkoutOrigin}/checkout/`
      : this.checkoutOrigin;
  }

  public open(options: CheckoutOptions) {
    if (this.iframe) {
      return;
    }
    if (
      !options.productId ||
      !Number.isFinite(options.amount) ||
      options.amount < 0
    ) {
      options.onError?.({
        code: "INVALID_CHECKOUT",
        message: "A valid productId and non-negative amount are required.",
      });
      return;
    }
    this.options = options;
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    this.createOverlay();
    this.createIframe();
    this.listenForMessages();
  }

  public close(reason: CloseReason = "programmatic") {
    const callback = this.options?.onClose;
    this.cleanup();
    callback?.({ reason });
    this.options = null;
  }

  private createOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "dodo-checkout-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      background: "rgba(0, 0, 0, 0.55)",
      boxSizing: "border-box",
      zIndex: "2147483647",
    });
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Dodo checkout");
    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  private createIframe() {
    if (!this.overlay || !this.options) {
      return;
    }
    const { productId, amount } = this.options;
    const iframe = document.createElement("iframe");
    const params = new URLSearchParams({
      productId,
      amount: amount.toString(),
    });
    iframe.src = `${this.checkoutUrl}?${params}`;
    iframe.title = "Dodo Checkout";
    iframe.setAttribute("allow", "payment");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    iframe.setAttribute("aria-label", "Dodo checkout form");
    Object.assign(iframe.style, {
      width: "100%",
      maxWidth: "480px",
      height: "min(720px, 92vh)",
      border: "0",
      borderRadius: "16px",
      background: "#fff",
      boxShadow: "0 20px 60px rgba(0,0,0,.25)",
    });
    iframe.addEventListener("error", () => {
      this.handleError(
        "CHECKOUT_LOAD_ERROR",
        "Unable to load checkout. Please try again.",
      );
      this.cleanup();
      this.options = null;
    });
    this.overlay.appendChild(iframe);
    this.iframe = iframe;
    this.startLoadTimer();
  }

  private startLoadTimer() {
    this.loadTimer = window.setTimeout(() => {
      if (!this.iframe) {
        return;
      }

      this.handleError(
        "CHECKOUT_TIMEOUT",
        "Checkout took too long to load. Please try again.",
      );

      this.cleanup();
      this.options = null;
    }, 10000);
  }

  private listenForMessages() {
    this.messageHandler = (event: MessageEvent) => {
      if (event.origin !== this.checkoutOrigin) {
        return;
      }
      if (event.source !== this.iframe?.contentWindow) {
        return;
      }

      const message = event.data as CheckoutMessage;

      if (!message?.type) {
        return;
      }

      this.handleMessage(message);
    };

    window.addEventListener("message", this.messageHandler);
  }

  private handleMessage(message: CheckoutMessage) {
    switch (message.type) {
      case "DODO_CHECKOUT_READY":
        this.clearLoadTimer();
        break;

      case "DODO_PAYMENT_SUCCESS":
        this.handleSuccess(message.sessionId);
        break;

      case "DODO_PAYMENT_ERROR":
        this.handleError(message.code, message.message);
        break;

      case "DODO_CHECKOUT_CLOSE":
        this.handleClose(message.reason);
        break;
    }
  }

  private handleSuccess(sessionId: string) {
    const callback = this.options?.onSuccess;

    this.cleanup();

    callback?.({ sessionId });

    this.options = null;
  }

  private handleError(code: string, message: string) {
    this.options?.onError?.({
      code,
      message,
    });
  }

  private handleClose(reason: CloseReason) {
    const callback = this.options?.onClose;

    this.cleanup();

    callback?.({ reason });

    this.options = null;
  }

  private cleanup() {
    this.clearLoadTimer();

    if (this.messageHandler) {
      window.removeEventListener("message", this.messageHandler);

      this.messageHandler = null;
    }

    this.iframe?.remove();
    this.overlay?.remove();

    this.iframe = null;
    this.overlay = null;

    document.body.style.overflow = this.previousBodyOverflow;
  }

  private clearLoadTimer() {
    if (this.loadTimer !== null) {
      window.clearTimeout(this.loadTimer);

      this.loadTimer = null;
    }
  }
}

const DodoCheckout = new DodoCheckoutSDK();

declare global {
  interface Window {
    DodoCheckout: DodoCheckoutSDK;
  }
}

if (typeof window !== "undefined") {
  window.DodoCheckout = DodoCheckout;
}

export { DodoCheckout };

export default DodoCheckout;
