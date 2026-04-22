import React from "react";
import CupTable from "./CupTable";
import CurrentChallenge from "./CurrentChallenge";
import "../../css/cup.scss";

export default function CupInterface(): JSX.Element {
  return (
    <div>
      {/* We want to have a main page that utilizes the cup components.*/}
      {/* It would show the current challenge at the top, and then the table with all the families and points below. */}
      {/* We will link the Challenges page (which is for cupadmin) here too as a button. */}
      <CurrentChallenge />
      <CupTable />
    </div>
  );
}
