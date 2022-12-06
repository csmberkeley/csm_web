before(() => {
  // initialize the database and cache
  cy.initDB();
});

describe("course menu", () => {
  it("should be accessible from home page", () => {
    // setup database
    cy.setupDB("course-menu", "setup");
    cy.login();

    // visit the home page
    cy.visit("/");

    // check that we can access the menu
    cy.contains(/add course/i).click();

    // check that it redirects to the courses page
    cy.location("pathname").should("eq", "/courses");
  });

  describe("should display courses and enrollment times", () => {
    it("with no priority enrollment", () => {
      // setup database
      cy.setupDB("course-menu", "setup");
      cy.login();

      // visit the courses page
      cy.visit("/courses");

      // check that CS61A, CS61B, CS61C are all visible
      cy.contains(/cs61a/i).should("be.visible");
      cy.contains(/cs61b/i).should("be.visible");
      cy.contains(/cs61c/i).should("be.visible");

      // check that CS61A and CS61C show in enrollment times, but not CS61B
      // cs61a: NOW < start < end; too early
      cy.contains(".enrollment-container", /cs61a/i).should("be.visible");
      // cs61b: start < NOW < end; valid
      cy.contains(".enrollment-container", /cs61b/i).should("not.exist");
      // cs61c: start < end < NOW; too late
      cy.contains(".enrollment-container", /cs61c/i).should("be.visible");
    });

    it("with priority enrollment in the past", () => {
      // setup database with priority enrollment
      cy.setupDB("course-menu", "setup_priority_enrollment_past");
      cy.login();

      // visit the courses page
      cy.visit("/courses");

      // check that CS61A, CS61B, CS61C are all visible
      cy.contains(/cs61a/i).should("be.visible");
      cy.contains(/cs61b/i).should("be.visible");
      cy.contains(/cs61c/i).should("be.visible");

      // check that CS61C show in enrollment times, but not CS61A or CS61B
      // because priority enrollment should be active for all courses; still too late for CS61C
      cy.contains(".enrollment-container", /cs61a/i).should("not.exist");
      cy.contains(".enrollment-container", /cs61b/i).should("not.exist");
      cy.contains(".enrollment-container", /cs61c/i).should("be.visible");

      // check that priority enrollment shows in enrollment times
      cy.contains(".enrollment-container", /priority/i).should("be.visible");
    });

    it("with priority enrollment in the future", () => {
      // setup database with priority enrollment
      cy.setupDB("course-menu", "setup_priority_enrollment_future");
      cy.login();

      // visit the courses page
      cy.visit("/courses");

      // check that CS61B, CS61C are all visible
      cy.contains(/cs61a/i).should("be.visible");
      cy.contains(/cs61b/i).should("be.visible");
      cy.contains(/cs61c/i).should("be.visible");

      // check that CS61A and CS61C show in enrollment times, but not CS61B
      // because priority enrollment exists, but is not time yet
      cy.contains(".enrollment-container", /cs61a/i).should("be.visible");
      cy.contains(".enrollment-container", /cs61b/i).should("not.exist");
      cy.contains(".enrollment-container", /cs61c/i).should("be.visible");

      // check that priority enrollment shows in enrollment times
      cy.contains(".enrollment-container", /priority/i).should("be.visible");
    });
  });

  it("should have buttons that navigate to course pages", () => {
    // setup database
    cy.setupDB("course-menu", "setup");
    cy.login();

    // visit the course menu
    cy.visit("/courses");

    // check that CS61A is clickable
    cy.contains(/cs61a/i).click();
    cy.location("pathname").should("eq", "/courses/1");

    // back to the course menu
    cy.go("back");
    cy.location("pathname").should("eq", "/courses");

    // check that CS61B is clickable
    cy.contains(/cs61b/i).click();
    cy.location("pathname").should("eq", "/courses/2");

    // back to the course menu
    cy.go("back");
    cy.location("pathname").should("eq", "/courses");

    // check that CS61C is clickable
    cy.contains(/cs61c/i).click();
    cy.location("pathname").should("eq", "/courses/3");

    // back to the course menu
    cy.go("back");
    cy.location("pathname").should("eq", "/courses");
  });
});
