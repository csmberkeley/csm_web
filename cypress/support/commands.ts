/// <reference types="cypress" />

interface LoginInfo {
  username: string;
  password: string;
}

/**
 * Headless login
 */
Cypress.Commands.add("login", (loginInfo: LoginInfo = { username: "demo_user", password: "pass" }) => {
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
          ...loginInfo,
          csrfmiddlewaretoken: csrfToken
        }
      });
    });
});

/**
 * Headless logout
 */
Cypress.Commands.add("logout", () => {
  cy.getCookie("csrftoken").then(csrfCookie => {
    return cy.request({
      method: "POST",
      url: "/logout/",
      form: true,
      body: { csrfmiddlewaretoken: csrfCookie.value }
    });
  });
});

/**
 * Logout with redirect
 */
Cypress.Commands.add("logout_redirect", () => {
  cy.getCookie("csrftoken").then(csrfCookie => {
    cy.visit("/logout/", {
      method: "POST",
      body: { csrfmiddlewaretoken: csrfCookie.value }
    });
  });
});

interface SetupDBOptions {
  force?: boolean;
  mutate?: boolean;
}

/**
 * Setup the Django database for use in Cypress tests
 */
Cypress.Commands.add(
  "setupDB",
  (script_path: string, func_name: string, options: SetupDBOptions = { force: false, mutate: false }) => {
    // validate arguments
    expect(script_path.match(/[a-zA-Z0-9_/.-]/)).to.not.be.null;
    expect(func_name.match(/[a-zA-Z0-9_]/)).to.not.be.null;

    // insert prefix in case of docker container; default to empty
    const prefix = Cypress.env("DOCKER_PREFIX") ?? "";

    // run setup script
    let command = `${prefix} python3 cypress/db/_setup.py "${script_path}" "${func_name}"`;
    if (options.force) {
      command += " --force";
    }
    if (options.mutate) {
      command += " --mutate";
    }
    cy._exec(command);
  }
);

/**
 * Initialize the Django database and cache
 */
Cypress.Commands.add("initDB", () => {
  // insert prefix in case of docker container; default to empty
  const prefix = Cypress.env("DOCKER_PREFIX") ?? "";
  cy._exec(`${prefix} python3 cypress/db/_setup.py --init`);
});

/**
 * Wrapper wround cy.exec that does not truncate output
 */
Cypress.Commands.add("_exec", command => {
  cy.exec(command, { failOnNonZeroExit: false }).then(result => {
    if (result.code) {
      throw new Error(
        `Execution of ${command} failed\nExit code: ${result.code}\nStdout:\n${result.stdout}\nStderr:\n${result.stderr}`
      );
    }
  });
});

/**
 * Chained click until a condition is satisfied;
 * doesn't use the Cypress .click(), and instead uses the jQuery .trigger("click").
 *
 * Should guard this with a visibility check to ensure that the element is actually clickable.
 */
Cypress.Commands.add("clickUntil", { prevSubject: true }, (subject: JQuery<HTMLElement>, condition) => {
  const click = ($el: JQuery<HTMLElement>) => $el.trigger("click");
  return cy.wrap(subject).pipe(click).should(condition);
});
