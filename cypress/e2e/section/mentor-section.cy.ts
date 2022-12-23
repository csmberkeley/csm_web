before(() => {
  cy.initDB();
});

/**
 * tests for accessing and viewing section details
 */
describe("section details accessibility", () => {
  it("should be able to navigate to and view section details", () => {
    cy.setupDB("section/mentor-section", "setup_mentor_section");
    cy.login();
    cy.visit("/");

    cy.contains(".course-card .relation-label", /mentor/i)
      .should("be.visible")
      .parent()
      .click();

    cy.location("pathname").should("eq", "/sections/1");

    cy.contains(".section-detail-header-title", /cs61a/i).should("be.visible");
    cy.contains(".relation-label", /mentor/i).should("be.visible");

    // title
    cy.contains(".section-detail-header-title", /cs61a/i).should("be.visible");
    cy.contains(".relation-label", /mentor/i).should("be.visible");

    // students
    cy.get(".section-detail-info-card.students")
      .should("be.visible")
      .find(".section-detail-info-card-contents")
      .should("be.visible")
      // 4 students enrolled
      .find(".student-info")
      .should("have.length", 4);

    // time and location cards
    cy.get(".section-detail-info-card.time-and-location-1").should("be.visible");
    cy.get(".section-detail-info-card.time-and-location-2").should("be.visible");

    // meta card
    cy.get(".section-detail-info-card.meta")
      .should("be.visible")
      .find(".section-detail-info-card-contents")
      .within(() => {
        cy.contains(".meta-field", /capacity/i)
          .parent()
          .invoke("text")
          .should("match", /5$/i);
        cy.contains(".meta-field", /description/i)
          .parent()
          .invoke("text")
          .should("match", /test section$/i);
      });

    // go to roster tab
    cy.contains("#section-detail-sidebar a", /roster/i).click();
    cy.location("pathname").should("eq", "/sections/1/roster");

    cy.contains(".section-detail-page-title", /roster/i).should("be.visible");

    const expectedTable = [
      [/A Student/i, /A_student@berkeley.edu/i],
      [/B Student/i, /B_student@berkeley.edu/i],
      [/C Student/i, /C_student@berkeley.edu/i],
      [/D Student/i, /D_student@berkeley.edu/i]
    ];
    cy.get("table.standalone-table tbody tr")
      .should("have.length", 4)
      .each(($row, rowIdx) => {
        cy.wrap($row)
          .find("td")
          .should("have.length", 2)
          .each(($cell, cellIdx) => {
            expect($cell.text()).to.match(expectedTable[rowIdx][cellIdx]);
          });
      });
  });
});

/**
 * tests for manipulating attendances
 */
describe("attendances", () => {
  it("should be able to navigate to and view section attendances", () => {
    cy.setupDB("section/mentor-section", "setup_mentor_section");
    cy.login();
    cy.visit("/sections/1");

    // go to attendances tab
    cy.contains("#section-detail-sidebar a", /attendance/i).click();

    cy.location("pathname").should("eq", "/sections/1/attendance");

    cy.contains(".section-detail-page-title", /attendance/i).should("be.visible");

    // date tabs
    cy.get("#attendance-date-tabs-container")
      .children()
      .should("have.length", 2)
      // click second (inactive) tab
      .last()
      .should("not.have.class", "active")
      .click()
      .should("have.class", "active");

    // attendances in the second tab should all be present
    cy.get("#mentor-attendance-table select")
      .should("have.length", 4)
      .each($select => {
        expect($select.val()).to.be.eq("PR");
      });
  });

  context("functional checks", () => {
    beforeEach(() => {
      cy.setupDB("section/mentor-section", "setup_mentor_section", { mutate: true });
      cy.login();
    });

    it("should be able to mark all students as present", () => {
      cy.intercept({ method: "GET", url: "/api/sections/1/attendance" }).as("section-attendance");
      cy.intercept({ method: "PUT", url: "/api/students/*/attendances" }).as("student-attendance");
      cy.visit("/sections/1/attendance");

      // all attendances should start blank
      cy.get("#mentor-attendance-table select")
        .should("have.length", 4)
        .each($select => {
          expect($select.val()).to.be.null;
        });

      cy.get(".mark-all-present-btn").click();

      // all attendances should be marked as present
      cy.get("#mentor-attendance-table select")
        .should("have.length", 4)
        .each($select => {
          expect($select.val()).to.be.eq("PR");
        });

      // save attendance
      cy.get(".save-attendance-btn").click();
      cy.wait(["@student-attendance", "@student-attendance", "@student-attendance", "@student-attendance"]);

      // reload
      cy.reload();
      cy.wait("@section-attendance");

      // all attendances should still be marked as present
      cy.get("#mentor-attendance-table select")
        .should("have.length", 4)
        .each($select => {
          expect($select.val()).to.be.eq("PR");
        });
    });

    it("should be able to mark a single student as absent", () => {
      cy.intercept("/api/students/*/attendances").as("student-attendance");
      cy.intercept("/api/sections/1/attendance").as("section-attendance");
      cy.visit("/sections/1/attendance");

      // all attendances should start blank
      cy.get("#mentor-attendance-table select")
        .should("have.length", 4)
        .each($select => {
          expect($select.val()).to.be.null;
        });

      cy.get("#mentor-attendance-table select").first().select("EX");

      // first attendnace should be excused, rest should be blank
      cy.get("#mentor-attendance-table select").each(($select, idx) => {
        if (idx === 0) {
          expect($select.val()).to.be.eq("EX");
        } else {
          expect($select.val()).to.be.null;
        }
      });

      // save and wait for at least one request
      cy.get(".save-attendance-btn").click();
      cy.wait("@student-attendance");

      // reload
      cy.reload();
      cy.wait("@section-attendance");

      // first attendance should be excused, rest should be blank
      cy.get("#mentor-attendance-table select").each(($select, idx) => {
        if (idx === 0) {
          expect($select.val()).to.be.eq("EX");
        } else {
          expect($select.val()).to.be.null;
        }
      });
    });
  });
});

