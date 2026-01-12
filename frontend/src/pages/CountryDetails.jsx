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
  Divider,
  Image,
  Tag,
  Table,
  Statistic,
  Row,
  Col,
} from "antd";
import { Link, useParams, useLocation } from "react-router-dom";
import { getCountryByIso2 } from "../api/countryApi";
import CrossRefCard from "../components/CrossRefCard.jsx";

const { Title, Text } = Typography;

function toHttps(url) {
  if (!url) return url;
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}

function fmtNumber(x) {
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  try {
    return new Intl.NumberFormat().format(x);
  } catch {
    return String(x);
  }
}

function fmtMoney(x) {
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(x);
  } catch {
    return String(x);
  }
}

function fmtFloat(x, digits = 2) {
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  const n = Number(x);
  if (Number.isNaN(n)) return String(x);
  return n.toFixed(digits);
}

export default function CountryDetails() {
  const { iso2 = "" } = useParams();
  const decodedIso2 = decodeURIComponent(iso2).toUpperCase();
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
        const res = await getCountryByIso2(decodedIso2);
        if (alive) setData(res);
      } catch (e) {
        if (alive) {
          setError(
            e?.response?.data?.message ||
              e?.message ||
              "Failed to fetch country."
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [decodedIso2]);

  const country = data?.country || {};
  const label = country?.label || decodedIso2;

  const flagUrl = toHttps(country?.flagImage || null);
  const coatUrl = toHttps(country?.coatOfArmsImage || null);

  const capitalLat = country?.capitalCoordinates?.lat;
  const capitalLon = country?.capitalCoordinates?.lon;

  const aboutUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${location.pathname}`
      : `/country/${encodeURIComponent(decodedIso2)}`;

  const cityRows = Array.isArray(country?.majorCities)
    ? country.majorCities.map((c, idx) => ({
        key: c?.id || `${c?.name || "city"}-${idx}`,
        name: c?.name ?? "—",
        population: c?.population,
        lat: c?.lat,
        lon: c?.lon,
        id: c?.id,
      }))
    : [];

  const cityColumns = [
    {
      title: "City",
      dataIndex: "name",
      key: "name",
      render: (v, row) => {
        return (
          <span>
            {v}
            {row?.id ? (
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }} />
            ) : null}
          </span>
        );
      },
    },
    {
      title: "Population",
      dataIndex: "population",
      key: "population",
      align: "right",
      render: (v) => (v == null ? "—" : fmtNumber(v)),
    },
    {
      title: "Lat",
      dataIndex: "lat",
      key: "lat",
      align: "right",
      render: (v) => (v == null ? "—" : fmtFloat(v, 4)),
    },
    {
      title: "Lon",
      dataIndex: "lon",
      key: "lon",
      align: "right",
      render: (v) => (v == null ? "—" : fmtFloat(v, 4)),
    },
  ];

  return (
    <Layout className="page">
      <div className="centered" prefix="schema: https://schema.org/">
        <div typeof="schema:Country" about={aboutUrl} resource={aboutUrl}>
          <meta property="schema:identifier" content={decodedIso2} />

          {flagUrl ? <meta property="schema:image" content={flagUrl} /> : null}
          {coatUrl ? <meta property="schema:image" content={coatUrl} /> : null}

          {capitalLat != null && capitalLon != null ? (
            <span property="schema:geo" typeof="schema:GeoCoordinates">
              <meta property="schema:latitude" content={String(capitalLat)} />
              <meta property="schema:longitude" content={String(capitalLon)} />
            </span>
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
                  <span property="schema:name">{label}</span> ({decodedIso2})
                </Title>

                <div style={{ marginTop: 10 }}>
                  <Button>
                    <Link to="/">← Back</Link>
                  </Button>
                </div>
              </div>

              <CrossRefCard mode={{ kind: "countryPage", iso2: decodedIso2 }} />
            </div>

            {loading && (
              <Card>
                <Space>
                  <Spin />
                  <Text>Loading country…</Text>
                </Space>
              </Card>
            )}

            {error && <Alert type="error" message={error} showIcon />}

            {!loading && !error && data && (
              <>
                <Card title="Images" bordered>
                  <Space size={16} wrap>
                    {country?.flagImage ? (
                      <div>
                        <Text strong>Flag</Text>
                        <div style={{ marginTop: 8 }}>
                          <Image
                            width={220}
                            src={flagUrl}
                            alt={`Flag of ${label}`}
                          />
                        </div>
                      </div>
                    ) : (
                      <Text type="secondary">No flag image</Text>
                    )}

                    {country?.coatOfArmsImage ? (
                      <div>
                        <Text strong>Coat of arms</Text>
                        <div style={{ marginTop: 8 }}>
                          <Image
                            width={220}
                            src={coatUrl}
                            alt={`Coat of arms of ${label}`}
                          />
                        </div>
                      </div>
                    ) : null}
                  </Space>
                </Card>

                <Card title="Key metrics" bordered>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={8}>
                      <meta
                        property="schema:population"
                        content={
                          country?.population == null
                            ? ""
                            : String(country.population)
                        }
                      />
                      <Statistic
                        title="Population"
                        value={country?.population ?? null}
                        formatter={(v) => (v == null ? "—" : fmtNumber(v))}
                      />
                    </Col>

                    <Col xs={24} sm={12} md={8}>
                      <meta
                        property="schema:area"
                        content={
                          country?.areaKm2 == null
                            ? ""
                            : String(country.areaKm2)
                        }
                      />
                      <Statistic
                        title="Area (km²)"
                        value={country?.areaKm2 ?? null}
                        formatter={(v) => (v == null ? "—" : fmtNumber(v))}
                      />
                    </Col>

                    <Col xs={24} sm={12} md={8}>
                      {country?.populationDensity != null ? (
                        <span
                          property="schema:additionalProperty"
                          typeof="schema:PropertyValue"
                        >
                          <meta
                            property="schema:name"
                            content="Population density"
                          />
                          <meta
                            property="schema:value"
                            content={String(country.populationDensity)}
                          />
                          <meta property="schema:unitText" content="/km²" />
                        </span>
                      ) : null}

                      <Statistic
                        title="Population density"
                        value={country?.populationDensity ?? null}
                        suffix=" / km²"
                        formatter={(v) => (v == null ? "—" : fmtFloat(v, 2))}
                      />
                    </Col>

                    <Col xs={24} sm={12} md={8}>
                      {country?.gdpNominal != null ? (
                        <span
                          property="schema:additionalProperty"
                          typeof="schema:PropertyValue"
                        >
                          <meta property="schema:name" content="GDP nominal" />
                          <meta
                            property="schema:value"
                            content={String(country.gdpNominal)}
                          />
                        </span>
                      ) : null}

                      <Statistic
                        title="GDP (nominal)"
                        value={country?.gdpNominal ?? null}
                        formatter={(v) => (v == null ? "—" : fmtMoney(v))}
                      />
                    </Col>

                    <Col xs={24} sm={12} md={8}>
                      {country?.hdi != null ? (
                        <span
                          property="schema:additionalProperty"
                          typeof="schema:PropertyValue"
                        >
                          <meta property="schema:name" content="HDI" />
                          <meta
                            property="schema:value"
                            content={String(country.hdi)}
                          />
                        </span>
                      ) : null}

                      <Statistic
                        title="HDI"
                        value={country?.hdi ?? null}
                        formatter={(v) => (v == null ? "—" : fmtFloat(v, 3))}
                      />
                    </Col>

                    <Col xs={24} sm={12} md={8}>
                      {country?.gini != null ? (
                        <span
                          property="schema:additionalProperty"
                          typeof="schema:PropertyValue"
                        >
                          <meta property="schema:name" content="Gini" />
                          <meta
                            property="schema:value"
                            content={String(country.gini)}
                          />
                        </span>
                      ) : null}

                      <Statistic
                        title="Gini"
                        value={country?.gini ?? null}
                        formatter={(v) => (v == null ? "—" : fmtFloat(v, 1))}
                      />
                    </Col>

                    <Col xs={24} sm={12} md={8}>
                      {country?.lifeExpectancy != null ? (
                        <span
                          property="schema:additionalProperty"
                          typeof="schema:PropertyValue"
                        >
                          <meta
                            property="schema:name"
                            content="Life expectancy"
                          />
                          <meta
                            property="schema:value"
                            content={String(country.lifeExpectancy)}
                          />
                          <meta property="schema:unitText" content="years" />
                        </span>
                      ) : null}

                      <Statistic
                        title="Life expectancy"
                        value={country?.lifeExpectancy ?? null}
                        suffix=" years"
                        formatter={(v) => (v == null ? "—" : fmtFloat(v, 0))}
                      />
                    </Col>
                  </Row>
                </Card>

                <Card title="Facts" bordered>
                  <Descriptions bordered column={1}>
                    <Descriptions.Item label="ISO2">
                      <span property="schema:identifier">
                        {data?.iso2 ?? decodedIso2}
                      </span>
                    </Descriptions.Item>

                    <Descriptions.Item label="Country">
                      <span property="schema:name">{label}</span>
                    </Descriptions.Item>

                    <Descriptions.Item label="Capital">
                      <span property="schema:capital">
                        {country?.capital ?? "—"}
                      </span>
                    </Descriptions.Item>

                    <Descriptions.Item label="Continent">
                      <span property="schema:containedInPlace">
                        {country?.continent ?? "—"}
                      </span>
                    </Descriptions.Item>

                    <Descriptions.Item label="Internet TLD">
                      {country?.internetTld ? (
                        <span property="schema:identifier">
                          {country.internetTld}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Descriptions.Item>

                    <Descriptions.Item label="Calling code">
                      {country?.callingCode ? (
                        <span property="schema:telephone">
                          {country.callingCode}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Descriptions.Item>

                    <Descriptions.Item label="Currency">
                      {country?.currency?.label ? (
                        <span property="schema:currency">
                          {country.currency.label}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Descriptions.Item>

                    <Descriptions.Item label="Official languages">
                      {Array.isArray(country?.officialLanguages) &&
                      country.officialLanguages.length > 0 ? (
                        <Space wrap>
                          {country.officialLanguages.map((l) => (
                            <Tag key={l} property="schema:knowsLanguage">
                              {l}
                            </Tag>
                          ))}
                        </Space>
                      ) : (
                        "—"
                      )}
                    </Descriptions.Item>

                    <Descriptions.Item label="Timezones">
                      {Array.isArray(country?.timezones) &&
                      country.timezones.length > 0 ? (
                        <Space wrap>
                          {country.timezones.map((tz) => (
                            <Tag key={tz} property="schema:timeZone">
                              {tz}
                            </Tag>
                          ))}
                        </Space>
                      ) : (
                        "—"
                      )}
                    </Descriptions.Item>

                    <Descriptions.Item label="Capital coordinates">
                      {capitalLat != null && capitalLon != null ? (
                        <>
                          {fmtFloat(capitalLat, 4)}, {fmtFloat(capitalLon, 4)}
                        </>
                      ) : (
                        "—"
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card
                  title={`Cities from the country (${cityRows.length})`}
                  bordered
                  bodyStyle={{ paddingTop: 8 }}
                >
                  {cityRows.map((c) =>
                    c?.name ? (
                      <meta
                        key={`city-${c.key}`}
                        property="schema:keywords"
                        content={c.name}
                      />
                    ) : null
                  )}

                  {cityRows.length === 0 ? (
                    <Text type="secondary">No major cities returned.</Text>
                  ) : (
                    <Table
                      size="middle"
                      columns={cityColumns}
                      dataSource={cityRows}
                      pagination={{ pageSize: 8 }}
                    />
                  )}
                </Card>

                <Divider />
              </>
            )}
          </Space>
        </div>
      </div>
    </Layout>
  );
}
