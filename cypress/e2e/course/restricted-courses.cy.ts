before(() => {
  cy.initDB();
});

describe("unwhitelisted courses", () => {
  it("should not be able to see any restricted courses if not whitelisted", () => {
    cy.setupDB("course/restricted-courses", "setup_unrelated_section");

    cy.intercept("/api/courses").as("get-courses");
    cy.login();

    cy.visit("/");
    cy.wait("@get-courses");

    // at home page, should not see any courses
    cy.get(".course-card").should("not.exist");

    // view courses
    cy.contains(".csm-btn", /add course/i).click();
    cy.contains(".page-title", /which course/i).should("be.visible");

    // at course menu, should not see any courses
    cy.contains(".csm-btn", /cs61a/i).should("not.exist");

    // try to directly go to course page
    cy.visit("/courses/1/sections");
    cy.wait("@get-courses");

    // course should not be found
    cy.contains("main", /course not found/i).should("be.visible");
  });

  it("should still show unrestricted courses", () => {
    cy.setupDB("course/restricted-courses", "setup_unrelated_section_with_unrestricted", { mutate: true });

    cy.intercept("/api/courses").as("get-courses");
    cy.login();

    cy.visit("/");
    cy.wait("@get-courses");

    // at home page, should not see any courses
    cy.get(".course-card").should("not.exist");

    // view courses
    cy.contains(".csm-btn", /add course/i).click();
    cy.contains(".page-title", /which course/i).should("be.visible");

    // cs70 is unrestricted, should be visible
    cy.contains(".csm-btn", /cs70/i).should("be.visible").click();

    // should be able to view cs70 sections
    cy.location("pathname").should("eq", "/courses/2");
    cy.get(".section-card").should("have.length", 1).should("be.visible");

    // now try enroll in the section
    cy.contains(".section-card .section-card-footer", /enroll/i).click();
    cy.contains(".modal-contents", /successfully enrolled/i).should("be.visible");
    cy.contains(".modal-contents .modal-btn", /ok/i).click();

    cy.location("pathname").should("eq", "/");

    cy.get(".course-card").should("have.length", 1);
    cy.contains(".course-card .course-card-name", /cs70/i).should("be.visible");
    cy.contains(".course-card .relation-label", /student/i).should("be.visible");
  });
});

