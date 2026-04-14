import React, { useState } from "react";

import { useSectionStudents } from "../../utils/queries/sections";
import LoadingSpinner from "../LoadingSpinner";

import CheckCircle from "../../../static/frontend/img/check_circle.svg";
import CopyIcon from "../../../static/frontend/img/copy.svg";

import EmailOption from "./EmailOption";
import EmailText from "./EmailText";


export default function MentorSectionEmailTemp() {
  /* Email Template Options */
  return (
    /*Check Boxes for Email Options*/
    <div className="Email_Temp">
      <h3 className="section-detail-page-title">Email</h3> 
      <form> /* into one component and use onClick */
        <EmailOption name="Name" showTemp={() => 1 + 1}></EmailOption>
        <EmailText fieldName="Change" numberOfFields={1} emailType="Change"></EmailText>
        {/* need to change the showTemp later (above) */}
        {/* // { emailOption(TextPop("change"), "Change") }
        // { emailOption(TextPop("cancel"), "Cancel") }
        // { emailOption(TextPop("resources"), "Resources") }
        // { emailOption(TextPop("late"), "Late") }
        // { emailOption(TextPop("other"), "Other") }   */}
      </form>
      
    </div>
  );
}
