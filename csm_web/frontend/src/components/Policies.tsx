import React from "react";

// Styles
import "../css/policies.scss";

// Data
import SECTIONS from "../../static/frontend/data/enrollment_policies";

export default class Policies extends React.Component {
  render(): React.ReactNode {
    // see SECTIONS doc below to understand what is going on here
    const intro = SECTIONS.introduction;
    const htsu = SECTIONS.howToSignUp;
    const guides = SECTIONS.guidelines;
    const comms = SECTIONS.communications;
    const aff = SECTIONS.affinitySections;
    const forUnit = SECTIONS.csmForUnit;
    const faq = SECTIONS.faq;
    return (
      <div>
        <div className="policy-sections">
          <div>
            <h1>{intro.title}</h1>
            <p>
              <a href={intro.body.p1_a.link}>{intro.body.p1_a.text}</a>
              {intro.body.p1}
            </p>
            asdf
            <p>
              <b>{intro.body.p2}</b>
            </p>
          </div>

          <div className="divider"></div>

          <div>
            <h1>{htsu.title}</h1>
            <p>
              {htsu.body.p1_1}
              <a href={htsu.body.p1_a.link}>{htsu.body.p1_a.text}</a>
              {htsu.body.p1_2}
              <b>{htsu.body.p1_b}</b>
            </p>
            <p>{htsu.body.p2}</p>
          </div>

          <div className="divider"></div>

          <div>
            <h1> {guides.title} </h1>
            <ol>
              <li>
                {guides.body.i1_1}
                <b> {guides.body.i1_b} </b>
              </li>
              <li>{guides.body.i2}</li>
              <li>
                {guides.body.i3_1}
                <b> {guides.body.i3_b} </b>
                {guides.body.i3_2}
              </li>
              <li>
                {guides.body.i4_1}
                <b> {guides.body.i4_b} </b>
                {guides.body.i4_2}
                <b> {guides.body.i4_b2} </b>
              </li>
              <li>{guides.body.i5}</li>
            </ol>
          </div>

          <div className="divider"></div>

          <div>
            <h1> {comms.title} </h1>
            <p>
              {comms.body.p1_1}
              <a href={comms.body.p1_a.link}>{comms.body.p1_a.text}</a>
              {comms.body.p1_2}
            </p>
            <p>
              {comms.body.p2_1}
              <a href={comms.body.p2_a.link}>{comms.body.p2_a.text}</a>
              {comms.body.p2_2}
            </p>
          </div>

          <div className="divider"></div>

          <div>
            <h1> {aff.title}</h1>
            <p> {aff.body.p1} </p>
            <ul>
              <li>
                <b> {aff.body.i1_b} </b>
                {aff.body.i1_2}
              </li>
              <li>
                <b> {aff.body.i2_b} </b>
                {aff.body.i2_2}
              </li>
              <li>
                <b> {aff.body.i3_b} </b>
                {aff.body.i3_2}
              </li>
            </ul>
            {aff.body.p2}
          </div>

          <div className="divider"></div>

          <div>
            <h1> {forUnit.title} </h1>
            <p>
              {forUnit.body.p1_1}
              <b> {forUnit.body.p1_b} </b>
              {forUnit.body.p1_2}
              <b> {forUnit.body.p1_b2} </b>
            </p>
            <p>
              {forUnit.body.p2_1}
              <b> {forUnit.body.p2_b} </b>
              {forUnit.body.p2_2}
            </p>
            <p>
              {forUnit.body.p3_1}
              <b> {forUnit.body.p3_b}</b>
              {forUnit.body.p3_2}
            </p>
            <p>
              {forUnit.body.p4_1}
              <b>{forUnit.body.p4_b}</b>
              {forUnit.body.p4_2}
            </p>
            <p>{forUnit.body.p5}</p>
            <p> {forUnit.body.p6}</p>
            <ul>
              <li> {forUnit.body.li2_1} </li>
              <li>
                {forUnit.body.li2_2.bullet}
                <ul>
                  <li>
                    {forUnit.body.li2_2.subbull_1}
                    <b>{forUnit.body.li2_2.subbull_b}</b>
                    {forUnit.body.li2_2.subbull_2}
                    <a href={forUnit.body.li2_2.subbull_a.link}>{forUnit.body.li2_2.subbull_a.text}</a>
                  </li>
                </ul>
              </li>
              <li>
                {forUnit.body.li2_3.bullet}
                <ul>
                  <li>
                    <b>{forUnit.body.li2_3.subbull_b}</b>
                    {forUnit.body.li2_3.subbull_2}
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          <div className="divider"></div>

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
            <p> {faq.body.p8} </p>
            <ul>
              <li> {faq.body.li1} </li>
              <li> {faq.body.li2} </li>
            </ul>
            <p>
              {faq.body.p9_1}
              <b> {faq.body.p9_b} </b>
              {faq.body.p9_2}
            </p>
            <ul>
              <li> {faq.body.li3} </li>
              <li> {faq.body.li4} </li>
            </ul>
            <p> {faq.body.p10} </p>
          </div>
        </div>
      </div>
    );
  }
}
