var DodoCheckoutSDK = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // sdk/dodo-checkout.ts
  var dodo_checkout_exports = {};
  __export(dodo_checkout_exports, {
    DodoCheckout: () => DodoCheckout,
    default: () => dodo_checkout_default
  });
  var DodoCheckoutSDK = class {
    iframe = null;
    overlay = null;
    options = null;
    messageHandler = null;
    loadTimer = null;
    previousBodyOverflow = "";
    checkoutOrigin = window.location.port === "5173" ? "http://localhost:5174" : window.location.origin;
    checkoutUrl = this.checkoutOrigin === window.location.origin ? `${this.checkoutOrigin}/checkout/` : `${this.checkoutOrigin}/`;
    open(options) {
      if (this.iframe) {
        return;
      }
      if (!options?.productId || !Number.isFinite(options.amount) || options.amount < 0) {
        options?.onError?.({
          code: "INVALID_CHECKOUT",
          message: "A valid productId and non-negative amount are required."
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
    close(reason = "programmatic") {
      const callback = this.options?.onClose;
      this.cleanup();
      callback?.({
        reason
      });
      this.options = null;
    }
    createOverlay() {
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
        zIndex: "2147483647"
      });
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", "Dodo checkout");
      document.body.appendChild(overlay);
      this.overlay = overlay;
    }
    createIframe() {
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
        boxShadow: "0 20px 60px rgba(0,0,0,.25)"
      });
      iframe.setAttribute("aria-label", "Dodo checkout form");
      this.loadTimer = window.setTimeout(() => {
        if (!this.iframe) {
          return;
        }
        this.options?.onError?.({
          code: "CHECKOUT_TIMEOUT",
          message: "Checkout took too long to load. Please try again."
        });
        this.cleanup();
        this.options = null;
      }, 1e4);
      iframe.addEventListener("error", () => {
        this.options?.onError?.({
          code: "CHECKOUT_LOAD_ERROR",
          message: "Unable to load checkout. Please try again."
        });
        this.cleanup();
        this.options = null;
      });
      this.overlay.appendChild(iframe);
      this.iframe = iframe;
    }
    listenForMessages() {
      this.messageHandler = (event) => {
        if (event.origin !== this.checkoutOrigin) {
          return;
        }
        if (event.source !== this.iframe?.contentWindow) {
          return;
        }
        const message = event.data;
        if (!message?.type) {
          return;
        }
        this.handleMessage(message);
      };
      window.addEventListener("message", this.messageHandler);
    }
    handleMessage(message) {
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
    handleSuccess(sessionId) {
      const callback = this.options?.onSuccess;
      this.cleanup();
      callback?.({
        sessionId
      });
      this.options = null;
    }
    handleError(code, message) {
      this.options?.onError?.({
        code,
        message
      });
    }
    handleClose(reason) {
      const callback = this.options?.onClose;
      this.cleanup();
      callback?.({
        reason
      });
      this.options = null;
    }
    cleanup() {
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
    clearLoadTimer() {
      if (this.loadTimer !== null) {
        window.clearTimeout(this.loadTimer);
        this.loadTimer = null;
      }
    }
  };
  var DodoCheckout = new DodoCheckoutSDK();
  if (typeof window !== "undefined") {
    window.DodoCheckout = DodoCheckout;
  }
  var dodo_checkout_default = DodoCheckout;
  return __toCommonJS(dodo_checkout_exports);
})();
