import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Layout,
  Result,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";

import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  LockOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

import "./App.css";

const { Header, Content, Footer } = Layout;

const { Title, Text, Paragraph } = Typography;

type EventLog = {
  id: number;
  type: string;
  message: string;
  time: string;
};

type DemoProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  cadence: string;
  features: string[];
  tag: string;
};

const PRODUCTS: DemoProduct[] = [
  {
    id: "prod_123",
    name: "Premium Developer Plan",
    description: "Everything you need to build, test and launch your next project.",
    price: 49,
    cadence: "/month",
    features: ["Unlimited projects", "Priority support", "Advanced developer tools"],
    tag: "Most popular",
  },
  {
    id: "prod_team",
    name: "Team Workspace",
    description: "A shared workspace for teams shipping products together.",
    price: 99,
    cadence: "/month",
    features: ["5 team members", "Shared billing", "Team permissions"],
    tag: "For teams",
  },
  {
    id: "prod_launch",
    name: "Launch Kit",
    description: "A focused toolkit for getting your next idea into production.",
    price: 29,
    cadence: " one-time",
    features: ["Production checklist", "Launch templates", "30-day support"],
    tag: "One-time",
  },
];

function App() {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(PRODUCTS[0].id);
  const [successSessionId, setSuccessSessionId] = useState<string | null>(
    () => {
      const path = window.location.pathname.replace(/\/+$/, "");
      return path === "/success" ? "" : null;
    },
  );

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/\/+$/, "");
      setSuccessSessionId(path === "/success" ? "" : null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const selectedProduct =
    PRODUCTS.find((product) => product.id === selectedProductId) ?? PRODUCTS[0];

  const addEvent = (type: string, message: string) => {
    setEvents((current) => [
      {
        id: Date.now(),
        type,
        message,
        time: new Date().toLocaleTimeString(),
      },
      ...current,
    ]);
  };

  const handleBuy = () => {
    addEvent("checkout.open", "Opening Dodo Checkout...");

    window.DodoCheckout.open({
      productId: selectedProduct.id,
      amount: selectedProduct.price,

      onSuccess: ({ sessionId }) => {
        addEvent("onSuccess", `Payment successful. Session: ${sessionId}`);
        setSuccessSessionId(sessionId);
        window.history.pushState({}, "", "/success");
      },

      onError: ({ code, message }) => {
        addEvent("onError", `${code}: ${message}`);
      },

      onClose: ({ reason }) => {
        addEvent("onClose", `Checkout closed. Reason: ${reason}`);
      },
    });
  };

  const clearEvents = () => {
    setEvents([]);
  };

  if (successSessionId !== null) {
    return (
      <Layout className="demo-layout">
        <Header className="demo-header">
          <div className="logo">DODO STORE</div>
          <Tag color="green">SDK Demo</Tag>
        </Header>

        <Content>
          <div className="demo-container">
            <Result
              status="success"
              title="Payment successful"
              subTitle={
                successSessionId
                  ? `Session: ${successSessionId}`
                  : "Your payment was completed successfully."
              }
              extra={
                <Button
                  type="primary"
                  onClick={() => {
                    window.history.pushState({}, "", "/");
                    setSuccessSessionId(null);
                  }}
                >
                  Back to store
                </Button>
              }
            />
          </div>
        </Content>

        <Footer className="demo-footer">
          <Text type="secondary">Dodo Checkout SDK Demo</Text>
          <Text type="secondary">TypeScript · iframe · postMessage</Text>
        </Footer>
      </Layout>
    );
  }

  return (
    <Layout className="demo-layout">
      <Header className="demo-header">
        <div className="logo">DODO STORE</div>

        <Tag color="green">SDK Demo</Tag>
      </Header>

      <Content>
        <div className="demo-container">
          {/* HERO */}

          <section className="hero-section">
            <Tag color="blue">
              <CodeOutlined />
              &nbsp; DEVELOPER TOOLS
            </Tag>

            <Title className="hero-title">
              Build faster.
              <br />
              Ship with confidence.
            </Title>

            <Paragraph className="hero-description">
              A simple demonstration of an embeddable Dodo checkout integrated
              into a merchant website.
            </Paragraph>
          </section>

          <section className="catalog-section" aria-labelledby="catalog-title">
            <Text type="secondary">CHOOSE YOUR PLAN</Text>
            <Title level={3} id="catalog-title">
              Pick the checkout you want to test
            </Title>
            <Row gutter={[16, 16]}>
              {PRODUCTS.map((product) => (
                <Col xs={24} md={8} key={product.id}>
                  <Card
                    className={`product-option ${
                      selectedProduct.id === product.id ? "product-option-selected" : ""
                    }`}
                    hoverable
                    onClick={() => setSelectedProductId(product.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedProductId(product.id);
                      }
                    }}
                    role="radio"
                    aria-checked={selectedProduct.id === product.id}
                    tabIndex={0}
                  >
                    <div className="product-option-header">
                      <Tag color={selectedProduct.id === product.id ? "blue" : "default"}>
                        {product.tag}
                      </Tag>
                      {selectedProduct.id === product.id && <CheckCircleOutlined />}
                    </div>
                    <Title level={4}>{product.name}</Title>
                    <Text type="secondary">{product.description}</Text>
                    <div className="product-option-price">
                      <strong>${product.price}</strong>
                      <Text type="secondary">{product.cadence}</Text>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </section>

          {/* PRODUCT */}

          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} md={12}>
              <Card className="product-image-card" bordered={false}>
                <ThunderboltOutlined className="product-icon" />
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <div className="product-details">
                <Text type="secondary">{selectedProduct.tag.toUpperCase()}</Text>

                <Title level={2}>{selectedProduct.name}</Title>

                <Paragraph>{selectedProduct.description}</Paragraph>

                <Space direction="vertical" size={12} className="feature-list">
                  {selectedProduct.features.map((feature) => (
                    <Text key={feature}>
                      <CheckCircleOutlined />
                      &nbsp; {feature}
                    </Text>
                  ))}
                </Space>

                <div className="price">
                  <span>${selectedProduct.price}</span>
                  <Text type="secondary">{selectedProduct.cadence}</Text>
                </div>

                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<ArrowRightOutlined />}
                  iconPosition="end"
                  onClick={handleBuy}
                >
                  Buy now
                </Button>

                <div className="secure-text">
                  <LockOutlined />
                  &nbsp; Secure checkout powered by Dodo
                </div>
              </div>
            </Col>
          </Row>

          <Divider />

          {/* CALLBACK LOG */}

          <section className="events-section">
            <div className="events-header">
              <div>
                <Text type="secondary">SDK EVENTS</Text>

                <Title
                  level={3}
                  style={{
                    marginTop: 8,
                  }}
                >
                  Callback log
                </Title>
              </div>

              {events.length > 0 && (
                <Button onClick={clearEvents}>Clear</Button>
              )}
            </div>

            <Card className="event-card" bordered>
              {events.length === 0 ? (
                <div className="empty-events">
                  <CodeOutlined />

                  <Text strong>No events yet</Text>

                  <Text type="secondary">Click "Buy now" to open checkout</Text>
                </div>
              ) : (
                <Space direction="vertical" size={0} className="event-list">
                  {events.map((event) => (
                    <div className="event-row" key={event.id}>
                      <Text type="secondary" className="event-time">
                        {event.time}
                      </Text>

                      <Tag
                        color={
                          event.type === "onSuccess"
                            ? "green"
                            : event.type === "onError"
                              ? "red"
                              : "blue"
                        }
                      >
                        {event.type}
                      </Tag>

                      <Text>{event.message}</Text>
                    </div>
                  ))}
                </Space>
              )}
            </Card>
          </section>
        </div>
      </Content>

      <Footer className="demo-footer">
        <Text type="secondary">Dodo Checkout SDK Demo</Text>

        <Text type="secondary">TypeScript · iframe · postMessage</Text>
      </Footer>
    </Layout>
  );
}

export default App;
