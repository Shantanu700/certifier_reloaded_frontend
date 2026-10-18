/**
 * Inside route handlers (not pages or server actions) Next 16.3's patched
 * fetch sends a Request object's body chunked, without Content-Length, and
 * Django reads that as an empty body. Re-issue it as url + init so the
 * length survives. Pass as the client's `fetch` option from route handlers.
 */
export const fetchWithLength = (async (input: RequestInfo | URL) => {
  const request = input as Request;
  return fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: await request.text(),
  });
}) as typeof fetch;
