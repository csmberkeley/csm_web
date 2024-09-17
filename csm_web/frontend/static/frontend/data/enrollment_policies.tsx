/*
--SECTIONS OBJECT DOC--

Format:
  section
  |    title
  |    body
  |    |  enumerated HTML content elements

  anchor tag (object)
  |   text
  |   link

Naming schema for HTML content elements:
For a series of elements in the body, each tag type is enumerated as follows
-Example:
  <p> ..1.. </p>
  <p> ..2.. </p>
  <a> ..3.. </a>

  Turns into...

  body: {
    p1: "..1..",
    p2: "..2..",
    a1: "..3.."
  }

In order to accommodate in-element modifications (bolding, linking, etc),
each element with inline mods is split up into respective parts
-Example:
  <p> The quick brown <b>fox</b> jumps...</p>

  Turns into...

  body: {
    p1_1: "The quick brown ",
    p1_b: "fox",
    p1_2: " jumps..."
  }

  This is then encoded into the HTML through the JS injection with React.
*/

export const SECTIONS = {
  introduction: {
    title: "Introduction",
    body: {
      p1_a: {
        text: "Computer Science Mentors ",
        link: "https://csmentors.berkeley.edu/"
      },
      p1:
        "is a student organization with the goal of creating a community feeling among the lower-division " +
        "CS courses (CS 61A, CS 61B, CS 61C, CS 70, CS 88 (now DATA C88C), EECS 16A, and EECS 16B). " +
        "We offer small (4 to 7 students), 1 or 1.5 hour long sections each led by a mentor that you regularly " +
        "attend to review the past week’s material. Most sections will be in-person, with some being online. " +
        "You should sign up for a section if you’d like to work with others and receive extra practice and " +
        "guidance with the course material for the entire semester.",
      p2:
        "If you are interested in enrolling in a CSM section, you are responsible " +
        "for reading this document in full before you enroll, as it contains " +
        "important information and guidelines that all students should be aware of."
    }
  },
  howToSignUp: {
    title: "How to Sign Up",
    body: {
      p1_1: "Sign up via ",
      p1_a: {
        text: "CSM Scheduler",
        link: "https://scheduler.csmentors.org/"
      },
      p1_2:
        ". Section signups will be announced 2 to 3 weeks into the semester " +
        "via your course's Ed/Piazza, so keep an eye out there. Please note that ",
      p1_b: "You cannot go to a section you are not signed up for",
      p2:
        "To sign up for a section, create an account on Scheduler. Once you are logged in, " +
        "click the course you want to enroll in on the home page. You will then see a list " +
        "of sections that you can enroll in for that course. Select one and click enroll. If " +
        "you\u2019d like to enroll in another course, click “Sections” and “Enroll in a section” " +
        "in the top right."
    }
  },
  guidelines: {
    title: "Section Information",
    body: {
      i1_1:
        "Each section is meant to be a safe space to work through the " +
        "material with your fellow students and your mentor. As such, " +
        "be kind to everyone in the section. ",
      i1_b: "No one should feel bad that they don’t yet understand something.",
      i2:
        "Likewise, group work will be heavily emphasized. The hope is " +
        "that you become comfortable asking questions and making " +
        "mistakes around everyone in section and that you get " +
        "misconceptions worked out that you couldn’t ask about in " +
        "discussion or lab.",
      i3_1: "The focus of these sections will be on the worksheets provided, " + "designed by experienced mentors.",
      i3_b: "No homework or project help will ever be provided. ",
      i3_2:
        "However, if your entire group agrees, you can bring in questions from discussion " +
        "worksheets, guerrilla sections, etc. In this case, please give your mentor a head up " +
        "so that they can prepare.",
      i4_1: "You may optionally choose to receive one P/NP unit for your participation in CSM. You will receive this unit if you attend section (same time, same place) each week and fulfill a few other requirements.",
      i4_b: "Sign up for a section you are confident that you can make " + "it for the entire semester. ",
      i4_2: "You can have two unexcused absences over the course of the semester. ",
      i4_b2: "Department policy limits you to one units, no matter how many CSM sections you may be enrolled in.",
      i5: "We will release two surveys (one midway through the semester and one at the end of the semester) to collect feedback on your mentor and your experience with CSM. We strive to continuously improve the student experience with each passing semester and will greatly appreciate your feedback. These surveys are mandatory if you are enrolled in a CSM section (see below for more details), but we promise they will not take long to fill out."
    }
  },
  affinitySections: {
    title: "Affinity, NPE, and Program-Affiliated Sections",
    body: {
      p1:
        "We offer several sections geared towards supporting students from " +
        "backgrounds underrepresented or under-resourced in EECS and STEM. " +
        "These include:",
      i1_b: "Affinity Sections",
      i1_2:
        " - These are sections designed for students who affiliate with identities and communities underrepresented " +
        "in the Berkeley EECS community. Types of affinity sections that we have offered previously or hope to offer, " +
        "include: woman affinity sections, LGBTQ+ affinity sections, Hispanic/Latinx affinity sections, and Transfer Student sections.",
      i2_b: "No Prior Experience (CS 61A & CS 61B only)",
      i2_2: " - 1-2 hour sections that are specifically geared towards students with no or limited prior experience in computer science. They meet twice a week (in CS 61A) rather than once a week. They do not cover any more material than a regular section, and will instead cover the worksheets at a slower pace and with more conceptual discussion.",
      i3_b: "Program-affiliated sections",
      i3_2:
        " - We partner with other programs on campus (e.g. CS Scholars, EOP Scholars, and SEED Scholars) " +
        "to offer sections designated for students enrolled in these programs. Please only enroll in one " +
        "of these sections if you are also enrolled in the corresponding program. " +
        "Feel free to enroll in a regular section even if you are a program member.",
      p2:
        "Affinity section offerings will vary by course, as they depend on " +
        "the availability of mentors interested in teaching these sections. " +
        "These sections will be clearly marked on the Scheduler website when " +
        "you enroll."
    }
  },
  communications: {
    title: "Communications",
    body: {
      p1_1: "Worksheets can be found on the ",
      p1_a: {
        link: "https://scheduler.csmentors.org/",
        text: "CSM Scheduler"
      },
      p1_2:
        ' website under "Resources". Worksheets are publicly available, ' +
        "even for students who are not enrolled in a CSM section.",
      p2_1: "General questions regarding CSM can be directed to our email address, ",
      p2_a: {
        link: "mailto:mentors@berkeley.edu",
        text: "mentors@berkeley.edu"
      },
      p2_2: ". For communications specific to your CSM course, some courses will have a CSM Piazza/Ed, which will be titled CSM [Course Code]. Your mentor will be your primary contact for questions regarding your section."
    }
  },
  csmForUnit: {
    title: "Taking CSM for a unit",
    body: {
      p1_1: "Students who participate in CSM sections may ",
      p1_b: "optionally",
      p1_2: " enroll in CS 198-142: Collaborative Small-Group Mentorship, which is a one-unit, COCI-approved course on teaching and learning techniques. You may only receive one unit of credit for CSM each semester, regardless of the number of sections you are enrolled in. (When you sign up, you will choose the one course for which you will be graded.)",
      p2_1: "Enrollment in the unit on CalCentral is ",
      p2_b: "not automatic",
      p2_2:
        " for students who enroll in a section on Scheduler. If you wish " +
        "to enroll in the unit, you should first enroll in a section on " +
        "Scheduler, then fill out this form to receive a permission code & units: ",
      p2_a: {
        link: "https://tinyurl.com/csm-unit-fa24",
        text: "https://tinyurl.com/csm-unit-fa24"
      },
      p3_1:
        "Enrolling in the unit on CalCentral does not guarantee enrollment " +
        "in a section — you should enroll in a section on Scheduler ",
      p3_b: "before",
      p3_2:
        " enrolling in the unit on CalCentral. If, at the end of the " +
        "semester, you are enrolled for the unit on CalCenral but are " +
        "not enrolled on Scheduler, you will receive an NP.",
      p4_1: "If you drop the CS course you are enrolled in, you should drop " + "your CSM Section on Scheduler ",
      p4_b: "and",
      p4_2: " on CalCentral, to avoid receiving an NP.",
      p5_b: "Because unit enrollment is managed through CalCentral, your college's normal policies and deadlines for adding and dropping courses will apply to the CSM unit.",
      p5_1:
        "This means that if you attempt to add the " +
        "CSM unit after your college's add deadline, or drop the unit " +
        "after your college's drop deadline, you will not be able to do " +
        "so through CalCentral.",
      p6: "The only graded-requirements of CS 198-142 are:",
      li2_1: {
        bullet: "Having no more than 2 unexcused absences at sections over the course of a semester.",
        subbull_1: "If you must miss a section, please email your mentor with the subject: “",
        subbull_b: "[CSM Request for Absence] <course>",
        subbull_2: '” (e.g. "[CSM Request for Absence] CS61A") detailing the ' + "reasons for your absence, and cc ",
        subbull_a: {
          link: "mailto:mentors@berkeley.edu",
          text: "mentors@berkeley.edu"
        }
      },
      li2_2: "Completing the Mid-Semester Feedback Evaluation, which will be sent via email",
      li2_3: "Completing the End-of-Semester Feedback Evaluation, which will be sent via email",
      p7_1: "Additionally, there are a variety of ",
      p7_b: "ungraded, optional",
      p7_2: " weekly readings on teaching and learning, and an optional one-hour weekly lecture on Wednesday from 7-8 p.m. in Soda 405. Lectures will be recorded and posted for student reference. Lecture attendance is not recorded and has no bearing on your grade.",
      p8_1: "A syllabus for CS 198-142 is available ",
      p8_a: {
        link: "https://docs.google.com/document/d/1mXSfXSOg5u4ZVs9Ff5BPVpllh4fplVtK15er0SVCqT0/edit?usp=sharing",
        text: "here"
      },
      p8_2: "."
    }
  },
  faq: {
    title: "FAQ",
    body: {
      p1_b: "What courses does CSM offer sections for?",
      p2:
        "We offer small tutoring sections (4 to 7 students) for the lower-division CS courses: " +
        "CS 61A, CS 61B, CS 61C, CS 70, CS 88 (now DATA C88C), EECS 16A, and EECS 16B. " +
        "We do not offer 1-1 tutoring.",
      p3_b: "What requirements are there to join a section?",
      p4_1:
        "You must currently be enrolled in the course you wish to take a section for. " +
        "If you drop the CS course you are enrolled in, drop your CSM section on Scheduler ",
      p4_b: "and",
      p4_2: " on CalCentral to avoid receiving an NP.",
      p5_b: "Sections are full. Can I be put on a waitlist?",
      p6:
        "Sections are first come first serve, and we do not have a " +
        "waitlist. We recommend keeping an eye on Scheduler for any " +
        "spots that may open up if other students drop.",
      p7_b: "I'm not sure if I should take the unit—what should I be considering?",
      p8: "Good reasons to enroll in the unit:",
      li1: "You need extra units to meet your college's requirements or to " + "receive financial aid",
      li2: "You're looking for a way to hold yourself accountable to " + "attending section",
      p9_1: "Good reasons to ",
      p9_b: "not",
      p9_2: " enroll in the unit:",
      li3: "You're unsure whether you plan to stay enrolled in CSM, and are " + "just trying it out",
      li4: "You're concerned about exceeding the unit cap for your college, " + "or exceeding the 33% PNP limit",
      p10:
        "It's very possible that none of the above reasons apply to you, " +
        "in which case you can choose to or to not enroll in the unit " +
        "however you'd like!"
    }
  }
};

export default SECTIONS;
