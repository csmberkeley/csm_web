before(() => {
  cy.initDB();
});

describe("word of the day", () => {
  it("should be able to submit word of the day", () => {
    cy.setupDB("section/student-section", "setup_wotd", { mutate: true });
    cy.login();

    cy.intercept({ method: "GET", url: "/api/students/*/attendances" }).as("get-attendances");
    cy.intercept({ method: "GET", url: "/api/sections/1/wotd" }).as("get-wotd");
    cy.intercept({ method: "PUT", url: "/api/sections/1/wotd" }).as("put-wotd");

    cy.visit("/sections/1/attendance");
    cy.wait("@get-attendances");

    // get both dates; table is sorted with most recent first, so dates[0] > dates[1]
    const dates = [];
    cy.get("#attendance-table tbody tr")
      .should("have.length", 2)
      .each($row => {
        // first td should have date
        cy.wrap($row)
          .find("td")
          .first()
          .should("not.have.class", "status")
          .invoke("text")
          // save in array
          .then(text => dates.push(text));
      });

    // closure around access to ensure that the evaluation occurs asynchronously
    const PAST_DATE = () => dates[1];
    const FUTURE_DATE = () => dates[0];

    // ensure word of the day is visible
    cy.get("#word-of-the-day-card").within(() => {
      cy.contains(".word-of-the-day-title", /submit word of the day/i).should("be.visible");

      // initial date selection should be the most recent past date, which should have a word of the day
      cy.get(".form-select[name='word-of-the-day-date']").find(":selected").invoke("text").should("eq", PAST_DATE());
      cy.get(".form-select[name='word-of-the-day-date']")
        .find(":not(:selected)")
        .invoke("text")
        .should("eq", FUTURE_DATE());
      // submit button should be disabled initially (no word has been inputted)
      cy.contains(".primary-btn", /submit/i).should("be.disabled");
      // no deadline set
      cy.get(".word-of-the-day-deadline").should("not.exist");

      // swap to future date
      cy.get(".form-select[name='word-of-the-day-date']").select(FUTURE_DATE());
      // submit button should still be disabled (no word has been inputted)
      cy.contains(".primary-btn", /submit/i).should("be.disabled");
      // no deadline set
      cy.get(".word-of-the-day-deadline").should("not.exist");

      // word of the day for future date; should fail
      cy.get(".form-input[name='word-of-the-day']").type("wordoftheday");
      cy.contains(".primary-btn", /submit/i)
        .should("not.be.disabled")
        .click();

      cy.wait("@put-wotd").its("response.statusCode").should("eq", 403);

      cy.get(".word-of-the-day-status-text")
        .should("be.visible")
        .invoke("text")
        .should("match", /incorrect word of the day/i);

      // swap to past date
      cy.get(".form-select[name='word-of-the-day-date']").select(PAST_DATE());
      // no deadline set
      cy.get(".word-of-the-day-deadline").should("not.exist");
      // text should still be here from the last submission
      cy.contains(".primary-btn", /submit/i).click();

      cy.wait("@put-wotd").its("response.statusCode").should("eq", 200);
    });

    cy.wait("@get-attendances");

    // check attendance has updated
    cy.get("#attendance-table tbody tr").each(($row, idx) => {
      cy.wrap($row).find("td").first().invoke("text").should("eq", dates[idx]);
      if (idx === 0) {
        // future
        cy.wrap($row).find(".attendance-status").invoke("text").should("be.empty");
      } else if (idx === 1) {
        // past
        cy.wrap($row)
          .find(".attendance-status")
          .invoke("text")
          .should("match", /present/i);
      }
    });

    // word of the day selection should no longer show submitted date
    cy.get("#word-of-the-day-card").within(() => {
      cy.contains(".word-of-the-day-title", /submit word of the day/i).should("be.visible");

      cy.get(".form-select[name='word-of-the-day-date']")
        .find("option")
        .should("have.length", 1)
        .invoke("text")
        .should("eq", dates[0]);
    });
  });

  it("should not be able to submit to word of the day if attendance already taken", () => {
    cy.setupDB("section/student-section", "setup_wotd_with_existing_attendance");
    cy.login();

    cy.intercept({ method: "GET", url: "/api/students/*/attendances" }).as("get-attendances");

    cy.visit("/sections/1/attendance");
    cy.wait("@get-attendances");

    // get both dates
    const dates = [];
    cy.get("#attendance-table tbody tr")
      .should("have.length", 2)
      .each(($row, idx) => {
        // first td should have date
        cy.wrap($row)
          .find("td")
          .first()
          .should("not.have.class", "attendance-status")
          .invoke("text")
          // save in array
          .then(text => dates.push(text));

        if (idx === 0) {
          // first row is future occurrence; no attendance taken
          cy.wrap($row).find(".attendance-status").should("have.length", 1).invoke("text").should("be.empty");
        } else if (idx === 1) {
          cy.wrap($row)
            .find(".attendance-status")
            .should("have.length", 1)
            .invoke("text")
            .should("match", /unexcused absence/i);
        }
      });

    // ensure word of the day is visible
    cy.get("#word-of-the-day-card").within(() => {
      cy.contains(".word-of-the-day-title", /submit word of the day/i).should("be.visible");

      // select input should only have one choice for future date
      cy.get(".form-select[name='word-of-the-day-date']")
        .find("option")
        .should("have.length", 1)
        .invoke("text")
        .should("eq", dates[0]);
    });
  });

  it("should not be able to submit if deadline passed", () => {
    cy.setupDB("section/student-section", "setup_wotd_with_deadline", { mutate: true });
    cy.login();

    cy.intercept({ method: "GET", url: "/api/students/*/attendances" }).as("get-attendances");
    cy.intercept({ method: "PUT", url: "/api/sections/*/wotd" }).as("put-wotd");

    cy.visit("/sections/1/attendance");
    cy.wait("@get-attendances");

    // get both dates
    const dates = [];
    cy.get("#attendance-table tbody tr")
      .should("have.length", 2)
      .each($row => {
        // first td should have date
        cy.wrap($row)
          .find("td")
          .first()
          .should("not.have.class", "status")
          .invoke("text")
          // save in array
          .then(text => dates.push(text));
      });

    // closure around access to ensure that the evaluation occurs asynchronously
    const PAST_DATE = () => dates[1];
    const FUTURE_DATE = () => dates[0];

    cy.get("#word-of-the-day-card").within(() => {
      cy.contains(".word-of-the-day-title", /submit word of the day/i).should("be.visible");

      // currently should be on past date; deadline should have passed
      cy.get(".form-select[name='word-of-the-day-date']").find(":selected").invoke("text").should("eq", PAST_DATE());
      cy.get(".word-of-the-day-deadline").should("be.visible").should("have.class", "passed");

      // try typing something; should not allow submitting
      cy.get(".form-input[name='word-of-the-day']").type("wordoftheday");
      cy.contains(".primary-btn", /submit/i).should("be.disabled");

      // switch to future date; deadline not passed yet
      cy.get(".form-select[name='word-of-the-day-date']").select(FUTURE_DATE());
      cy.get(".word-of-the-day-deadline").should("be.visible").should("not.have.class", "passed");

      // should be able to submit normally
      cy.get(".form-input[name='word-of-the-day']").clear().type("password");
      cy.contains(".primary-btn", /submit/i)
        .should("not.be.disabled")
        .click();
    });

    cy.wait("@put-wotd");
    cy.wait("@get-attendances");

    // check attendance has updated
    cy.get("#attendance-table tbody tr").each(($row, idx) => {
      cy.wrap($row).find("td").first().invoke("text").should("eq", dates[idx]);
      if (idx === 0) {
        // future
        cy.wrap($row)
          .find(".attendance-status")
          .invoke("text")
          .should("match", /present/i);
      } else if (idx === 1) {
        // past
        cy.wrap($row).find(".attendance-status").invoke("text").should("be.empty");
      }
    });

    // word of the day selection should no longer show submitted date
    cy.get("#word-of-the-day-card").within(() => {
      cy.contains(".word-of-the-day-title", /submit word of the day/i).should("be.visible");

      cy.get(".form-select[name='word-of-the-day-date']")
        .find("option")
        .should("have.length", 1)
        .invoke("text")
        .should("eq", dates[1]);
    });
  });
});
