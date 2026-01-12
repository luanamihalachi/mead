import axios from "axios";

export function makeHttp(baseURL) {
  return axios.create({
    baseURL,
    timeout: 15000,
    headers: { "Content-Type": "application/json" },
  });
}
