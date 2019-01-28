import Cookies from "js-cookie";

export function post(endpoint, data) {
  return fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "X-CSRFToken": Cookies.get("csrftoken"),
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
}
