import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Result,
  Row,
  Space,
  Spin,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  CloseOutlined,
  LockOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";

import { processPayment } from "./services/paymentService";

import "./App.css";

const { Title, Text } = Typography;

type CheckoutState = "idle" | "processing" | "success" | "error";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
};

type FormValues = {
  email: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
};

const PRODUCTS: Record<string, Product> = {
  prod_123: {
    id: "prod_123",
    name: "Premium Developer Plan",
    description: "Everything you need to build great products.",
    price: 49,
    currency: "USD",
  },
  prod_team: {
    id: "prod_team",
    name: "Team Workspace",
    description: "A shared workspace for teams shipping products together.",
    price: 99,
    currency: "USD",
  },
  prod_launch: {
    id: "prod_launch",
    name: "Launch Kit",
    description:
      "A focused toolkit for getting your next idea into production.",
    price: 29,
    currency: "USD",
  },
};

const sendMessageToSDK = (message: object) => {
  window.parent.postMessage(message, "*");
};

function App() {
  const [product, setProduct] = useState<Product | null>(null);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    if (window.top === window.self) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMessage(
        "This checkout can only be opened from the Dodo Checkout button.",
      );
      setCheckoutState("error");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const productId = params.get("productId") || "prod_123";
    const selectedProduct = PRODUCTS[productId];
    if (!selectedProduct) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMessage("Product not found.");
      setCheckoutState("error");
      return;
    }
    const amountParam = params.get("amount");
    const amount = amountParam === null ? Number.NaN : Number(amountParam);
    if (amountParam !== null && (!Number.isFinite(amount) || amount < 0)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMessage("The checkout amount is invalid.");
      setCheckoutState("error");
      return;
    }
    const productWithAmount = Number.isFinite(amount)
      ? { ...selectedProduct, price: amount }
      : selectedProduct;
    setProduct(productWithAmount);
    sendMessageToSDK({
      type: "DODO_CHECKOUT_READY",
    });
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const formatCardNumber = (value: string) => {
    return value
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  };

  const formatExpiry = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 4);
    if (numbers.length > 2) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    }
    return numbers;
  };

  const handlePayment = async (values: FormValues) => {
    if (checkoutState === "processing") {
      return;
    }
    setCheckoutState("processing");
    setErrorMessage("");
    try {
      const result = await processPayment(values.cardNumber);
      if (result.success) {
        const nextSessionId = result.sessionId;
        setSessionId(nextSessionId);
        setCheckoutState("success");
        sendMessageToSDK({
          type: "DODO_PAYMENT_SUCCESS",
          sessionId: nextSessionId,
        });
        return;
      }
      setErrorMessage(result.message);
      setCheckoutState("error");
      sendMessageToSDK({
        type: "DODO_PAYMENT_ERROR",
        code: result.code,
        message: result.message,
      });
    } catch {
      const message = "Something went wrong. Please try again.";
      setErrorMessage(message);
      setCheckoutState("error");
      sendMessageToSDK({
        type: "DODO_PAYMENT_ERROR",
        code: "CHECKOUT_ERROR",
        message: message,
      });
    }
  };

  const handleClose = useCallback(() => {
    sendMessageToSDK({
      type: "DODO_CHECKOUT_CLOSE",
      reason: "user",
    });
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && checkoutState !== "processing") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [checkoutState, handleClose]);

  if (!product) {
    if (checkoutState === "error") {
      return (
        <div className="checkout-page">
          <Card className="checkout-card">
            <Result
              status="error"
              title={
                errorMessage.includes("only be opened")
                  ? "Open checkout from the store"
                  : "Checkout unavailable"
              }
              subTitle={errorMessage}
              extra={<Button onClick={handleClose}>Close</Button>}
            />
          </Card>
        </div>
      );
    }

    return (
      <div className="checkout-loading">
        <Spin size="large" />
        <Text>Loading checkout...</Text>
      </div>
    );
  }

  if (checkoutState === "success") {
    return (
      <div className="checkout-page">
        <Card className="checkout-card">
          <Result
            status="success"
            icon={<CheckCircleOutlined />}
            title="Payment successful"
            subTitle="Thank you for your purchase."
            extra={
              <Space direction="vertical" size="middle" className="full-width">
                <Card size="small" className="session-card">
                  <Text type="secondary">Session ID</Text>

                  <br />

                  <Text copyable>{sessionId}</Text>
                </Card>

                <Button type="primary" size="large" block onClick={handleClose}>
                  Done
                </Button>
              </Space>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <Card className="checkout-card" bordered={false}>
        {/* Header */}
        <div className="checkout-header">
          <div>
            <Text className="brand">DODO</Text>

            <Title level={2} className="checkout-title">
              Complete your purchase
            </Title>
          </div>

          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={handleClose}
            aria-label="Close checkout"
          />
        </div>

        {/* Product */}
        <Card size="small" className="product-card">
          <div className="product-info">
            <div>
              <Text strong>{product.name}</Text>

              <br />

              <Text type="secondary">{product.description}</Text>
            </div>

            <Text strong className="price">
              ${product.price.toFixed(2)}
            </Text>
          </div>
        </Card>

        <Divider />

        {!isOnline && (
          <Alert
            message="You are offline"
            description="Reconnect before submitting payment. Your card details stay in this checkout."
            type="warning"
            showIcon
            className="error-alert"
          />
        )}

        {/* Error */}
        {checkoutState === "error" && errorMessage && (
          <Alert
            message="Payment couldn't be completed"
            description={errorMessage}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMessage("")}
            className="error-alert"
          />
        )}

        {/* Payment Form */}
        <Form<FormValues>
          layout="vertical"
          requiredMark={false}
          onFinish={handlePayment}
          disabled={checkoutState === "processing"}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              {
                required: true,
                message: "Please enter your email.",
              },
              {
                type: "email",
                message: "Please enter a valid email.",
              },
            ]}
          >
            <Input
              size="large"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
          </Form.Item>

          <Form.Item
            label="Card number"
            name="cardNumber"
            rules={[
              {
                required: true,
                message: "Please enter your card number.",
              },
              {
                validator: (_, value) => {
                  const normalized = value?.replace(/\s/g, "");

                  if (!normalized || normalized.length !== 16) {
                    return Promise.reject(
                      new Error("Card number must contain 16 digits."),
                    );
                  }

                  return Promise.resolve();
                },
              },
            ]}
            normalize={formatCardNumber}
          >
            <Input
              size="large"
              prefix={<CreditCardOutlined />}
              placeholder="4242 4242 4242 4242"
              inputMode="numeric"
              maxLength={19}
              autoComplete="cc-number"
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="Expiry"
                name="expiry"
                rules={[
                  {
                    required: true,
                    message: "Enter expiry date.",
                  },
                  {
                    pattern: /^(0[1-9]|1[0-2])\/\d{2}$/,
                    message: "Use MM/YY format.",
                  },
                ]}
                normalize={formatExpiry}
              >
                <Input
                  size="large"
                  placeholder="MM/YY"
                  maxLength={5}
                  inputMode="numeric"
                  autoComplete="cc-exp"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="CVC"
                name="cvc"
                rules={[
                  {
                    required: true,
                    message: "Enter CVC.",
                  },
                  {
                    pattern: /^\d{3}$/,
                    message: "CVC must contain 3 digits.",
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder="123"
                  maxLength={3}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                />
              </Form.Item>
            </Col>
          </Row>

          <Button
            htmlType="submit"
            type="primary"
            size="large"
            block
            disabled={!isOnline}
            loading={checkoutState === "processing"}
            icon={checkoutState !== "processing" ? <LockOutlined /> : undefined}
          >
            {checkoutState === "processing"
              ? "Processing payment..."
              : `Pay $${product.price.toFixed(2)}`}
          </Button>
        </Form>

        {/* Security */}
        <div className="secure-message">
          <LockOutlined />
          <Text type="secondary">Secure checkout</Text>
        </div>

        {/* Test cards */}
        <Card size="small" className="test-card">
          <Text strong>Test cards</Text>

          <div>
            <Text type="secondary">
              Success: <Text code>4242 4242 4242 4242</Text>
            </Text>
          </div>

          <div>
            <Text type="secondary">
              Decline: <Text code>4000 0000 0000 0002</Text>
            </Text>
          </div>

          <div>
            <Text type="secondary">
              Retry: <Text code>4000 0000 0000 0341</Text>
            </Text>
          </div>
        </Card>
      </Card>
    </div>
  );
}

export default App;
