import { Layout, Space, Typography, Card } from "antd";
import { useNavigate } from "react-router-dom";
import SearchCard from "../components/SearchCard.jsx";

const { Title, Text } = Typography;

export default function Home() {
  const navigate = useNavigate();

  return (
    <Layout className="page">
      <div className="centered">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <Title style={{ margin: 0 }} level={2}>
                Risk Explorer
              </Title>
              <Text type="secondary">
                Country uses ISO2 (e.g. RO, US). Disease uses a condition name
                (e.g. asthma).
              </Text>
            </div>

            <Card style={{ width: 420, maxWidth: "100%" }}>
              <Space direction="vertical" size={6}>
                <Title level={5} style={{ margin: 0 }}>
                  Cross-reference
                </Title>
                <Text type="secondary">
                  On a country page, enter a disease name → risk. On a disease
                  page, enter a country ISO2 → risk.
                </Text>
              </Space>
            </Card>
          </div>

          <div className="split">
            <SearchCard
              title="Search for a disease"
              buttonText="Open disease"
              selectPlaceholder="Select a disease…"
              selectOptions={[
                { value: "asthma", label: "Asthma" },
                { value: "obesity", label: "Obesity" },
                { value: "depression", label: "Depression" },
              ]}
              onSearch={(key) =>
                navigate(`/disease/${encodeURIComponent(key)}`)
              }
            />

            <SearchCard
              title="Search for a country"
              placeholder="Country ISO2 (e.g. RO)"
              buttonText="Open country"
              onSearch={(iso2) =>
                navigate(`/country/${encodeURIComponent(iso2)}`)
              }
            />
          </div>
        </Space>
      </div>
    </Layout>
  );
}
