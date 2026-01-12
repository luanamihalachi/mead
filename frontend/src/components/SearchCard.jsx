import React from "react";
import { Card, Input, Space, Typography, Button, Select } from "antd";

const { Title, Text } = Typography;

export default function SearchCard({
  title,
  subtitle,
  placeholder,
  buttonText,
  onSearch,

  selectOptions,
  selectPlaceholder,
}) {
  const isSelect = Array.isArray(selectOptions) && selectOptions.length > 0;

  const [value, setValue] = React.useState(isSelect ? null : "");

  const submit = () => {
    const v = (value ?? "").toString().trim();
    if (!v) return;
    onSearch(v);
  };

  return (
    <Card style={{ height: "100%" }} bordered>
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Title level={4} style={{ margin: 0 }}>
          {title}
        </Title>
        <Text type="secondary">{subtitle}</Text>

        {isSelect ? (
          <Select
            size="large"
            style={{ width: "100%" }}
            placeholder={selectPlaceholder || "Select…"}
            value={value}
            onChange={(v) => setValue(v)}
            options={selectOptions}
            allowClear
          />
        ) : (
          <Input
            size="large"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPressEnter={submit}
            allowClear
          />
        )}

        <Button
          type="primary"
          size="large"
          onClick={submit}
          disabled={isSelect ? !value : !String(value).trim()}
        >
          {buttonText}
        </Button>
      </Space>
    </Card>
  );
}
