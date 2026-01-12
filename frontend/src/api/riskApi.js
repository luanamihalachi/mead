import { makeHttp } from "./http";

const http = makeHttp(import.meta.env.VITE_RISK_API);

export async function getRiskForIso2Disease({ iso2, diseaseKey }) {
  const res = await http.get(
    `/risk/${encodeURIComponent(iso2)}/${encodeURIComponent(diseaseKey)}`
  );
  return res.data;
}
