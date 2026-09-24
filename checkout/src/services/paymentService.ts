export type PaymentSuccess = {
  success: true;
  sessionId: string;
};

export type PaymentFailure = {
  success: false;
  code: string;
  message: string;
};

export type PaymentResult = PaymentSuccess | PaymentFailure;

const failedCards = new Set<string>();

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function processPayment(
  cardNumber: string,
): Promise<PaymentResult> {
  // Simulate payment processing/network delay
  await delay(1200);

  const normalizedCard = cardNumber.replace(/\s/g, "");

  // 4242 4242 4242 4242
  // Successful payment
  if (normalizedCard === "4242424242424242") {
    return {
      success: true,
      sessionId: generateSessionId(),
    };
  }

  // 4000 0000 0000 0002
  // Always declined
  if (normalizedCard === "4000000000000002") {
    return {
      success: false,
      code: "CARD_DECLINED",
      message: "Your card was declined. Please try another card.",
    };
  }

  // 4000 0000 0000 0341
  // Fails once, then succeeds on retry
  if (normalizedCard === "4000000000000341") {
    if (!failedCards.has(normalizedCard)) {
      failedCards.add(normalizedCard);

      return {
        success: false,
        code: "TEMPORARY_FAILURE",
        message: "We couldn't process your payment. Please try again.",
      };
    }

    return {
      success: true,
      sessionId: generateSessionId(),
    };
  }

  // Any other card
  return {
    success: false,
    code: "INVALID_TEST_CARD",
    message: "Invalid test card. Please use one of the supported test cards.",
  };
}

function generateSessionId(): string {
  return `sess_${crypto.randomUUID()}`;
}
