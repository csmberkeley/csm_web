import React from "react";

export default class Policies extends React.Component {
  render(): React.ReactNode {
    const intro = SECTIONS.introduction;
    const htsu = SECTIONS.howToSignUp;
    const guides = SECTIONS.guidelines;
    const comms = SECTIONS.communications;
    const aff = SECTIONS.affinitySections;
    const forUnit = SECTIONS.csmForUnit;
    const faq = SECTIONS.faq;
    return (
      <div>
        <div className="sections">
          <div>
            <h1>{intro.title}</h1>
            <p>
              <a href={intro.body.p1_a.link}>{intro.body.p1_a.text}</a>
              {intro.body.p1}
            </p>
            <p>{intro.body.p2}</p>
          </div>

          <div>
            <h1>{htsu.title}</h1>
            <p>
              {htsu.body.p1_1}
              <a href={htsu.body.p1_a.link}>{htsu.body.p1_a.text}</a>
              {htsu.body.p1_2}
              <b>{htsu.body.p1_b}</b>
              {htsu.body.p1_3}
            </p>
            <p>{htsu.body.p2}</p>
            <p>{htsu.body.p3}</p>
          </div>

          <div>
            <h1> {guides.title} </h1>
            <ol>
              <li>
                {guides.body.i1_1}
                <b> {guides.body.i1_b} </b>
              </li>
              <li>{guides.body.i2}</li>
              <li>{guides.body.i3}</li>
              <li>
                {guides.body.i4_1}
                <b> {guides.body.i4_b} </b>
                {guides.body.i4_2}
              </li>
              <li>{guides.body.i5}</li>
            </ol>
          </div>

          <div>
            <h1> {comms.title} </h1>
            <p>
              {comms.body.p1_1}
              <a href={comms.body.p1_a.link}> {comms.body.p1_a.text}</a>
              {comms.body.p1_2}
            </p>
            <p>
              {comms.body.p2_1}
              <a href={comms.body.p2_a.link}> {comms.body.p2_a.text} </a>
              {comms.body.p2_2}
            </p>
          </div>

          <div>
            <h1> {aff.title}</h1>
            <p> {aff.body.p1} </p>
            <ol>
              <li>
                <b> {aff.body.i1_b} </b>
                {aff.body.i1_2}
                <p> {aff.body.i1_i1} </p>
                <p> {aff.body.i1_i2} </p>
                <p> {aff.body.i1_i3} </p>
                <p> {aff.body.i1_i4} </p>
              </li>
              <li>
                <b> {aff.body.i2_b} </b>
                {aff.body.i2_2}
              </li>
              <li>
                <b> {aff.body.i3_b} </b>
                {aff.body.i3_2}
              </li>
            </ol>
            {aff.body.p2}
          </div>

          <div>
            <h1> {forUnit.title} </h1>
            <p>
              {forUnit.body.p1_1}
              <b> {forUnit.body.p1_b} </b>
              {forUnit.body.p1_2}
            </p>
            <p>
              {forUnit.body.p2_1}
              <b> {forUnit.body.p2_b} </b>
              {forUnit.body.p2_2}
            </p>
            <ul>
              <li> {forUnit.body.li1_1} </li>
              <li> {forUnit.body.li1_2} </li>
            </ul>
            <p>
              {forUnit.body.p3_1}
              <b> {forUnit.body.p3_b}</b>
              {forUnit.body.p3_2}
            </p>
            <p>
              {forUnit.body.p4_1}
              <b> {forUnit.body.p4_b} </b>
              {forUnit.body.p4_2}
            </p>
            <p>
              {forUnit.body.p5_1}
              <a href={forUnit.body.p5_a.link}> {forUnit.body.p5_a.text} </a>
              {forUnit.body.p5_2}
            </p>
            <p> {forUnit.body.p6}</p>
            <ul>
              <li> {forUnit.body.li2_1} </li>
              <li>
                {forUnit.body.li2_2.bullet}
                <ul>
                  <li>
                    {forUnit.body.li2_2.subbull_1}
                    <b> {forUnit.body.li2_2.subbull_b} </b>
                    {forUnit.body.li2_2.subbull_2}
                  </li>
                </ul>
              </li>
              <li>
                {forUnit.body.li2_3.bullet}
                <ul>
                  <li>
                    <b> {forUnit.body.li2_3.subbull_b} </b>
                    {forUnit.body.li2_3.subbull_2}
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          <div>
            <h1> {faq.title} </h1>
            <p>
              {" "}
              <b> {faq.body.p1_b} </b>{" "}
            </p>
            <p> {faq.body.p2} </p>
            <p>
              {" "}
              <b> {faq.body.p3_b} </b>{" "}
            </p>
            <p> {faq.body.p4} </p>
            <p>
              {" "}
              <b> {faq.body.p5_b} </b>{" "}
            </p>
            <p> {faq.body.p6} </p>
            <p>
              {" "}
              <b> {faq.body.p7_b} </b>{" "}
            </p>
            <p>
              {faq.body.p8}
              <ul>
                <li> {faq.body.li1} </li>
                <li> {faq.body.li2} </li>
              </ul>
            </p>
            <p>
              {faq.body.p9_1}
              <b> {faq.body.p9_b} </b>
              {faq.body.p9_2}
              <ul>
                <li> {faq.body.li3} </li>
                <li> {faq.body.li4} </li>
              </ul>
            </p>
            <p> {faq.body.p10} </p>
          </div>
        </div>
      </div>
    );
  }
}

