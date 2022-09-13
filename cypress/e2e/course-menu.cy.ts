// set date constants
const TWO_DAYS_AGO = new Date("2020-06-13T12:00:00");
const YESTERDAY = new Date("2020-06-14T12:00:00");
const NOW = new Date("2020-06-15T12:00:00");
const TOMORROW = new Date("2020-06-16T12:00:00");
// course data for mock endpoints
const COURSES_DATA = [
  {
    id: 1,
    name: "CS61A",
    enrollmentStart: TWO_DAYS_AGO.toISOString(),
    enrollmentOpen: true,
    userCanEnroll: false
  },
  {
    id: 2,
    name: "CS61B",
    enrollmentStart: TWO_DAYS_AGO.toISOString(),
    enrollmentOpen: true,
    userCanEnroll: true
  },
  {
    id: 3,
    name: "CS61C",
    enrollmentStart: TOMORROW.toISOString(),
    enrollmentOpen: false,
    userCanEnroll: false
  }
];

/**
 * Set up network stubs.
 */
const baseStubs = (priorityEnrollment = false) => {
  cy.intercept({ method: "GET", url: "/api/profiles/" }, []).as("getProfiles");
  cy.intercept({ method: "GET", url: "/api/matcher/active/" }, []).as("getMatcherActive");
  cy.intercept({ method: "GET", url: "/api/courses/" }, COURSES_DATA).as("getCourses");
  cy.intercept({ method: "GET", url: "/api/courses/*/sections/" }, { sections: {}, userIsCoordinator: false }).as(
    "getSection"
  );

  const baseUserInfo = {
    id: 1,
    email: "demo_user@berkeley.edu",
    firstName: "Demo",
    lastName: "User",
    priorityEnrollment: null
  };
  if (priorityEnrollment) {
    cy.intercept({ method: "GET", url: "/api/userinfo/" }, { ...baseUserInfo, priorityEnrollment: YESTERDAY }).as(
      "getPriorityEnrollment"
    );
  } else {
    cy.intercept({ method: "GET", url: "/api/userinfo/" }, baseUserInfo).as("getPriorityEnrollment");
  }
};

beforeEach(() => {
  cy.clock(NOW); // set up clock
  cy.login();
});

describe("course menu", () => {
  it("should be accessible from home page", () => {
    // network stubs
    baseStubs();

    // visit the home page
    cy.visit("/");

    // check that we can access the menu
    cy.contains(/add course/i).click();

    // check that it redirects to the courses page
    cy.url().should("eq", Cypress.config().baseUrl + "/courses");
  });

  describe("should display courses and enrollment times", () => {
    it("with no priority enrollment", () => {
      // network stubs
      baseStubs();

      // visit the courses page
      cy.visit("/courses");

      // check that CS61A, CS61B, CS61C are all visible
      cy.contains(/cs61a/i).should("be.visible");
      cy.contains(/cs61b/i).should("be.visible");
      cy.contains(/cs61c/i).should("be.visible");

      // check that CS61C shows in enrollment times, but not CS61A or CS61B
      cy.get(".enrollment-container").contains(/cs61a/i).should("not.exist");
      cy.get(".enrollment-container").contains(/cs61b/i).should("not.exist");
      cy.get(".enrollment-container").contains(/cs61c/i).should("exist");
    });

    it("with priority enrollment", () => {
      // network stubs
      baseStubs(true);

      // visit the courses page
      cy.visit("/courses");

      // check that CS61A, CS61B, CS61C are all visible
      cy.contains(/cs61a/i).should("be.visible");
      cy.contains(/cs61b/i).should("be.visible");
      cy.contains(/cs61c/i).should("be.visible");

      // check that CS61C shows in enrollment times, but not CS61A or CS61B
      cy.get(".enrollment-container").contains(/cs61a/i).should("not.exist");
      cy.get(".enrollment-container").contains(/cs61b/i).should("not.exist");
      cy.get(".enrollment-container").contains(/cs61c/i).should("exist");

      // check that priority enrollment shows in enrollment times
      cy.get(".enrollment-container")
        .contains(/priority/i)
        .should("exist");
    });
  });

  it("should have buttons that navigate to course pages", () => {
    baseStubs();

    // visit the course menu
    cy.visit("/courses");

    // check that CS61A is clickable
    cy.contains(/cs61a/i).click();
    cy.url().should("eq", Cypress.config().baseUrl + "/courses/1");

    // back to the course menu
    cy.go("back");
    cy.url().should("eq", Cypress.config().baseUrl + "/courses");

    // check that CS61B is clickable
    cy.contains(/cs61b/i).click();
    cy.url().should("eq", Cypress.config().baseUrl + "/courses/2");

    // back to the course menu
    cy.go("back");
    cy.url().should("eq", Cypress.config().baseUrl + "/courses");

    // check that CS61C is clickable
    cy.contains(/cs61c/i).click();
    cy.url().should("eq", Cypress.config().baseUrl + "/courses/3");

    // back to the course menu
    cy.go("back");
    cy.url().should("eq", Cypress.config().baseUrl + "/courses");
  });
});
