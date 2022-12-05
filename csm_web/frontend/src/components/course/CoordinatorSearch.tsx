import React, { useEffect, useState } from "react";
import { fetchJSON } from "../../utils/api";
import { Section, Student } from "../../utils/types";
import { SectionCard } from "./SectionCard";
import { CreateSectionModal } from "./CreateSectionModal";
import { DataExportModal } from "./DataExportModal";
import { SearchBar } from "../SearchBar";
import { SearchRow } from "./SearchRow";
import { SearchTable } from "./SearchTable";

export const CordinatorSeach = (): React.ReactElement => {
  const [allStudents, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>();

  const reloadSearch = (): void => {
    interface JSONResponseType {
      students: Student[];
    }

    fetchJSON(`/student-students`).then(({ students }: JSONResponseType) => {
      setStudents(students);
    });
  };

  // reload sections upon first mount
  useEffect(() => {
    reloadSearch();
  }, []);

  const handleChange = ({ target: { value } }: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>): void => {
    const validStudents = [];
    if (value.length != 0) {
      for (let i = 0; i < allStudents.length; i++) {
        const student = allStudents[i];
        let str = student.name + student.email;
        str += student.id;
        if (str.includes(value)) {
          validStudents.push(student);
        }
      }
    }
    setSelectedStudents(validStudents);
  };

  return (
    <div>
      Search
      <SearchBar className="test" onChange={handleChange} />
      <SearchRow name="test" email="test@berkeley.edu" id="1234" />
      {selectedStudents?.map(student => (
        <div key={student.id}>
          <SearchRow name={student.name} email={student.email} id={student.id.toString()} />
        </div>
      ))}
    </div>
  );
};
