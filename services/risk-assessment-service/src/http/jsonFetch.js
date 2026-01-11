async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(
      `Request failed ${res.status} for ${url}: ${text.slice(0, 200)}`
    );
    err.status = res.status;
    throw err;
  }

  return res.json();
}

module.exports = { fetchJson };
