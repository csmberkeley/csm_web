import Cookies from "js-cookie";

/* Why is this useful? Trying to access a mispelled property of an object will result in an error
   during build, whereas a mispelled string literal would cause an error only when fetch
   was actually called */
export const HTTP_METHODS = Object.freeze({
  POST: "POST",
  GET: "GET",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE"
});

export function normalizeEndpoint(endpoint: string) {
  if (endpoint[0] == "/") {
    endpoint = endpoint.slice(1);
  }
  if (endpoint[endpoint.length - 1] != "/") {
    endpoint += "/";
  }
  return `/api/${endpoint}`;
}

export function fetchWithMethod(
  endpoint: string,
  method: string,
  data: any = {},
  isFormData = false,
  queryParams: URLSearchParams | null = null
) {
  if (!Object.prototype.hasOwnProperty.call(HTTP_METHODS, method)) {
    // check that method choice is valid
    throw new Error("HTTP method must be one of: POST, GET, PUT, PATCH, or DELETE");
  }
  const normalizedEndpoint = endpointWithQueryParams(normalizeEndpoint(endpoint), queryParams);

  if (isFormData) {
    return fetch(normalizedEndpoint, {
      method: method,
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": Cookies.get("csrftoken") ?? ""
      },
      body: data
    });
  }
  return fetch(normalizedEndpoint, {
    method: method,
    credentials: "same-origin",
    headers: {
      "X-CSRFToken": Cookies.get("csrftoken") ?? "",
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
}

/**
 * Fetch data from normalized endpoint.
 */
export async function fetchNormalized(endpoint: string, queryParams: URLSearchParams | null = null) {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  return await fetch(endpointWithQueryParams(normalizedEndpoint, queryParams), { credentials: "same-origin" });
}

export async function fetchJSON(endpoint: string, queryParams: URLSearchParams | null = null) {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const response = await fetch(endpointWithQueryParams(normalizedEndpoint, queryParams), {
    credentials: "same-origin"
  });
  return await response.json();
}

/**
 * Add query parameters to the endpoint, if necessary.
 * If no query parameters, then the endpoint is returned unchanged.
 */
export function endpointWithQueryParams(endpoint: string, queryParams: URLSearchParams | null = null) {
  if (queryParams !== null) {
    return `${endpoint}?${queryParams}`;
  } else {
    return endpoint;
  }
}
