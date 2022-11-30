before(() => {
  // initialize the database and cache
  cy.initDB();
});

/**
 * Converts a time of the form hh:mm a/pm into a Date object
 */
const timeStringToDate = (time: string): Date => {
  return new Date(Date.parse(`2020-01-01 ${time}`));
};

/**
 * Check that the capacity of a section card is as expected
 */
const checkCapacity = (text: string, isFull: boolean = false) => {
  const groups = text.trim().match(/^(\d+)\/(\d+)$/i);
  if (isFull) {
    expect(parseInt(groups[1]) / parseInt(groups[2])).to.be.eq(1);
  } else {
    expect(parseInt(groups[1]) / parseInt(groups[2])).to.be.lt(1);
  }
};

/**
 * Check that the cards are in chronological order
 */
const checkCardOrder = () => {
  let prevTime = null;
  cy.get('[title="Time"]').each($el => {
    const text = $el.text().trim();
    // time of form [day] [start]-[end] [AM/PM]
    //   or of form [day] [start] [AM/PM]-[end] [AM/PM]
    const matches = text.match(/\w+ (\d\d?:\d\d(?: AM| PM)?)-(\d\d?:\d\d (?:A|P)M)/g);
    let sectionTime = null;
    for (const substr of matches) {
      // get groups in this match
      const match = substr.match(/\w+ (\d\d?:\d\d(?: AM| PM)?)-(\d\d?:\d\d (?:A|P)M)/);
      let start = match[1];
      const end_ampm = match[2].match(/AM|PM/i)[0];
      if (start.match(/am|pm/i) === null) {
        // doesn't contain AM/PM, so take from the end time
        start += " " + end_ampm;
      }
      const startTimeObject = timeStringToDate(start);
      if (sectionTime === null || sectionTime > startTimeObject) {
        sectionTime = startTimeObject;
      }
    }

    if (prevTime !== null) {
      // should be chronological
      expect(prevTime).to.be.lte(sectionTime);
    }
    prevTime = sectionTime;
  });
};

describe("coordinator section", () => {
  beforeEach(() => {
    cy.setupDB("coordinator-course", "setup");
    cy.login();
  });

  describe("should display all section information", () => {
    beforeEach(() => {
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
      context("with default view", () => {
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

        it("should show sections in order by start time", () => {
          checkCardOrder();
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

        it("should show sections in order by start time", () => {
          checkCardOrder();
        });
      });
    });

    context("Tuesday/Wednesday section checks", () => {
      beforeEach(() => {
        cy.get(".day-btn").contains(/tu\/w/i).click().should("have.class", "active");
      });

      context("with default view", () => {
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

        it("first section should be full", () => {
          cy.get(".section-card:nth-child(1)")
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

        it("should show sections in order by start time", () => {
          checkCardOrder();
        });
      });
    });

    context("Thursday section checks", () => {
      beforeEach(() => {
        cy.get(".day-btn").contains(/th/i).click().should("have.class", "active");
      });

      context("with default view", () => {
        it("should show no sections by default", () => {
          cy.get(".section-card").should("not.exist");
          cy.get("#course-section-list-empty").should("be.visible");
        });
      });

      context("after toggling full sections", () => {
        it("should show one full section", () => {
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
});
