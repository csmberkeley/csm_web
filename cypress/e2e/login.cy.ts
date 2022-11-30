describe("login", () => {
  beforeEach(() => {
    cy.setupDB("login", "setup");
  });

  it("should be able to login", () => {
    cy.login();
  });

  it("should display home page after login", () => {
    cy.login();

    // check that we can access the homepage
    cy.visit("/");
    cy.get("h3.page-title").should("contain", "My courses");
  });
});
