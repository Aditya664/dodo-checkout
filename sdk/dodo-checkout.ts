export type CloseReason = "user" | "success" | "programmatic" | "load_error";

export interface CheckoutOptions {
  productId: string;
  amount: number;
  onSuccess?: (data: { sessionId: string }) => void;
  onClose?: (data: { reason: CloseReason }) => void;
  onError?: (data: { code: string; message: string }) => void;
}

type CheckoutMessage =
  | {
      type: "DODO_CHECKOUT_READY";
    }
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
  private readonly checkoutOrigin =
    window.location.port === "5173"
      ? "http://localhost:5174"
      : window.location.origin;
  private readonly checkoutUrl =
    this.checkoutOrigin === window.location.origin
      ? `${this.checkoutOrigin}/checkout/`
      : `${this.checkoutOrigin}/`;

  public open(options: CheckoutOptions): void {
    if (this.iframe) {
      return;
    }
    if (
      !options?.productId ||
      !Number.isFinite(options.amount) ||
      options.amount < 0
    ) {
      options?.onError?.({
        code: "INVALID_CHECKOUT",
        message: "A valid productId and non-negative amount are required.",
      });
      return;
    }

    this.options = options;
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    this.createOverlay();
    this.listenForMessages();
    this.createIframe();
  }

  public close(reason: CloseReason = "programmatic"): void {
    const callback = this.options?.onClose;
    this.cleanup();
    callback?.({
      reason,
    });
    this.options = null;
  }

  private createOverlay(): void {
    const overlay = document.createElement("div");
    overlay.id = "dodo-checkout-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      background: "rgba(0, 0, 0, 0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      boxSizing: "border-box",
      zIndex: "2147483647",
    });
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Dodo checkout");
    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  private createIframe(): void {
    if (!this.overlay || !this.options) {
      return;
    }
    const iframe = document.createElement("iframe");
    const productId = encodeURIComponent(this.options.productId);
    const amount = encodeURIComponent(this.options.amount.toString());
    iframe.src = `${this.checkoutUrl}?productId=${productId}&amount=${amount}`;
    iframe.title = "Dodo Checkout";
    iframe.setAttribute("allow", "payment");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    Object.assign(iframe.style, {
      width: "100%",
      maxWidth: "480px",
      height: "min(720px, 92vh)",
      border: "0",
      borderRadius: "16px",
      background: "#fff",
      boxShadow: "0 20px 60px rgba(0,0,0,.25)",
    });
    iframe.setAttribute("aria-label", "Dodo checkout form");

    this.loadTimer = window.setTimeout(() => {
      if (!this.iframe) {
        return;
      }

      this.options?.onError?.({
        code: "CHECKOUT_TIMEOUT",
        message: "Checkout took too long to load. Please try again.",
      });
      this.cleanup();
      this.options = null;
    }, 10000);

    iframe.addEventListener("error", () => {
      this.options?.onError?.({
        code: "CHECKOUT_LOAD_ERROR",
        message: "Unable to load checkout. Please try again.",
      });

      this.cleanup();
      this.options = null;
    });

    this.overlay.appendChild(iframe);

    this.iframe = iframe;
  }

  private listenForMessages(): void {
    this.messageHandler = (event: MessageEvent) => {
      // Verify origin
      if (event.origin !== this.checkoutOrigin) {
        return;
      }

      // Verify source
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

  private handleMessage(message: CheckoutMessage): void {
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

  private handleSuccess(sessionId: string): void {
    const callback = this.options?.onSuccess;

    this.cleanup();

    callback?.({
      sessionId,
    });

    this.options = null;
  }

  private handleError(code: string, message: string): void {
    this.options?.onError?.({
      code,
      message,
    });
  }

  private handleClose(reason: CloseReason): void {
    const callback = this.options?.onClose;

    this.cleanup();

    callback?.({
      reason,
    });

    this.options = null;
  }

  private cleanup(): void {
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

  private clearLoadTimer(): void {
    if (this.loadTimer !== null) {
      window.clearTimeout(this.loadTimer);
      this.loadTimer = null;
    }
  }
}

const DodoCheckout = new DodoCheckoutSDK();

declare global {
  interface Window {