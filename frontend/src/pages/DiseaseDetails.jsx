import React from "react";
import {
  Layout,
  Space,
  Typography,
  Card,
  Descriptions,
  Alert,
  Spin,
  Button,
  Tag,
  Divider,
  Image,
  Row,
  Col,
} from "antd";
import { Link, useParams, useLocation } from "react-router-dom";
import { getConditionByKey } from "../api/diseaseApi";
import CrossRefCard from "../components/CrossRefCard.jsx";

const { Title, Text, Paragraph } = Typography;

function toHttps(url) {
  if (!url) return url;
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}

function asArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

function uniqStrings(arr) {
  return Array.from(new Set(arr.map((x) => String(x).trim()).filter(Boolean)));
}

function toText(v) {
  if (v == null) return null;
  if (typeof v === "string" || typeof v === "number") return String(v);

  if (typeof v === "object") {
    if (typeof v.label === "string") return v.label;
    if (typeof v.name === "string") return v.name;
    if (typeof v.value === "string") return v.value;
    if (typeof v.id === "string") return v.id;
    if (typeof v.qid === "string") return v.qid;
    try {
      return JSON.stringify(v);
    } catch {
      return null;
    }
  }
  return String(v);
}

function toTextArray(items) {
  return uniqStrings(asArray(items).map(toText).filter(Boolean));
}

function renderTagList(items, { property } = {}) {
  const arr = toTextArray(items);
  if (arr.length === 0) return <Text type="secondary">—</Text>;
  return (
    <Space wrap>
      {arr.map((x, idx) => (
        <Tag key={`${x}-${idx}`} {...(property ? { property } : {})}>
          {x}
        </Tag>
      ))}
    </Space>
  );
}

