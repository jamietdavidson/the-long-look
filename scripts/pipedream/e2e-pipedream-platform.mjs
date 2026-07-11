export async function axios($, config) {
  const {method = 'get', url, headers = {}, data} = config;
  const response = await fetch(url, {
    method: method.toUpperCase(),
    headers,
    body: data == null ? undefined : JSON.stringify(data),
  });

  const text = await response.text();
  let parsed = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // keep text
  }

  if (!response.ok) {
    const error = new Error(`Request failed with status code ${response.status}`);
    error.response = {status: response.status, data: parsed};
    throw error;
  }

  return parsed;
}
