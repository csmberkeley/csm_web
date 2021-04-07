import Cookies from "js-cookie";

/* Why is this useful? Trying to access a mispelled property of an object will result in an error
   during build, whereas a mispelled string literal would cause an error only when fetch
   was actually called */
const HTTP_METHODS = Object.freeze({
  POST: "POST",
  GET: "GET",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE"
});
export { HTTP_METHODS };

export function normalizeEndpoint(endpoint) {
  if (endpoint[0] == "/") {
    endpoint = endpoint.slice(1);
  }
  if (endpoint[endpoint.length - 1] != "/") {
    endpoint += "/";
  }
  return `/api/${endpoint}`;
}

export function fetchWithMethod(endpoint, method, data = {}) {
  if (!Object.prototype.hasOwnProperty.call(HTTP_METHODS, method)) {
    // check that method choice is valid
    throw new Error("HTTP method must be one of: POST, GET, PUT, PATCH, or DELETE");
  }
  return fetch(normalizeEndpoint(endpoint), {
    method: method,
    credentials: "same-origin",
    headers: {
      "X-CSRFToken": Cookies.get("csrftoken"),
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
}

export function fetchJSON(endpoint) {
  return fetch(normalizeEndpoint(endpoint), { credentials: "same-origin" }).then(response => response.json());
}
