/**
 * Tests for interactions between a mentor and a student.
 *
 * Logs in as both mentor and student to test functionality.
 */
before(() => {
  cy.initDB();
});

describe("word of the day", () => {
  const WORD_OF_THE_DAY = "csmtechisthebest";
  const WRONG_WORD_OF_THE_DAY = "password";

  it("mentor word of the day should be saved for student", () => {
    cy.setupDB("section/mentor-student-interaction", "setup_section", { mutate: true });

    cy.intercept({ method: "GET", url: "/api/students/*/attendances" }).as("get-student-attendances");
    cy.intercept({ method: "GET", url: "/api/sections/*/attendance" }).as("get-mentor-attendances");

    cy.intercept({ method: "PUT", url: "/api/sections/*/wotd" }).as("put-wotd");
    cy.intercept({ method: "GET", url: "/api/sections/*/wotd" }).as("get-wotd");

    // log in as mentor first
    cy.login({ username: "demo_mentor", password: "pass" });
    cy.visit("/sections/1/attendance");
    cy.wait("@get-mentor-attendances");

    // create new word of the day
    cy.get("#word-of-the-day-container").within(() => {
      cy.contains(".word-of-the-day-title", /word of the day/i).should("be.visible");
      cy.contains(".word-of-the-day-status", /unselected/i).should("be.visible");

      // input a custom word of the day (future occurrence)
      cy.get(".word-of-the-day-input").type(WORD_OF_THE_DAY);
      cy.get(".word-of-the-day-submit").click();
    });

    cy.wait("@put-wotd");
    cy.wait("@get-wotd");

    // check client-side that it has updated
    cy.get(".word-of-the-day-input").invoke("val").should("eq", WORD_OF_THE_DAY);
    cy.contains(".word-of-the-day-status", /selected/i).should("be.visible");
    cy.get(".word-of-the-day-submit").should("be.disabled"); // disabled because unchanged

    // logout
    cy.visit("/logout/");

    // log in as student next
    cy.login({ username: "demo_student", password: "pass" });
    cy.visit("/sections/1/attendance");
    cy.wait("@get-student-attendances");

    cy.get("#word-of-the-day-card").within(() => {
      cy.contains(".word-of-the-day-title", /submit word of the day/i).should("be.visible");

      cy.get(".word-of-the-day-input").type(WRONG_WORD_OF_THE_DAY);
      cy.get(".word-of-the-day-deadline").should("not.exist"); // no deadline set
      cy.get(".word-of-the-day-submit").click();

      // wrong word, should fail
      cy.wait("@put-wotd").its("response.statusCode").should("eq", 403);
      cy.get(".word-of-the-day-status-text")
        .should("be.visible")
        .invoke("text")
        .should("match", /incorrect word of the day/i);

      // try correct word
      cy.get(".word-of-the-day-input").clear().type(WORD_OF_THE_DAY);
      cy.get(".word-of-the-day-deadline").should("not.exist"); // no deadline set
      cy.get(".word-of-the-day-submit").click();
      cy.wait("@put-wotd").its("response.statusCode").should("eq", 200);
    });

    cy.wait("@get-student-attendances");

    // check attendance has updated
    cy.get("#attendance-table tbody tr").each(($row, idx) => {
      if (idx === 0) {
        // future
        cy.wrap($row)
          .find("td.status")
          .invoke("text")
          .should("match", /present/i);
      } else if (idx === 1) {
        // past
        cy.wrap($row).find("td.status").invoke("text").should("be.empty");
      }
    });

    // logout
    cy.visit("/logout/");

    // log in as mentor again
    cy.login({ username: "demo_mentor", password: "pass" });
    cy.visit("/sections/1/attendance");
    cy.wait("@get-mentor-attendances");

    // attendance should be marked as present
    cy.get("#mentor-attendance-table select").should("have.length", 1).invoke("val").should("eq", "PR");
  });
});
