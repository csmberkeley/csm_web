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

/**
 * Endpoint for logging out the user.
 * Must end in a slash, otherwise Django will complain, since this will redirect to the login endpoint.
 */
const LOGOUT_ENDPOINT = "/logout/";

/**
 * Log out the current user by sending a POST request to ``/logout/`.
 *
 * Since we must also redirect after sending the POST request (following the server response),
 * this sends the request using a newly created form with the CSRF token added.
 */
export function logout() {
  const csrfToken = Cookies.get("csrftoken") ?? "";

  // must use a form to allow redirect after the POST request
  const form = document.createElement("form");
  form.method = "POST";
  form.action = LOGOUT_ENDPOINT;

  // add the csrf token
  const csrfInput = document.createElement("input");
  csrfInput.type = "hidden";
  csrfInput.name = "csrfmiddlewaretoken";
  csrfInput.value = csrfToken;
  form.appendChild(csrfInput);

  // form must also be present in the document body
  document.body.appendChild(form);

  // submitting the form logs the user out and redirects to the login screen
  form.submit();
}

export function fetchWithMethod(
  endpoint: string,
  method: string,
  data: any = {}, // eslint-disable-line @typescript-eslint/no-explicit-any
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
