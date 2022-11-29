describe("coordinator section", () => {
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
    }
  ];

  /**
   * Set up network stubs.
   */
  const networkStubs = () => {
    cy.intercept({ method: "GET", url: "/api/profiles/" }, []).as("getProfiles");
    cy.intercept({ method: "GET", url: "/api/matcher/active/" }, []).as("getMatcherActive");
    cy.intercept({ method: "GET", url: "/api/courses/" }, COURSES_DATA).as("getCourses");
    cy.intercept({ method: "GET", url: "/api/courses/*/sections/" }, { fixture: "courses__sections" }).as("getSection");
    cy.intercept(
      { method: "GET", url: "/api/userinfo/" },
      {
        id: 1,
        email: "demo_user@berkeley.edu",
        firstName: "Demo",
        lastName: "User",
        priorityEnrollment: null
      }
    ).as("getPriorityEnrollment");
  };

  const checkCapacity = (text: string, isFull: boolean = false) => {
    const groups = text.trim().match(/^(\d+)\/(\d+)$/i);
    if (isFull) {
      expect(parseInt(groups[1]) / parseInt(groups[2])).to.be.eq(1);
    } else {
      expect(parseInt(groups[1]) / parseInt(groups[2])).to.be.lt(1);
    }
  };

  beforeEach(() => {
    cy.clock(NOW, ["Date"]); // set up clock
    cy.login();
  });

  describe("should display all section information", () => {
    beforeEach(() => {
      // network stubs
      networkStubs();

      // visit the course section page
      cy.visit("/courses/1");
    });

    it("should show correct course information", () => {
      // course title should be correct
      cy.get(".course-title").invoke("text").should("match", /cs61a/i);
    });

    it("should show all buttons, with Monday as default", () => {
      // should show M, Tu/W, Th buttons, all visible
      cy.get(".day-btn").should("have.length", 3).should("be.visible");
      cy.get(".day-btn.active")
        // should have only one active tab
        .should("have.length", 1)
        // should default to Monday sections
        .should("exist")
        .should("be.visible")
        .invoke("text")
        .should("match", /^M$/i);
    });

    context("Monday section checks", () => {
      it("should only show sections with space", () => {
        cy.get(".section-card")
          // should have two cards
          .should("have.length", 2)
          .each($el => {
            cy.wrap($el)
              .should("be.visible")
              .within(() => {
                // should have "Monday" somewhere in it
                cy.get('[title="Time"]')
                  .invoke("text")
                  .should("match", /Monday/i);
                // should show descriptions
                cy.get(".section-card-description").should("be.visible");
                // should show "manage" button
                cy.get(".csm-btn")
                  .contains(/manage/i)
                  .should("be.visible");

                // should not be full
                cy.get('[title="Current enrollment"]')
                  .invoke("text")
                  .invoke("trim")
                  .should("match", /^\d+\/\d+$/i)
                  .then(checkCapacity);
              });
          });
      });

      context("after toggling full sections", () => {
        beforeEach(() => {
          // now show unavailable sections
          cy.get("#show-unavailable-toggle").click();
        });

        it("should show all sections", () => {
          cy.get(".section-card")
            // should now have three cards
            .should("have.length", 3)
            .each($el => {
              cy.wrap($el)
                .should("be.visible")
                .within(() => {
                  // should have "Monday" somewhere in it
                  cy.get('[title="Time"]')
                    .invoke("text")
                    .should("match", /Monday/i);
                });
            });
        });

        it("second section should be full", () => {
          cy.get(".section-card:nth-child(2)")
            .should("have.class", "full")
            .within(() => {
              // should be full
              cy.get('[title="Current enrollment"]')
                .invoke("text")
                .invoke("trim")
                .should("match", /^\d+\/\d+$/i)
                .then(text => checkCapacity(text, true));
              // should not have a description
              cy.get(".section-card-description").should("not.exist");
            });
        });
      });
    });

    context("Tuesday/Wednesday section checks", () => {
      beforeEach(() => {
        cy.get(".day-btn").contains(/tu\/w/i).click().should("have.class", "active");
      });

      it("should only show sections with space", () => {
        cy.get(".section-card")
          // should have one card
          .should("have.length", 1)
          .should("be.visible")
          .within(() => {
            // should have both "Tuesday" and "Wednesday" somewhere in it
            cy.get('[title="Time"]')
              .invoke("text")
              .then(text => {
                expect(text).to.match(/Tuesday/i);
                expect(text).to.match(/Wednesday/i);
              });
            // should show descriptions (all for Tu/W are online)
            cy.get(".section-card-description")
              .should("be.visible")
              .invoke("text")
              .should("match", /online/i);
            // should show "manage" button
            cy.get(".csm-btn")
              .contains(/manage/i)
              .should("be.visible");

            // should not be full
            cy.get('[title="Current enrollment"]')
              .invoke("text")
              .invoke("trim")
              .should("match", /^\d+\/\d+$/i)
              .then(checkCapacity);
          });
      });

      context("after toggling full sections", () => {
        beforeEach(() => {
          // now show unavailable sections
          cy.get("#show-unavailable-toggle").click();
        });

        it("should show all sections", () => {
          cy.get(".section-card")
            // should now have two cards
            .should("have.length", 2)
            .each($el => {
              cy.wrap($el)
                .should("be.visible")
                .within(() => {
                  // should have both "Tuesday" and "Wednesday" somewhere in it
                  cy.get('[title="Time"]')
                    .invoke("text")
                    .then(text => {
                      expect(text).to.match(/Tuesday/i);
                      expect(text).to.match(/Wednesday/i);
                    });
                  // should show descriptions (all for Tu/W are online)
                  cy.get(".section-card-description")
                    .should("be.visible")
                    .invoke("text")
                    .should("match", /online/i);
                });
            });
        });

        it("second section should be full", () => {
          cy.get(".section-card:nth-child(2)")
            .should("have.class", "full")
            .within(() => {
              // should be full
              cy.get('[title="Current enrollment"]')
                .invoke("text")
                .invoke("trim")
                .should("match", /^\d+\/\d+$/i)
                .then(text => checkCapacity(text, true));
            });
        });
      });
    });

    context("Thursday section checks", () => {
      beforeEach(() => {
        cy.get(".day-btn").contains(/th/i).click().should("have.class", "active");
      });

      it("should show no sections by default", () => {
        cy.get(".section-card").should("not.exist");
        cy.get("#course-section-list-empty").should("be.visible");
      });

      it("should show one full section after toggling full sections", () => {
        // now show unavailable sections
        cy.get("#show-unavailable-toggle").click();

        cy.get("#course-section-list-empty").should("not.exist");
        cy.get(".section-card")
          .should("have.length", 1)
          .should("be.visible")
          .should("have.class", "full")
          .within(() => {
            // should have "Thursday" somewhere in it
            cy.get('[title="Time"]')
              .invoke("text")
              .should("match", /Thursday/i);
            // should have no description
            cy.get(".section-card-description").should("not.exist");
            // should be full
            cy.get('[title="Current enrollment"]')
              .invoke("text")
              .invoke("trim")
              .should("match", /^\d+\/\d+$/i)
              .then(text => checkCapacity(text, true));
          });
      });
    });
  });
});
