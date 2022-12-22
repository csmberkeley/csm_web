/**
 * Student course tests are under the assumption that the layout
 * stays the same from the coordinator tests.
 *
 * These tests only check for student-specific enrollment actions
 * for the course menus.
 */

const checkEnrollButtons = (expectDisabled: boolean = false) => {
  cy.get(".day-btn").should("have.length", 3).should("be.visible");

  cy.get(".day-btn").each($btn => {
    // go to the section
    cy.wrap($btn).click();

    if (!$btn.text().match(/th/i)) {
      // verify enroll button is there
      cy.get(".section-card").each($card => {
        cy.wrap($card).within(() => {
          if (expectDisabled) {
            cy.get(".section-card-footer")
              .should("have.length", 1)
              // this may change if the implementation changes
              .should("not.have.css", "color", "rgba(0, 0, 0, 0)")
              .should("have.class", "disabled")
              // has the correct text
              .invoke("text")
              .should("match", /enroll/i);
          } else {
            cy.get(".section-card-footer")
              .should("have.length", 1)
              // this may change if the implementation changes
              .should("not.have.css", "color", "rgba(0, 0, 0, 0)")
              .should("not.have.class", "disabled")
              // has the correct text
              .invoke("text")
              .should("match", /enroll/i);
          }
        });
      });

      // verify no full sections
      cy.get(".section-card.full").should("not.exist");
    }

    cy.get("#show-unavailable-toggle").click();

    // verify all full sections have no enroll button
    cy.get(".section-card.full").each($card => {
      cy.wrap($card)
        // this may change if the implementation changes
        .find(".section-card-footer")
        .should("have.css", "color", "rgba(0, 0, 0, 0)");
    });

    // reset for next check
    cy.get("#show-unavailable-toggle").click();
  });
};

const checkEnrollAction = () => {
  cy.get(".section-card:not(.full) .section-card-footer").first().click();

  // enrollment should be successful
  cy.get(".modal-contents")
    .should("be.visible")
    .invoke("text")
    .should("match", /successfully enrolled/i);

  // click on the ok button
  cy.contains(".modal-contents .modal-btn", /ok/i)
    .click()
    // modal should disappear
    .should("not.exist");

  // should be brought to the home page
  cy.location("pathname").should("eq", "/");

  // home page should now have a card
  cy.get(".course-card")
    .should("have.length", 1)
    .within(() => {
      // enrolled as a student
      cy.contains(".relation-label", /student/i).should("be.visible");
      // for cs61a
      cy.contains(".course-card-name", /cs61a/i).should("be.visible");
    });
};

const checkFailedEnrollAction = () => {
  // iterate through each day
  cy.get(".day-btn").each($btn => {
    cy.wrap($btn).click();

    if ($btn.text().match(/th/i)) {
      // nothing to check on thursday; no sections with capacity
      return;
    }
    cy.get(".section-card").each($card => {
      // shouldn't be able to click on enroll
      cy.wrap($card)
        .contains(/enroll/i)
        .within($enroll => {
          // pointer events should be disabled
          cy.wrap($enroll).should("have.css", "pointer-events", "none");

          // force a click on enroll button anyways
          // ignore waiting to be actionable
          cy.wrap($enroll).click({ force: true });
        });

      // should open modal saying enrollment failed
      cy.get(".modal-contents")
        .should("be.visible")
        .invoke("text")
        .should("match", /enrollment failed/i);

      // dismiss modal
      cy.contains(".modal-contents .modal-btn", /ok/i).click().should("not.exist");
    });
  });

  // keep track of profiles requests
  cy.intercept("/api/profiles").as("profiles");

  // go back to home page
  cy.visit("/");

  // wait for all profiles to load
  cy.wait("@profiles");

  // should not see any cards
  cy.get(".course-card").should("not.exist");
};

before(() => {
  // initialize the database and cache
  cy.initDB();
});

describe("student course view", () => {
  context("with no priority enrollment", () => {
    context("with the course open", () => {
      it("should see enroll button for all sections", () => {
        // setup
        cy.setupDB("coordinator-student-course", "student_setup_open");
        cy.login();
        cy.visit("/courses/1");

        checkEnrollButtons();
      });

      it("should be able to enroll in a section", () => {
        // setup (mutates the database)
        cy.setupDB("coordinator-student-course", "student_setup_open", { mutate: true });
        cy.login();
        cy.visit("/courses/1");

        checkEnrollAction();
      });
    });

    context("with the course closed", () => {
      it("should see disabled enroll button and enrollment time for all sections", () => {
        cy.setupDB("coordinator-student-course", "student_setup_closed");
        cy.login();
        cy.visit("/courses/1");

        checkEnrollButtons(true);

        // iterate through each day
        cy.get(".day-btn").each($btn => {
          cy.wrap($btn).click();

          // should display no matter what day is selected
          cy.get("#course-enrollment-open-status")
            .should("be.visible")
            .invoke("text")
            .should("match", /^enrollment opens/i);
        });
      });

      it("should not be able to enroll in any section", () => {
        // if fails, could mutate the database
        cy.setupDB("coordinator-student-course", "student_setup_closed", { mutate: true });
        cy.login();
        cy.visit("/courses/1");

        checkFailedEnrollAction();
      });
    });
  });

  context("with priority enrollment", () => {
    context("with the course open", () => {
      it("should see enroll button for any section", () => {
        cy.setupDB("coordinator-student-course", "student_setup_open_priority");
        cy.login();
        cy.visit("/courses/1");

        checkEnrollButtons();
      });

      it("should be able to enroll in a section", () => {
        // will mutate the database
        cy.setupDB("coordinator-student-course", "student_setup_open_priority", { mutate: true });
        cy.login();
        cy.visit("/courses/1");

        checkEnrollAction();
      });
    });

    context("with the course closed", () => {
      it("should see disabled enroll button and priority enrollment text for all sections", () => {
        cy.setupDB("coordinator-student-course", "student_setup_closed_priority");
        cy.login();
        cy.visit("/courses/1");

        checkEnrollButtons(true);

        // iterate through each day
        cy.get(".day-btn").each($btn => {
          cy.wrap($btn).click();

          // should display no matter what day is selected
          cy.get("#course-enrollment-open-status")
            .should("be.visible")
            .invoke("text")
            .should("match", /^priority enrollment opens/i);
        });
      });

      it("should not be able to enroll in any section", () => {
        // if fails, could mutate the database
        cy.setupDB("coordinator-student-course", "student_setup_closed_priority", { mutate: true });
        cy.login();
        cy.visit("/courses/1");

        checkFailedEnrollAction();
      });
    });
  });
});
