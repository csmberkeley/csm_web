import React, { useState, useEffect, ChangeEvent, MouseEvent } from "react";
import { Student } from "../../utils/types";
import { SearchRow } from "./SearchRow";

interface SearchTableProps {
  temp: string;
}

export const SearchTable = ({ temp }: SearchTableProps): React.ReactElement => {
  const [students, setStudents] = useState<Array<Student>>([]);
  return (
    <div>
      <SearchRow name="test" email="test@berkeley.edu" id="1234" />
      {students.map(student => (
        <div key={student.id}>
          <SearchRow name={student.name} email={student.email} id={student.id.toString()} />
        </div>
      ))}
    </div>
  );
};
