import { makeHttp } from "./http";
const http = makeHttp(import.meta.env.VITE_DISEASE_API);

export async function getConditionByKey(key) {
  const res = await http.get(`/conditions/${encodeURIComponent(key)}`);
  return res.data;
}
