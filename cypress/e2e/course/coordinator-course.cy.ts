import { DateTime } from "luxon";

before(() => {
  // initialize the database and cache
  cy.initDB();
});

/**
 * Converts a time of the form hh:mm a/pm into a Date object
 */
const timeStringToDate = (time: string): DateTime => {
  return DateTime.fromFormat(time, "h:mm a");
};

/**
 * Check that the capacity of a section card is as expected
 */
const checkCapacity = (text: string, isFull = false) => {
  const groups = text.trim().match(/(\d+)\/(\d+)/);
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
  let prevTime: DateTime = null;
  cy.get('[title="Time"]').each($el => {
    const text = $el
      .text()
      .trim()
      // replace all weird spaces; see https://jkorpela.fi/chars/spaces.html
      .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ");
    // time of form [day] [start]-[end] [AM/PM]
    //   or of form [day] [start] [AM/PM]-[end] [AM/PM]
    const matches = text.match(/\w+, (\d\d?:\d\d(?: AM| PM)?)\s*–\s*(\d\d?:\d\d (?:A|P)M)/g);
    let sectionTime: DateTime = null;
    for (const substr of matches) {
      // get groups in this match
      const match = substr.match(/\w+, (\d\d?:\d\d(?: AM| PM)?)\s*–\s*(\d\d?:\d\d (?:A|P)M)/);
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
      expect(prevTime.toMillis()).to.be.lte(sectionTime.toMillis());
    }
    prevTime = sectionTime;
  });
};

describe("coordinator course view", () => {
  it("should display all section information when course is open", () => {
    cy.setupDB("course/coordinator-student-course", "coord_setup_open");
    cy.login();

    // visit the course section page
    cy.visit("/courses/1");

    // === buttons and course information ===

    // course title should be correct
    cy.get(".course-title").invoke("text").should("match", /cs61a/i);

    // should show M, Tu/W, Th buttons, all visible
    cy.get(".day-btn").should("have.length", 3).should("be.visible");
    cy.get(".day-btn.active")
      // should have only one active tab
      .should("have.length", 1)
      // should default to Monday sections
      .should("be.visible")
      .invoke("text")
      .should("match", /^M$/i);

    // === Monday section cards ===

    // should show sections with space (including those with waitlist room)
    cy.get(".section-card")
      // should have three cards (sections at enrolled capacity still show if waitlist has room)
      .should("have.length", 3)
      .each($el => {
        cy.wrap($el)
          .should("be.visible")
          .within(() => {
            // should have "Monday" somewhere in it
            cy.get('[title="Time"]')
              .invoke("text")
              .should("match", /Monday/i);
            // should show "manage" button
            cy.contains(".section-card-footer", /manage/i).should("be.visible");

            // should show enrollment count
            cy.get('[title="Current enrollment"]')
              .invoke("text")
              .should("match", /Enrolled:/);

            // should show waitlist count
            cy.get('[title="Current waitlist"]')
              .invoke("text")
              .should("match", /Waitlisted:/);
          });
      });

    // should show sections in order by start time
    checkCardOrder();

    // now show unavailable sections (toggle shouldn't change count since
    // sections at enrolled capacity still have waitlist room)
    cy.get("#show-unavailable-toggle").click();

    cy.get(".section-card")
      // should still have three cards (no fully-full sections on Monday)
      .should("have.length", 3)
      .each($el => {
        cy.wrap($el)
          .should("be.visible")
          // should have "Monday" somewhere in it
          .find('[title="Time"]')
          .invoke("text")
          .should("match", /Monday/i);
      });

    // no section should be fully full (waitlist has room)
    cy.get(".section-card.full").should("not.exist");

    // should show sections in order by start time
    checkCardOrder();

    cy.get("#show-unavailable-toggle").click(); // reset for next day

    // === Tuesday/Wednesday section cards ===
    cy.contains(".day-btn", /tu\/w/i).click().should("have.class", "active");

    // should show sections with space (including those with waitlist room)
    cy.get(".section-card")
      // should have two cards (section at enrolled capacity now shows with waitlist room)
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
            // should show "manage" button
            cy.contains(".primary-btn", /manage/i).should("be.visible");

            // should show enrollment count
            cy.get('[title="Current enrollment"]')
              .invoke("text")
              .should("match", /Enrolled:/);
          });
      });

    // now show unavailable sections
    cy.get("#show-unavailable-toggle").click();

    cy.get(".section-card")
      // should still have two cards (no fully-full Tu/W sections)
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

    // no section should be fully full (waitlist has room)
    cy.get(".section-card.full").should("not.exist");

    // should show sections in order by start time
    checkCardOrder();

    cy.get("#show-unavailable-toggle").click(); // reset for next day

    // === Thursday section cards ===
    cy.get(".day-btn").contains(/th/i).click().should("have.class", "active");

    // Thursday section is at enrolled capacity but has waitlist room,
    // so it should appear by default (not hidden)
    cy.get(".section-card")
      .should("have.length", 1)
      .should("be.visible")
      .within(() => {
        // should have "Thursday" somewhere in it
        cy.get('[title="Time"]')
          .invoke("text")
          .should("match", /Thursday/i);
        // should have no description
        cy.get(".section-card-description").should("not.exist");
        // should show enrollment and waitlist counts
        cy.get('[title="Current enrollment"]')
          .invoke("text")
          .should("match", /Enrolled:/);
        cy.get('[title="Current waitlist"]')
          .invoke("text")
          .should("match", /Waitlisted:/);
      });

    // should not be fully full (waitlist has room)
    cy.get(".section-card.full").should("not.exist");
  });

  context("when the course is closed", () => {
    // these tests are less comprehensive,
    // under the assumption that basically all of the layout should stay the same
    it("should display information with no priority enrollment", () => {
      cy.setupDB("course/coordinator-student-course", "coord_setup_closed");
      cy.login();
      cy.visit("/courses/1");

      // should display enrollment start time
      cy.get("#course-enrollment-open-status")
        .should("be.visible")
        // should not include anything about priority enrollment,
        // since the user has no priority enrollment time
        .invoke("text")
        .should("not.match", /priority/i);

      // should still be able to manage sections
      cy.get(".section-card .section-card-footer").each($el => {
        cy.wrap($el)
          .invoke("text")
          .should("match", /manage/i);
      });
    });

    it("should display information with priority enrollment", () => {
      cy.setupDB("course/coordinator-student-course", "coord_setup_closed_priority");
      cy.login();
      cy.visit("/courses/1");

      // should display enrollment start time
      cy.get("#course-enrollment-open-status")
        .should("be.visible")
        // should not include anything about priority enrollment,
        // since the user has no priority enrollment time
        .invoke("text")
        .should("match", /priority/i);

      // should still be able to manage sections
      cy.get(".section-card .section-card-footer").each($el => {
        cy.wrap($el)
          .invoke("text")
          .should("match", /manage/i);
      });
    });
  });
});
