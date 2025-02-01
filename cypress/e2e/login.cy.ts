before(() => {
  cy.initDB();
});

describe("login", () => {
  it("should display home page after login", () => {
    cy.setupDB("login", "setup");

    cy.login();

    // check that we can access the homepage
    cy.visit("/");
    cy.get("h3.page-title").should("contain", "My courses");
  });

  it("should be able to log out after login", () => {
    cy.setupDB("login", "setup");

    cy.login();

    // log out the current user
    cy.logout();

    // when visiting the home page now, it should be redirected to a login form
    cy.visit("/");
    cy.get("#login-btn").should("be.visible");
  });

  it("should be able to log out and redirect after login", () => {
    cy.setupDB("login", "setup");

    cy.login();

    // log out the current user
    cy.logout_redirect();

    // should be redirected to a login form
    cy.get("#login-btn").should("be.visible");
  });

  it("should be able to click the log out button to log out", () => {
    cy.setupDB("login", "setup");

    cy.login();

    cy.visit("/");

    // log out by clicking the log out button
    cy.get("#logout-btn").should("be.visible").click();

    // should redirect to the login screen
    cy.get("#login-btn").should("be.visible");
  });
});
