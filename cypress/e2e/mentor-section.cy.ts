before(() => {
  cy.initDB();
});

const STUDENT_LIST = [/A Student/i, /B Student/i, /C Student/i, /D Student/i];

/**
 * tests for accessing and viewing section details
 */
describe("section details accessibility", () => {
  beforeEach(() => {
    cy.setupDB("mentor-section", "setup_mentor_section");
    cy.login();
  });

  it("should be able to navigate to section details", () => {
    cy.visit("/");

    cy.contains(".course-card .relation-label", /mentor/i)
      .should("be.visible")
      .parent()
      .click();

    cy.location("pathname").should("eq", "/sections/1");

    cy.contains(".section-detail-header-title", /cs61a/i).should("be.visible");
    cy.contains(".relation-label", /mentor/i).should("be.visible");
  });

  it("should see section information", () => {
    cy.visit("/sections/1");

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
  });

  it("should see roster information", () => {
    cy.visit("/sections/1");

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
  context("visual checks", () => {
    beforeEach(() => {
      cy.setupDB("mentor-section", "setup_mentor_section");
      cy.login();
    });

    it("should be able to navigate to section attendances", () => {
      cy.visit("/sections/1");

      // go to attendances tab
      cy.contains("#section-detail-sidebar a", /attendance/i).click();

      cy.location("pathname").should("eq", "/sections/1/attendance");

      cy.contains(".section-detail-page-title", /attendance/i).should("be.visible");
    });

    it("should see attendance information", () => {
      cy.visit("/sections/1/attendance");

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
  });

  context("functional checks", () => {
    beforeEach(() => {
      cy.setupDB("mentor-section", "setup_mentor_section", { mutate: true });
      cy.login();
    });

    it("should be able to mark all students as present", () => {
      cy.visit("/sections/1/attendance");
      cy.intercept({ method: "GET", url: "/api/sections/1/attendance" }).as("section-attendance");
      cy.intercept({ method: "PUT", url: "/api/students/*/attendances" }).as("student-attendance");

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
      cy.visit("/sections/1/attendance");
      cy.intercept("/api/students/*/attendances").as("student-attendance");
      cy.intercept("/api/sections/1/attendance").as("section-attendance");

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

/**
 * tests for modifying students in the section
 */
describe("modifying students", () => {
  const _commonSetup = () => {
    cy.login();
    cy.visit("/sections/1");

    cy.intercept({ method: "PUT", url: "/api/sections/1/students" }).as("add-student");
    cy.intercept({ method: "GET", url: "/api/sections/1/students" }).as("section-students");
    cy.intercept({ method: "PATCH", url: "/api/students/*/drop" }).as("drop-student");
  };

  const setupWithMutate = () => {
    cy.setupDB("mentor-section", "setup_multiple_mentor_sections", { mutate: true });
    _commonSetup();
  };

  const setupFullSection = () => {
    cy.setupDB("mentor-section", "setup_full_section", { mutate: true });
    _commonSetup();
  };

  context("valid operations", () => {
    it("should allow adding new student to section", () => {
      setupWithMutate();

      cy.wait("@section-students");
      cy.get(".coordinator-email-modal-button").click();

      cy.get(".coordinator-add-student-modal").within(() => {
        // input new student email
        cy.get(".coordinator-email-input").type("testuser1@berkeley.edu");

        // submit
        cy.get(".coordinator-email-input-submit").click();
      });

      // wait for request to finish
      cy.wait("@add-student").its("response.statusCode").should("eq", 200);
      cy.wait("@section-students");

      // modal should be closed
      cy.get(".coordinator-add-student-modal").should("not.exist");

      // student should appear in the roster
      cy.contains("#students-table span.student-info", /test user 1/i).should("be.visible");

      // reload page
      cy.reload();
      cy.wait("@section-students");

      // student should still appear in the roster
      cy.contains("#students-table span.student-info", /test user 1/i).should("be.visible");
    });

    it("should allow adding new student associated with a new user", () => {
      setupWithMutate();

      cy.wait("@section-students");
      cy.get(".coordinator-email-modal-button").click();

      cy.get(".coordinator-add-student-modal").within(() => {
        // input new student email
        cy.get(".coordinator-email-input").type("newuser@berkeley.edu");

        // submit
        cy.get(".coordinator-email-input-submit").click();
      });

      // wait for request to finish
      cy.wait("@add-student").its("response.statusCode").should("eq", 200);
      cy.wait("@section-students");

      // modal should be closed
      cy.get(".coordinator-add-student-modal").should("not.exist");

      // student should appear in the roster
      cy.contains("#students-table span.student-info", /newuser@berkeley\.edu/i).should("be.visible");

      // reload page
      cy.reload();
      cy.wait("@section-students");

      // student should still appear in the roster
      cy.contains("#students-table span.student-info", /newuser@berkeley\.edu/i).should("be.visible");
    });

    it("should allow dropping existing student", () => {
      setupWithMutate();

      cy.wait("@section-students");

      // drop student
      cy.get("#students-table .student-dropper")
        .first()
        .parent() // get first table row
        .within(() => {
          cy.get(".student-info")
            .invoke("text")
            .should("match", /A Student/i);

          cy.get(".student-dropper").click();
        });

      // perform the drop
      cy.get(".studentDropper").within(() => {
        cy.get("input#drop").click();
        cy.get(".studentDropperSubmit").click();
      });

      cy.wait("@drop-student").its("response.statusCode").should("eq", 204);
      cy.wait("@section-students");

      // modal should disappear
      cy.get(".studentDropper").should("not.exist");
      // student should not appear in the list
      cy.contains("#students-table .student-info", /A Student/i).should("not.exist");
    });

    it("should do nothing if no emails are given", () => {
      // potential mutation if this fails
      setupWithMutate();

      cy.wait("@section-students");

      // expected list of students (in order)
      cy.get("#students-table span.student-info")
        .should("have.length", 4)
        .each(($text, idx) => {
          expect($text.text()).to.match(STUDENT_LIST[idx]);
        });

      cy.get(".coordinator-email-modal-button").click();

      cy.get(".coordinator-add-student-modal").within(() => {
        cy.get(".coordinator-email-input-item").should("have.length", 1).get("[title='Remove']").click();
        cy.get(".coordinator-email-input-submit").click();
      });

      cy.get(".coordinator-add-student-modal").should("not.exist");

      // should have the same list of students
      cy.get("#students-table span.student-info")
        .should("have.length", 4)
        .each(($text, idx) => {
          expect($text.text()).to.match(STUDENT_LIST[idx]);
        });
    });
  });
  context("invalid operations", () => {
    it("should retry when adding mentor for another section", () => {
      // possible to mutate if fails
      setupWithMutate();
      const USERNAME = "user1@berkeley.edu";

      cy.wait("@section-students");
      cy.get(".coordinator-email-modal-button").click();

      cy.get(".coordinator-add-student-modal")
        .within(() => {
          cy.get(".coordinator-email-input").type(USERNAME);
          cy.get(".coordinator-email-input-submit").click();

          // wait for request; should fail
          cy.wait("@add-student").its("response.statusCode").should("eq", 422);

          cy.contains(".coordinator-email-response-container", /section conflict/i)
            .within(() => {
              // should display section conflict
              cy.contains(".coordinator-email-response-status-conflict", /section conflict/i).should("be.visible");

              cy.contains(".coordinator-email-response-item", USERNAME)
                .within(() => {
                  // check text objects
                  cy.contains("span", USERNAME).should("be.visible");
                  cy.contains("div", /User is already a mentor for the course/i).should("be.visible");
                  cy.get("input[type='checkbox'][value='DROP']").should("have.length", 1).should("be.disabled");

                  // remove email
                  cy.get("span.inline-plus-sign").click().should("not.exist");
                })
                .should("not.exist"); // should disappear after click
            })
            .should("not.exist"); // should disappear after click

          cy.contains(".coordinator-email-input-submit", /retry/i).click();
          // no request, so no wait
        })
        .should("not.exist"); // should disappear after click

      // students should stay the same
      cy.get("#students-table span.student-info")
        .should("have.length", 4)
        .each(($text, idx) => {
          expect($text.text()).to.match(STUDENT_LIST[idx]);
        });
    });

    it("should retry when adding student in another section", () => {
      setupWithMutate();
      const USERNAME = "user2@berkeley.edu";

      cy.wait("@section-students");
      cy.get(".coordinator-email-modal-button").click();

      cy.get(".coordinator-add-student-modal")
        .within(() => {
          cy.get(".coordinator-email-input").type(USERNAME);
          cy.get(".coordinator-email-input-submit").click();

          // wait for request; should fail
          cy.wait("@add-student").its("response.statusCode").should("eq", 422);

          cy.contains(".coordinator-email-response-container", /section conflict/i).within(() => {
            // should display section conflict
            cy.contains(".coordinator-email-response-status-conflict", /section conflict/i).should("be.visible");

            cy.contains(".coordinator-email-response-item", USERNAME).within(() => {
              // check text objects
              cy.contains("span", USERNAME).should("be.visible");
              cy.contains("div", /conflict: user one/i)
                .should("be.visible")
                .find("a")
                .invoke("attr", "href")
                .should("eq", "/sections/2");

              // drop student from other section
              cy.get("input[type='checkbox'][value='DROP']").should("have.length", 1).should("not.be.disabled").click();
            });
          });

          cy.contains(".coordinator-email-input-submit", /retry/i).click();
          cy.wait("@add-student").its("response.statusCode").should("eq", 200);
        })
        .should("not.exist"); // should disappear after click

      cy.wait("@section-students");

      // one more student should appear
      cy.get("#students-table span.student-info")
        .should("have.length", 5)
        .each(($text, idx) => {
          if (idx == 4) {
            // should be at the end
            expect($text.text()).to.match(/User Two/i);
          } else {
            expect($text.text()).to.match(STUDENT_LIST[idx]);
          }
        });
    });

    it("should retry when adding banned student", () => {
      setupWithMutate();
      const USERNAME = "banned_student@berkeley.edu";

      cy.wait("@section-students");
      cy.get(".coordinator-email-modal-button").click();

      cy.get(".coordinator-add-student-modal")
        .within(() => {
          cy.get(".coordinator-email-input").type(USERNAME);
          cy.get(".coordinator-email-input-submit").click();

          // wait for request; should fail
          cy.wait("@add-student").its("response.statusCode").should("eq", 422);

          cy.contains(".coordinator-email-response-container", /student banned/i).within(() => {
            cy.contains(".coordinator-email-response-status-banned", /student banned/i).should("be.visible");

            cy.contains(".coordinator-email-response-item", USERNAME).within(() => {
              // get actual text object
              cy.contains("span", USERNAME).should("be.visible");
              // unban and enroll student
              cy.get("input[type='radio'][value='UNBAN_ENROLL']")
                .should("have.length", 1)
                .should("not.be.disabled")
                .click();
            });
          });

          cy.contains(".coordinator-email-input-submit", /retry/i).click();
          cy.wait("@add-student").its("response.statusCode").should("eq", 200);
        })
        .should("not.exist"); // should disappear after click

      cy.wait("@section-students");

      // one more student should appear
      const expected_list = [...STUDENT_LIST.slice(0, 2), /banned student/i, ...STUDENT_LIST.slice(2)];
      cy.get("#students-table span.student-info")
        .should("have.length", 5)
        .each(($text, idx) => {
          expect($text.text()).to.match(expected_list[idx]);
        });
    });

    it("should retry when section is at capacity", () => {
      setupFullSection();

      cy.wait("@section-students");
      cy.get(".coordinator-email-modal-button").click();

      cy.get(".coordinator-add-student-modal")
        .within(() => {
          cy.get(".coordinator-email-input").type("testuser1@berkeley.edu");
          cy.get(".coordinator-email-input-submit").click();

          // wait for request; should fail
          cy.wait("@add-student").its("response.statusCode").should("eq", 422);

          cy.contains(".coordinator-email-response-capacity-container", /section capacity exceeded/i).within(() => {
            // should display capacity exceeded
            cy.contains(".coordinator-email-response-capacity", /section capacity exceeded/i).should("be.visible");

            cy.get("input[type='radio'][value='EXPAND']").click();
          });

          cy.contains(".coordinator-email-input-submit", /retry/i).click();
          cy.wait("@add-student").its("response.statusCode").should("eq", 200);
        })
        .should("not.exist");

      cy.wait("@section-students");

      const expected_list = [...STUDENT_LIST, /E Student/i, /Test User 1/i];
      cy.get("#students-table span.student-info")
        .should("have.length", 6)
        .each(($text, idx) => {
          expect($text.text()).to.match(expected_list[idx]);
        });

      // meta card should have new capacity
      cy.get(".section-detail-info-card.meta")
        .should("be.visible")
        .find(".section-detail-info-card-contents")
        .within(() => {
          cy.contains(".meta-field", /capacity/i)
            .parent()
            .invoke("text")
            .should("match", /6$/i);
        });
    });

    it("should retry with multiple kinds of errors", () => {
      setupWithMutate();

      cy.wait("@section-students");
      cy.get(".coordinator-email-modal-button").click();

      cy.get(".coordinator-add-student-modal")
        .within(() => {
          // valid user
          cy.get(".coordinator-email-input").last().type("testuser1@berkeley.edu");
          cy.contains(".coordinator-email-input-add", /add email/i)
            .focus()
            .click();
          // mentor for another section
          cy.get(".coordinator-email-input").last().type("user1@berkeley.edu");
          cy.contains(".coordinator-email-input-add", /add email/i).click();
          // conflicting section
          cy.get(".coordinator-email-input").last().type("user2@berkeley.edu");
          cy.contains(".coordinator-email-input-add", /add email/i).click();
          // banned user
          cy.get(".coordinator-email-input").last().type("banned_student@berkeley.edu");

          // submit and wait for request; should fail
          cy.get(".coordinator-email-input-submit").click();
          cy.wait("@add-student").its("response.statusCode").should("eq", 422);

          cy.contains(".coordinator-email-response-container", /section conflict/i).within(() => {
            // should display section conflict
            cy.contains(".coordinator-email-response-status-conflict", /section conflict/i).should("be.visible");

            // conflicting section
            cy.contains(".coordinator-email-response-item", "user1@berkeley.edu").within(() => {
              // check text objects
              cy.contains("span", "user1@berkeley.edu").should("be.visible");
              cy.contains("div", /User is already a mentor for the course/i).should("be.visible");
              cy.get("input[type='checkbox'][value='DROP']").should("have.length", 1).should("be.disabled");

              // remove email
              cy.get("span.inline-plus-sign").click().should("not.exist");
            });

            // mentor for another section
            cy.contains(".coordinator-email-response-item", "user2@berkeley.edu").within(() => {
              // get actual text object
              cy.contains("span", "user2@berkeley.edu").should("be.visible");
              // check conflicting section link
              cy.contains("div", /conflict: user one/i)
                .should("be.visible")
                .find("a")
                .invoke("attr", "href")
                .should("eq", "/sections/2");

              // drop student from other section
              cy.get("input[type='checkbox'][value='DROP']").should("have.length", 1).should("not.be.disabled").click();
            });
          });

          cy.contains(".coordinator-email-response-container", /student banned/i).within(() => {
            // should display section conflict
            cy.contains(".coordinator-email-response-status-banned", /student banned/i).should("be.visible");

            cy.contains(".coordinator-email-response-item", "banned_student@berkeley.edu").within(() => {
              // get actual text object
              cy.contains("span", "banned_student@berkeley.edu").should("be.visible");
              // unban and enroll student
              cy.get("input[type='radio'][value='UNBAN_ENROLL']")
                .should("have.length", 1)
                .should("not.be.disabled")
                .click();
            });
          });

          // valid user
          cy.contains(".coordinator-email-response-container", /ok/i).within(() => {
            cy.contains(".coordinator-email-response-status-ok", /ok/i).should("be.visible");
            // not visible but should have visible text
            cy.contains(".coordinator-email-response-item span", "testuser1@berkeley.edu").should("exist");
          });

          cy.contains(".coordinator-email-response-capacity-container", /section capacity exceeded/i).within(() => {
            // should display capacity exceeded
            cy.contains(".coordinator-email-response-capacity", /section capacity exceeded/i).should("be.visible");

            cy.get("input[type='radio'][value='EXPAND']").click();
          });

          // submit form
          cy.get(".coordinator-email-input-submit").click();
          cy.wait("@add-student");
        })
        .should("not.exist");

      cy.wait("@section-students");

      // check student list
      const expected_list = [
        /A Student/i,
        /B Student/i,
        /banned student/i,
        /C Student/i,
        /D Student/i,
        /Test User 1/i,
        /User Two/i
      ];
      cy.get("#students-table span.student-info")
        .should("have.length", 7)
        .each(($text, idx) => {
          expect($text.text()).to.match(expected_list[idx]);
        });
    });
  });
});
