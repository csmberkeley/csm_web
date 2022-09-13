/// <reference types="cypress" />

Cypress.Commands.add("login", () => {
  cy.request("/admin/login/")
    .its("headers")
    .then(headers => {
      const csrfToken = headers["set-cookie"][0].match(/csrftoken=(.*?);/)[1];
      cy.setCookie("csrftoken", csrfToken);
      cy.request({
        method: "POST",
        url: "/admin/login/",
        form: true,
        body: {
          username: "demo_user",
          password: "pass",
          csrfmiddlewaretoken: csrfToken
        }
      });
    });
});