export default function DiseaseDetails() {
  const { key = "" } = useParams();
  const decodedKey = decodeURIComponent(key);
  const location = useLocation();

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getConditionByKey(decodedKey);
        if (alive) setData(res);
      } catch (e) {
        if (alive) {
          setError(
            e?.response?.data?.error ||
              e?.response?.data?.message ||
              e?.message ||
              "Failed to fetch condition."
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [decodedKey]);

  const base = data || {};
  const wd = base.wikidata || {};

  const name = base.name || wd.label || base.label || decodedKey;
  const short = base.short || null;

  const wdDesc = wd.description || null;
  const wdImageUrl = toHttps(wd.image?.url || wd.image || null);
  const wdWikidata = wd.wikidataUrl || null;

  const identifiers = wd.identifiers || null;
  const specialties = wd.specialties || null;
  const altLabels = wd.altLabels || null;

  const facts = wd.facts || {};
  const instanceOf = facts.instanceOf || [];
  const subclassOf = facts.subclassOf || [];

  const symptoms = facts.symptoms || wd.symptoms || [];
  const wdRiskFactors = facts.riskFactors || wd.riskFactors || [];
  const treatments = facts.treatments || wd.treatments || [];
  const medications = facts.medications || wd.medications || [];
  const causesFromWd = facts.causes || wd.causes || [];

  const wdError = wd.error || wd.fusekiStoreError || null;

  const aboutUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${location.pathname}`
      : `/disease/${encodeURIComponent(decodedKey)}`;

  const wikidataEntity =
    wd.qid && String(wd.qid).match(/^Q\d+$/)
      ? `https://www.wikidata.org/entity/${wd.qid}`
      : null;

  return (
    <Layout className="page">
      <div
        className="centered"
        prefix="schema: https://schema.org/ skos: http://www.w3.org/2004/02/skos/core#"
      >
        <div
          typeof="schema:MedicalCondition"
          about={aboutUrl}
          resource={aboutUrl}
        >
          <meta property="schema:identifier" content={decodedKey} />
          {wikidataEntity ? (
            <meta property="schema:sameAs" content={wikidataEntity} />
          ) : null}
          {wdImageUrl ? (
            <meta property="schema:image" content={wdImageUrl} />
          ) : null}

          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                alignItems: "flex-start",
              }}
            >
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  Condition: <span property="schema:name">{name}</span>
                </Title>

                <div style={{ marginTop: 10 }}>
                  <Button>
                    <Link to="/">← Back</Link>
                  </Button>
                </div>
              </div>

              <CrossRefCard
                mode={{ kind: "diseasePage", diseaseKey: decodedKey }}
              />
            </div>

            {loading && (
              <Card>
                <Space>
                  <Spin />
                  <Text>Loading condition…</Text>
                </Space>
              </Card>
            )}

            {error && <Alert type="error" message={error} showIcon />}

            {!loading && !error && data && (
              <>
                <Card title="Internally stored data" bordered>
                  <Descriptions bordered column={1}>
                    <Descriptions.Item label="Key">
                      <span property="schema:identifier">{decodedKey}</span>
                    </Descriptions.Item>

                    <Descriptions.Item label="Name">
                      <span property="schema:name">{name}</span>
                    </Descriptions.Item>

                    <Descriptions.Item label="Summary">
                      {short ? (
                        <Paragraph style={{ margin: 0 }}>
                          <span property="schema:description">{short}</span>
                        </Paragraph>
                      ) : (
                        "—"
                      )}
                    </Descriptions.Item>

                    <Descriptions.Item label="Causes">
                      <span property="schema:keywords">
                        {renderTagList(base.causes)}
                      </span>
                    </Descriptions.Item>

                    <Descriptions.Item label="Risk factors (local)">
                      <span property="schema:keywords">
                        {renderTagList(base.riskFactors)}
                      </span>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card
                  title="More information"
                  bordered
                  extra={
                    wdWikidata ? (
                      <a href={wdWikidata} target="_blank" rel="noreferrer">
                        Wikidata
                      </a>
                    ) : null
                  }
                >
                  {wdError ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="Wikidata enrichment warning"
                      description={wdError}
                      style={{ marginBottom: 12 }}
                    />
                  ) : null}

                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={8}>
                      {wdImageUrl ? (
                        <Image
                          width="100%"
                          style={{ maxWidth: 320 }}
                          src={wdImageUrl}
                          alt={`${name} (Wikidata)`}
                          fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999'%3ENo image%3C/text%3E%3C/svg%3E"
                        />
                      ) : (
                        <Text type="secondary">No image available.</Text>
                      )}
                    </Col>

                    <Col xs={24} md={16}>
                      <Descriptions bordered column={1} size="middle">
                        <Descriptions.Item label="Description">
                          {wdDesc ? (
                            <Paragraph style={{ margin: 0 }}>
                              <span property="schema:description">
                                {wdDesc}
                              </span>
                            </Paragraph>
                          ) : (
                            "—"
                          )}
                        </Descriptions.Item>

                        <Descriptions.Item label="Identifiers">
                          {identifiers ? (
                            <Space
                              direction="vertical"
                              size={8}
                              style={{ width: "100%" }}
                            >
                              <div>
                                <Text strong>ICD-10:</Text>{" "}
                                {renderTagList(identifiers.icd10, {
                                  property: "schema:identifier",
                                })}
                              </div>
                              <div>
                                <Text strong>ICD-11:</Text>{" "}
                                {renderTagList(identifiers.icd11, {
                                  property: "schema:identifier",
                                })}
                              </div>
                              <div>
                                <Text strong>MeSH:</Text>{" "}
                                {renderTagList(identifiers.mesh, {
                                  property: "schema:identifier",
                                })}
                              </div>
                              <div>
                                <Text strong>UMLS:</Text>{" "}
                                {renderTagList(identifiers.umls, {
                                  property: "schema:identifier",
                                })}
                              </div>
                            </Space>
                          ) : (
                            <Text type="secondary">—</Text>
                          )}
                        </Descriptions.Item>

                        <Descriptions.Item label="Specialties">
                          <span property="schema:keywords">
                            {renderTagList(specialties)}
                          </span>
                        </Descriptions.Item>

                        <Descriptions.Item label="Alt labels (aliases)">
                          {renderTagList(altLabels, {
                            property: "schema:alternateName",
                          })}
                        </Descriptions.Item>

                        <Descriptions.Item label="Instance of">
                          <span property="schema:keywords">
                            {renderTagList(instanceOf)}
                          </span>
                        </Descriptions.Item>

                        <Descriptions.Item label="Subclass of">
                          <span property="schema:keywords">
                            {renderTagList(subclassOf)}
                          </span>
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                  </Row>

                  <Divider />

                  <Space
                    direction="vertical"
                    size={14}
                    style={{ width: "100%" }}
                  >
                    <div>
                      <Text strong>Symptoms</Text>
                      <div style={{ marginTop: 6 }}>
                        {renderTagList(symptoms, {
                          property: "schema:signOrSymptom",
                        })}
                      </div>
                    </div>

                    <div>
                      <Text strong>Risk factors</Text>
                      <div style={{ marginTop: 6 }}>
                        {renderTagList(wdRiskFactors, {
                          property: "schema:riskFactor",
                        })}
                      </div>
                    </div>

                    <div>
                      <Text strong>Treatments</Text>
                      <div style={{ marginTop: 6 }}>
                        {renderTagList(treatments, {
                          property: "schema:possibleTreatment",
                        })}
                      </div>
                    </div>

                    <div>
                      <Text strong>Medications used</Text>
                      <div style={{ marginTop: 6 }}>
                        {renderTagList(medications, {
                          property: "schema:possibleTreatment",
                        })}
                      </div>
                    </div>

                    <div>
                      <Text strong>Causes</Text>
                      <div style={{ marginTop: 6 }}>
                        {renderTagList(causesFromWd, {
                          property: "schema:cause",
                        })}
                      </div>
                    </div>
                  </Space>
                </Card>
              </>
            )}
          </Space>
        </div>
      </div>
    </Layout>
  );
}