describe("whitelisted courses", () => {
  it("should see and enroll in whitelisted courses and sections", () => {
    cy.setupDB("course/restricted-courses", "setup_whitelisted_section", { mutate: true });
    cy.login();

    cy.intercept("/api/courses").as("get-courses");
    cy.intercept("/api/userinfo").as("get-userinfo");

    cy.visit("/");
    cy.wait("@get-courses");

    // at home page, should not see any courses
    cy.get(".course-card").should("not.exist");

    // view courses
    cy.contains(".csm-btn", /add course/i).click();
    cy.wait("@get-userinfo");
    cy.contains(".page-title", /which course/i).should("be.visible");

    // should have two buttons at the top
    cy.contains(".course-menu-sidebar-tab.active", /restricted/i).should("be.visible");
    cy.contains(".course-menu-sidebar-tab:not(.active)", /unrestricted/i).should("be.visible");

    // should show cs61a
    cy.contains(".csm-btn", /cs61a/i).should("be.visible");

    // view unrestricted courses; should show nothing
    cy.contains(".course-menu-sidebar-tab", /unrestricted/i)
      .click()
      .should("have.class", "active");
    cy.contains(".csm-btn", /cs61a/i).should("not.exist");

    // go to cs61a sections
    cy.contains(".course-menu-sidebar-tab", /restricted/i)
      .click()
      .should("have.class", "active");
    cy.contains(".csm-btn", /cs61a/i).click();
    cy.get(".section-card").should("have.length", 1).should("be.visible");

    // now try to enroll
    cy.contains(".section-card .section-card-footer", /enroll/i).click();
    cy.contains(".modal-contents", /successfully enrolled/i).should("be.visible");
    cy.contains(".modal-contents .modal-btn", /ok/i).click();

    cy.location("pathname").should("eq", "/");

    // should see cs61a course card
    cy.get(".course-card").should("have.length", 1);
    cy.contains(".course-card .course-card-name", /cs61a/i).should("be.visible");
    cy.contains(".course-card .relation-label", /student/i).should("be.visible");
  });

  it("should see whitelisted courses among unrestricted courses", () => {
    cy.setupDB("course/restricted-courses", "setup_whitelisted_section_with_unrestricted", { mutate: true });
    cy.login();

    cy.intercept("/api/courses").as("get-courses");
    cy.intercept("/api/userinfo").as("get-userinfo");

    cy.visit("/");
    cy.wait("@get-courses");

    // at home page, should not see any courses
    cy.get(".course-card").should("not.exist");

    // view courses
    cy.contains(".csm-btn", /add course/i).click();
    cy.wait("@get-userinfo");
    cy.contains(".page-title", /which course/i).should("be.visible");

    // should have two buttons at the top
    cy.contains(".course-menu-sidebar-tab.active", /restricted/i).should("be.visible");
    cy.contains(".course-menu-sidebar-tab:not(.active)", /unrestricted/i).should("be.visible");

    // should show cs61a, but not cs70
    cy.contains(".csm-btn", /cs61a/i).should("be.visible");
    cy.contains(".csm-btn", /cs70/i).should("not.exist");

    // view unrestricted courses; should show cs70, but not cs61a
    cy.contains(".course-menu-sidebar-tab", /unrestricted/i)
      .click()
      .should("have.class", "active");
    cy.contains(".csm-btn", /cs61a/i).should("not.exist");
    cy.contains(".csm-btn", /cs70/i).should("be.visible");

    // go to cs61a sections
    cy.contains(".course-menu-sidebar-tab", /restricted/i)
      .click()
      .should("have.class", "active");
    cy.contains(".csm-btn", /cs61a/i).click();
    cy.get(".section-card").should("have.length", 1).should("be.visible");

    // now try to enroll
    cy.contains(".section-card .section-card-footer", /enroll/i).click();
    cy.contains(".modal-contents", /successfully enrolled/i).should("be.visible");
    cy.contains(".modal-contents .modal-btn", /ok/i).click();

    cy.location("pathname").should("eq", "/");

    // should see cs61a course card
    cy.get(".course-card").should("have.length", 1);
    cy.contains(".course-card .course-card-name", /cs61a/i).should("be.visible");
    cy.contains(".course-card .relation-label", /student/i).should("be.visible");

    // should also be able to enroll in cs70 sections

    cy.contains(".csm-btn", /add course/i).click();
    cy.contains(".page-title", /which course/i).should("be.visible");
    // go to unrestricted
    cy.contains(".course-menu-sidebar-tab", /unrestricted/i).click();
    // go to c70 sections
    cy.contains(".csm-btn", /cs70/i).click();
    cy.get(".section-card").should("have.length", 1).should("be.visible");

    // now try to enroll
    cy.contains(".section-card .section-card-footer", /enroll/i).click();
    cy.contains(".modal-contents", /successfully enrolled/i).should("be.visible");
    cy.contains(".modal-contents .modal-btn", /ok/i).click();

    cy.location("pathname").should("eq", "/");

    cy.get(".course-card").should("have.length", 2);
    // should see cs61a course card
    cy.contains(".course-card", /cs61a/i).within(() => {
      cy.contains(".course-card-name", /cs61a/i).should("be.visible");
      cy.contains(".relation-label", /student/i).should("be.visible");
    });
    // should see cs70 course card
    cy.contains(".course-card", /cs70/i).within(() => {
      cy.contains(".course-card-name", /cs70/i).should("be.visible");
      cy.contains(".relation-label", /student/i).should("be.visible");
    });
  });

  it("should be unable to enroll in restricted course before enrollment date", () => {
    cy.setupDB("course/restricted-courses", "setup_whitelisted_section_before_enrollment", { mutate: true });
    cy.login();

    cy.intercept("/api/courses").as("get-courses");
    cy.intercept("/api/profiles").as("get-profiles");

    cy.visit("/");
    cy.wait("@get-profiles");
    cy.wait("@get-courses");

    // at home page, should not see any courses
    cy.get(".course-card").should("not.exist");

    // view courses
    cy.contains(".csm-btn", /add course/i).click();
    cy.contains(".page-title", /which course/i).should("be.visible");

    // should have two buttons at the top
    cy.contains(".course-menu-sidebar-tab.active", /restricted/i).should("be.visible");
    cy.contains(".course-menu-sidebar-tab:not(.active)", /unrestricted/i).should("be.visible");

    // should show cs61a, but not cs70
    cy.contains(".csm-btn", /cs61a/i).should("be.visible");
    cy.contains(".csm-btn", /cs70/i).should("not.exist");
    // should show enrollment time for cs61a
    cy.contains(".enrollment-container .enrollment-course", /cs61a/i).should("be.visible");

    // view unrestricted courses; should show cs70, but not cs61a
    cy.contains(".course-menu-sidebar-tab", /unrestricted/i)
      .click()
      .should("have.class", "active");
    cy.contains(".csm-btn", /cs61a/i).should("not.exist");
    cy.contains(".csm-btn", /cs70/i).should("be.visible");
    // should not show any enrollment times
    cy.get(".enrollment-container").should("not.exist");

    // go to cs61a sections
    cy.contains(".course-menu-sidebar-tab", /restricted/i)
      .click()
      .should("have.class", "active");
    cy.contains(".csm-btn", /cs61a/i).click();
    cy.get(".section-card").should("have.length", 1).should("be.visible");

    // should display enrollment date
    cy.get("#course-enrollment-open-status")
      .should("be.visible")
      .invoke("text")
      .should("match", /^enrollment opens/i);

    // now try to enroll; taken from student-course.cy.ts
    // shouldn't be able to click on enroll
    cy.get(".section-card")
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

    // go back to home page
    cy.visit("/");

    // wait for all profiles to load
    cy.wait("@get-profiles");
    cy.wait("@get-courses");

    // should not see any cards
    cy.get(".course-card").should("not.exist");
  });
});
