describe("login", () => {
  it("should be able to login", () => {
    cy.login();
  });

  it("should display home page after login", () => {
    cy.login();
    cy.intercept({ method: "GET", url: "/api/profiles/" }, []).as("getProfiles");
    cy.intercept({ method: "GET", url: "/api/matcher/active/" }, []).as("getMatcherActive");

    // check that we can access the homepage
    cy.visit("/");
    cy.get("h3.page-title").should("contain", "My courses");
  });
});
