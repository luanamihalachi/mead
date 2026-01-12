import React from "react";
import {
  Card,
  Input,
  Space,
  Typography,
  Alert,
  Spin,
  Select,
  Button,
} from "antd";
import { getRiskForIso2Disease } from "../api/riskApi";

const { Text, Title } = Typography;

const DISEASE_OPTIONS = [
  { value: "asthma", label: "Asthma" },
  { value: "obesity", label: "Obesity" },
  { value: "depression", label: "Depression" },
];

export default function CrossRefCard({ mode }) {
  const [value, setValue] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [result, setResult] = React.useState(null);

  const label =
    mode.kind === "countryPage"
      ? "Cross-reference this country with a disease"
      : "Cross-reference this disease with a country";

  const submit = async () => {
    const v = (value || "").toString().trim();
    if (!v) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params =
        mode.kind === "countryPage"
          ? { iso2: mode.iso2, diseaseKey: v }
          : { iso2: v.toUpperCase(), diseaseKey: mode.diseaseKey };

      const data = await getRiskForIso2Disease(params);
      setResult(data);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to fetch risk assessment."
      );
    } finally {
      setLoading(false);
    }
  };

  const score = result?.score ?? result?.riskScore ?? result?.value;
  const level = result?.level ?? result?.riskLevel;
  const why = result?.why ?? result?.reasons ?? result?.explanations;

  return (
    <Card bordered style={{ width: 420, maxWidth: "100%" }}>
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Title level={5} style={{ margin: 0 }}>
          {label}
        </Title>

        {mode.kind === "countryPage" ? (
          <Space.Compact style={{ width: "100%" }}>
            <Select
              style={{ width: "100%" }}
              placeholder="Select a disease…"
              value={value}
              onChange={(v) => setValue(v)}
              options={DISEASE_OPTIONS}
              allowClear
            />
            <Button type="primary" onClick={submit} disabled={!value}>
              Check
            </Button>
          </Space.Compact>
        ) : (
          <Input.Search
            placeholder="Type a country ISO2 (e.g. FR)…"
            value={value || ""}
            onChange={(e) => setValue(e.target.value)}
            onSearch={submit}
            enterButton="Check"
            allowClear
          />
        )}

        {loading && (
          <Space>
            <Spin />
            <Text>Loading…</Text>
          </Space>
        )}

        {error && <Alert type="error" message={error} showIcon />}

        {result && (
          <Alert
            type="info"
            showIcon
            message={
              <div>
                <div>
                  <b>Score:</b> {score ?? "(not provided)"}
                  {level != null ? (
                    <>
                      {" "}
                      — <b>Level:</b> {String(level)}
                    </>
                  ) : null}
                </div>

                {Array.isArray(why) && why.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <b>Why:</b>
                    <ul style={{ margin: "6px 0 0 18px" }}>
                      {why.map((w, idx) => (
                        <li key={idx}>{String(w)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            }
          />
        )}
      </Space>
    </Card>
  );
}