const SECTIONS = {
  introduction: {
    title: "Introduction",
    body: {
      p1_a: {
        text: "Computer Science Mentors ",
        link: "https://csmentors.berkeley.edu/"
      },
      p1:
        "is a student group with the goal of creating a community feeling among " +
        "the lower-division CS courses. We are offering small, hour-long sections " +
        ", each led by a mentor that you regularly attend to review the past week’s " +
        "material. You should sign up for a section if you’d like to work with others " +
        "and receive extra practice and guidance with the course material for the entire semester.",
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
        ". Please create an account on the application, then sign up for " +
        "ONE section that you are comfortable attending weekly. ",
      p1_b: "You cannot go to a section you are not signed up for",
      p1_3:
        ". Each section is small, and each mentor should expect the same " +
        " students in his or her section. Most sections will be in-person, " +
        "with some being online.",
      p2:
        "Once you are logged in, click the name of the course you want to " +
        "enroll in on the home page. You can then see a list of sections " +
        "that you can enroll in for that course. If you’d like to enroll " +
        "in another course, click “Sections” and “Enroll in a section” in " +
        "the top right.",
      p3:
        "Section sign-ups will be announced 2-3 weeks into the semester " +
        "via your course's Piazza, so you should keep an eye on Piazza " +
        "for when signups will open."
    }
  },
  guidelines: {
    title: "Guidelines",
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
      i3:
        "The focus of these sections will be on the worksheets provided, " +
        "designed by experienced mentors. No homework or project help " +
        " will ever be provided. However, if your entire group agrees, " +
        "you can bring in questions from discussion worksheets, guerrilla " +
        "sections, etc. In this case, please give your mentor a head up " +
        "so that they can prepare.",
      i4_1:
        "For each class that you are a CSM student for, you may receive " +
        "one P/NP unit (see below). You will receive these unit(s) if you " +
        "attend section (same time, same place) each week. ",
      i4_b: "Sign up for a section you are confident that you can make " + "it for the entire semester. ",
      i4_2: "You can have two unexcused absences over the course of the semester. ",
      i5:
        "We will release a couple of surveys—one midway through the " +
        "semester, and one at the end of the semester—to collect feedback " +
        "on your mentor and your experience with CSM. We want to become " +
        "better and better with each passing semester, and we can only do " +
        "that with your assistance. These surveys are mandatory if you are " +
        "enrolled in a CSM section (see below), but we promise they will not take long to fill out."
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
      p2_2:
        ". For communications specific to your CSM course, some courses " +
        "will have a CSM Piazza, which will be titled CSM [Course Number]. " +
        "Your mentor will be your primary contact for questions regarding your section."
    }
  },
  affinitySections: {
    title: "Affinity Sections",
    body: {
      p1:
        "We offer several sections geared towards supporting students from " +
        "backgrounds underrepresented or under-resourced in EECS and STEM. " +
        "These include:",
      i1_b: "Affinity Sections",
      i1_2:
        " - These are sections designed for students who affiliate with " +
        "identities and communities underrepresented in the Berkeley EECS " +
        "community. Types of affinity sections that we have offered " +
        "previously, or hope to offer, include:",
      i1_i1: "1.1 Woman affinity sections",
      i1_i2: "1.2 LGBTQ+ affinity sections",
      i1_i3: "1.3 Hispanic/Latinx affinity sections",
      i1_i4: "1.4 Transfer sections",
      i2_b: "Limited Experience Sections (CS 61A only)",
      i2_2:
        " - Limited experience sections are specifically geared towards " +
        "students with no or limited prior experience in computer science. " +
        "They meet twice a week rather than once a week, and do not cover " +
        "any more material than a regular section, although they will cover " +
        "the worksheets at a slower pace and with more conceptual discussion.",
      i3_b: "Program-affiliated sections",
      i3_2:
        " - We partner with other programs on campus (e.g. EOP and SEED " +
        "Scholars) to offer sections designated for students enrolled in " +
        "these programs. Please only enroll in one of these sections if " +
        "you are also enrolled in the corresponding program",
      p2:
        "Affinity section offerings will vary by course, as they depend on " +
        "the availability of mentors interested in teaching these sections. " +
        "These sections will be clearly marked on the Scheduler website when you enroll."
    }
  },
  csmForUnit: {
    title: "Taking CSM for a unit",
    body: {
      p1_1: "Students enrolled in a CSM section may ",
      p1_b: "optionally",
      p1_2:
        " enroll for PNP units on CalCentral. Students are eligible for " +
        "one unit of PNP credit per CSM section enrolled in—for example, " +
        "if you're enrolled in CSM sections for both CS 61B and CS 70, " +
        "you may enroll for up to two units.",
      p2_1: "Enrollment in the unit on CalCentral is ",
      p2_b: "not automatic",
      p2_2:
        " for students who enroll in a section on Scheduler. If you wish " +
        "to enroll in the unit, you should first enroll in a section on " +
        "scheduler, then go to CalCentral and find and add the appropriate " +
        "number of units with this course information:",
      li1_1: "Course number: CS 197-215",
      li1_2: "CCN: 16190",
      p3_1:
        "Enrolling in the unit on CalCentral will not guarantee enrollment " +
        "in a section—you should enroll in a section on Scheduler ",
      p3_b: "before",
      p3_2:
        " enrolling in the unit on CalCentral. If, at the end of the " +
        "semester, you are enrolled for the unit on CalCenral but are " +
        "not enrolled on Scheduler, you will receive an NP.",
      p4_1: "If you drop the CS course you are enrolled in, you should drop " + "your CSM Section on Scheduler ",
      p4_b: "and",
      p4_2: " on CalCentral, to avoid receiving an NP.",
      p5_1:
        "Because unit enrollment is managed through CalCentral, your " +
        "college's normal deadlines for adding and dropping courses will " +
        "apply to the CSM unit. This means that if you attempt to add the " +
        "CSM unit after your college's add deadline, or drop the unit " +
        "after your college's drop deadline, you will not be able to do " +
        "so through CalCentral. Students who wish to add the unit after " +
        "their college's add deadline should fill out our ",
      p5_a: {
        link:
          "https://docs.google.com/forms/d/e/1FAIpQLSePuGRUYaVj-LxwiuVji" + "Eo4JsP9ErokWJ4OpQnW0zpiVDQF4g/viewform",
        text: "late add form"
      },
      p5_2: ", which will allow our faculty advisor to add you manually.",
      p6: "In order to receive a P on the CSM unit, students must:",
      li2_1: "Have no unexcused absences during the first three weeks of section",
      li2_2: {
        bullet: "Have no more than two unexcused absences throughout the " + 'semester (see "Guidelines")',
        subbull_1:
          "If there are extenuating circumstances that would cause " +
          "you to miss a section, you must email your mentor with the subject: “",
        subbull_b: "[Request for Absence] <course>",
        subbull_2:
          '” (e.g. "[Request for Absence] CS61A") detailing the ' +
          "reasons for your absence, and cc mentors@berkeley.edu."
      },
      li2_3: {
        bullet:
          "Fill out both the mid-semester feedback survey and " +
          'end-of-semester feedback survey, which are sent via email (see "Guidelines")',
        subbull_b: "Even if you are not taking CSM for a unit",
        subbull_2:
          ", failure to fill out either feedback form may affect " +
          "your ability to enroll in CSM sections in future " +
          "semesters, and may result in you being dropped from your section."
      }
    }
  },
  faq: {
    title: "FAQ",
    body: {
      p1_b: "What courses does CSM offer sections for?",
      p2:
        "We offer small tutoring sections (3-6 students) for CS 61A, " +
        "CS 61B, CS 61C, CS 70, CS 88, EECS 16A, and EECS 16B. We do " +
        "not offer 1-1 tutoring.",
      p3_b: "What requirements are there to join a section?",
      p4:
        "You must currently be enrolled in the course you wish to take " +
        "a section for. If you drop the course, we ask that you drop " +
        "from the CSM section on Scheduler.",
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
        "however you'd like"
    }
  }
};
