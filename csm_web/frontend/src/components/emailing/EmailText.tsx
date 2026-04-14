import React from "react";

interface EmailOptionProps {
    fieldName: string;
    numberOfFields: number; // perhaps b/c it's just fields with an input box we can just loop it?
    emailType: string;       // which of the templetes are the types which we are using, this determines the fields which we want to populate
}

export default function TextFields({ fieldName, numberOfFields, emailType}:EmailOptionProps ) {
  return (
    <div>
        <text>{fieldName}</text>
        {/* <label for={ name }> { name }:</label> */}
        {/* <input type="text"> </input> */}
    </div>
  );
}