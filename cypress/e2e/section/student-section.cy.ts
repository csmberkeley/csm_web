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

    // ensure word of the day is visible
    cy.get("#word-of-the-day-card").within(() => {
      cy.contains(".word-of-the-day-title", /submit word of the day/i).should("be.visible");

      // first date (default) should not have word of the day, second date should
      cy.get(".word-of-the-day-select").find(":selected").invoke("text").should("eq", dates[0]);
      cy.get(".word-of-the-day-submit").should("be.disabled");
      cy.get(".word-of-the-day-deadline").should("not.exist"); // no deadline set

      // word of the day for second date; should fail
      cy.get(".word-of-the-day-input").type("wordoftheday");
      cy.get(".word-of-the-day-submit").should("not.be.disabled").click();

      cy.wait("@put-wotd").its("response.statusCode").should("eq", 403);

      cy.get(".word-of-the-day-status-text")
        .should("be.visible")
        .invoke("text")
        .should("match", /incorrect word of the day/i);

      // swap to second date
      cy.get(".word-of-the-day-select").select(dates[1]);

      cy.get(".word-of-the-day-deadline").should("not.exist"); // no deadline set
      cy.get(".word-of-the-day-submit").click();

      cy.wait("@put-wotd").its("response.statusCode").should("eq", 200);
    });

    cy.wait("@get-attendances");

    // check attendance has updated
    cy.get("#attendance-table tbody tr").each(($row, idx) => {
      cy.wrap($row).find("td").first().invoke("text").should("eq", dates[idx]);
      if (idx === 0) {
        // future
        cy.wrap($row).find("td.status").invoke("text").should("be.empty");
      } else if (idx === 1) {
        // past
        cy.wrap($row)
          .find("td.status")
          .invoke("text")
          .should("match", /present/i);
      }
    });

    // word of the day selection should no longer show submitted date
    cy.get("#word-of-the-day-card").within(() => {
      cy.contains(".word-of-the-day-title", /submit word of the day/i).should("be.visible");

      cy.get(".word-of-the-day-select").find("option").should("have.length", 1).invoke("text").should("eq", dates[0]);
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
          .should("not.have.class", "status")
          .invoke("text")
          // save in array
          .then(text => dates.push(text));

        if (idx === 0) {
          // first row is future occurrence; no attendance taken
          cy.wrap($row).find("td.status").should("have.length", 1).invoke("text").should("be.empty");
        } else if (idx === 1) {
          cy.wrap($row)
            .find("td.status")
            .should("have.length", 1)
            .invoke("text")
            .should("match", /unexcused absence/i);
        }
      });

    // ensure word of the day is visible
    cy.get("#word-of-the-day-card").within(() => {
      cy.contains(".word-of-the-day-title", /submit word of the day/i).should("be.visible");

      // select input should only have one choice for future date
      cy.get(".word-of-the-day-select").find("option").should("have.length", 1).invoke("text").should("eq", dates[0]);
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

    cy.get("#word-of-the-day-card").within(() => {
      cy.contains(".word-of-the-day-title", /submit word of the day/i).should("be.visible");

      // currently should be on future date; deadline not passed yet
      cy.get(".word-of-the-day-select").find(":selected").invoke("text").should("eq", dates[0]);
      cy.get(".word-of-the-day-deadline").should("be.visible").should("not.have.class", "passed");

      // switch to past date; deadline should have passed
      cy.get(".word-of-the-day-select").select(dates[1]);
      cy.get(".word-of-the-day-deadline").should("be.visible").should("have.class", "passed");

      // try typing something now; should not allow submitting
      cy.get(".word-of-the-day-input").type("wordoftheday");
      cy.get(".word-of-the-day-submit").should("be.disabled");

      // switch to future date; should be able to submit normally
      cy.get(".word-of-the-day-select").select(dates[0]);
      cy.get(".word-of-the-day-input").clear().type("password");
      cy.get(".word-of-the-day-submit").should("not.be.disabled").click();
    });

    cy.wait("@put-wotd");
    cy.wait("@get-attendances");

    // check attendance has updated
    cy.get("#attendance-table tbody tr").each(($row, idx) => {
      cy.wrap($row).find("td").first().invoke("text").should("eq", dates[idx]);
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

    // word of the day selection should no longer show submitted date
    cy.get("#word-of-the-day-card").within(() => {
      cy.contains(".word-of-the-day-title", /submit word of the day/i).should("be.visible");

      cy.get(".word-of-the-day-select").find("option").should("have.length", 1).invoke("text").should("eq", dates[1]);
    });
  });
});
