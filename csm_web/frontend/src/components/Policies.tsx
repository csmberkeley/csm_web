import React from "react";

export default class Policies extends React.Component {
  render(): React.ReactNode {
    const intro = SECTIONS.introduction;
    const htsu = SECTIONS.howToSignUp;
    const guides = SECTIONS.guidelines;
    const comms = SECTIONS.communications;
    return (
      <div>
        <div className="sections">
          <h1>{intro.title}</h1>
          <div>
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
    title: "Affinity sections",
    body: {}
  },
  csmForUnit: {
    title: "Taking CSM for a unit",
    body: {}
  },
  faq: {
    title: "FAQ",
    body: {}
  }
};