describe("word of the day", () => {
  const WORD_OF_THE_DAY = "wordoftheday";

  beforeEach(() => {
    cy.setupDB("section/mentor-section", "setup_mentor_section", { mutate: true });

    cy.intercept({ method: "GET", url: "/api/sections/1/wotd" }).as("get-wotd");
    cy.intercept({ method: "PUT", url: "/api/sections/1/wotd" }).as("put-wotd");

    cy.login();
    cy.visit("/sections/1/attendance");
  });

  it("should set word of the day", () => {
    cy.wait("@get-wotd");

    cy.get("#word-of-the-day-container").within(() => {
      cy.contains(".word-of-the-day-title", /word of the day/i).should("be.visible");
      cy.contains(".word-of-the-day-status", /unselected/i).should("be.visible");

      // ensure no word is selected currently
      cy.get(".word-of-the-day-input").invoke("val").should("be.empty");
      cy.get(".word-of-the-day-submit").should("be.disabled");

      // input a custom word of the day
      cy.get(".word-of-the-day-input").type(WORD_OF_THE_DAY);
      cy.get(".word-of-the-day-submit").click();

      // wait for submission to process
      cy.wait("@put-wotd");

      // input should update
      cy.wait("@get-wotd");
      cy.get(".word-of-the-day-input").invoke("val").should("eq", WORD_OF_THE_DAY);
      cy.get(".word-of-the-day-submit").should("be.disabled"); // disabled because unchanged
    });

    // reload the page and ensure the submission is still there
    cy.reload();
    cy.wait("@get-wotd");

    cy.get("#word-of-the-day-container").within(() => {
      cy.contains(".word-of-the-day-title", /word of the day/i).should("be.visible");
      cy.contains(".word-of-the-day-status", /selected/i).should("be.visible");

      // ensure word is retrieved correctly
      cy.get(".word-of-the-day-input").invoke("val").should("eq", WORD_OF_THE_DAY);
      cy.get(".word-of-the-day-submit").should("be.disabled"); // disabled because unchanged

      // change to a random word of the day
      cy.get(".word-of-the-day-random").click();
      cy.get(".word-of-the-day-input")
        .invoke("val")
        .then((value: string) => {
          expect(value).to.not.be.eq(WORD_OF_THE_DAY);
          cy.wrap(value).as("newWord");
        });
      cy.get(".word-of-the-day-submit").click();

      // wait for submission to process
      cy.wait("@put-wotd");

      // input should update
      cy.wait("@get-wotd");
      cy.get("@newWord").then(newWord => {
        cy.get(".word-of-the-day-input").invoke("val").should("eq", newWord);
      });
      cy.get(".word-of-the-day-submit").should("be.disabled"); // disabled because unchanged
    });

    // reload the page and ensure the submission is still there
    cy.reload();
    cy.wait("@get-wotd");

    cy.get("#word-of-the-day-container").within(() => {
      cy.contains(".word-of-the-day-title", /word of the day/i).should("be.visible");
      cy.contains(".word-of-the-day-status", /selected/i).should("be.visible");

      // ensure word is retrieved correctly
      cy.get("@newWord").then(newWord => {
        cy.get(".word-of-the-day-input").invoke("val").should("eq", newWord);
      });
      cy.get(".word-of-the-day-submit").should("be.disabled"); // disabled because unchanged
    });

    // go to next day and should be unselected
    cy.get("#attendance-date-tabs-container > :not(.active)")
      .should("have.length", 1)
      .click()
      .should("have.class", "active");

    cy.get("#word-of-the-day-container").within(() => {
      cy.contains(".word-of-the-day-title", /word of the day/i).should("be.visible");
      cy.contains(".word-of-the-day-status", /unselected/i).should("be.visible");

      // ensure no word is selected currently
      cy.get(".word-of-the-day-input").invoke("val").should("be.empty");
      cy.get(".word-of-the-day-submit").should("be.disabled");
    });

    // switch back and it should be selected again
    cy.get("#attendance-date-tabs-container > :not(.active)")
      .should("have.length", 1)
      .click()
      .should("have.class", "active");

    cy.get("#word-of-the-day-container").within(() => {
      cy.contains(".word-of-the-day-title", /word of the day/i).should("be.visible");
      cy.contains(".word-of-the-day-status", /selected/i).should("be.visible");

      // ensure word is retrieved correctly
      cy.get("@newWord").then(newWord => {
        cy.get(".word-of-the-day-input").invoke("val").should("eq", newWord);
      });
      cy.get(".word-of-the-day-submit").should("be.disabled"); // disabled because unchanged
    });
  });
});
