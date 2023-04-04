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
});
