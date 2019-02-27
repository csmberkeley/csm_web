import Cookies from "js-cookie";

export function fetchWithMethod(endpoint, method, data = {}) {
  return fetch(`/api/${endpoint}`, {
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
  return fetch(`/api/${endpoint}`).then(response => response.json());
}
