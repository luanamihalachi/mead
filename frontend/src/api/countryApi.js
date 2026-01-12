import { makeHttp } from "./http";

const http = makeHttp(import.meta.env.VITE_COUNTRY_API);

export async function getCountryByIso2(iso2) {
  const res = await http.get(`/geo/${encodeURIComponent(iso2)}`);
  return res.data;
}
