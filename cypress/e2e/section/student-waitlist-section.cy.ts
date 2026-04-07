before(() => {
  cy.initDB();
});

/**
 * tests for student waitlist section view
 */
describe("waitlisted student section view", () => {
  it("should display waitlist position and section info", () => {
    cy.setupDB("section/student-waitlist-section", "setup_waitlisted_student");
    cy.login();
    cy.visit("/sections/1");

    // should display course title
    cy.contains(".section-detail-header-title", /cs61a/i).should("be.visible");

    // should display "waitlist" role label
    cy.contains(".relation-label", /waitlist/i).should("be.visible");

    // should display "My Waitlisted Section" page title
    cy.contains(".section-detail-page-title", /my waitlisted section/i).should("be.visible");

    // should display mentor info
    cy.get(".section-detail-info-card.mentor").within(() => {
      cy.contains("h5", /test mentor/i).should("be.visible");
      cy.contains("a", /testmentor@berkeley.edu/i).should("be.visible");
    });

    // should display waitlist position
    cy.get(".section-detail-info-card.waitlist-position").within(() => {
      cy.contains("h5", /you are #2 on the waitlist/i).should("be.visible");
      cy.contains("p", /automatically enrolled/i).should("be.visible");
    });

    // should display leave waitlist button
    cy.get(".section-detail-info-card.leave-waitlist, .section-detail-info-card.drop-section").within(() => {
      cy.contains("button", /leave/i).should("be.visible");
    });
  });

  it("should be able to leave waitlist", () => {
    cy.setupDB("section/student-waitlist-section", "setup_waitlisted_student", { mutate: true });
    cy.login();

    cy.intercept({ method: "PATCH", url: "/api/waitlist/*/drop" }).as("drop-waitlist");

    cy.visit("/sections/1");

    // click leave waitlist button
    cy.contains("button.danger-btn", /leave/i).click();

    // confirmation modal should appear
    cy.get(".modal-contents, .drop-confirmation").within(() => {
      cy.contains(/are you sure/i).should("be.visible");
      cy.contains("button", /confirm/i).click();
    });

    // should redirect to home page
    cy.location("pathname").should("eq", "/");
  });
});
