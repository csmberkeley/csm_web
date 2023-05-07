import React, { useEffect, useState } from "react";
import { fetchJSON } from "../../utils/api";
import { Section, Student } from "../../utils/types";
import { SectionCard } from "./SectionCard";
import { CreateSectionModal } from "./CreateSectionModal";
import { DataExportModal } from "./DataExportModal";
import { SearchBar } from "../SearchBar";
import { SearchRow } from "./SearchRow";
import { SearchTable } from "./SearchTable";
import StudentSection from "../section/StudentSection";

interface CoordinatorSearchProps {
  allStudents: Student[];
}

export const CoordinatorSearch = ({ allStudents }: CoordinatorSearchProps): React.ReactElement => {
  const [selectedStudents, setSelectedStudents] = useState<Student[]>();

  const handleChange = ({ target: { value } }: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>): void => {
    const validStudents = [];
    if (value.length != 0) {
      for (let i = 0; i < allStudents.length; i++) {
        const student = allStudents[i];
        let str = student.name + student.email;
        str += student.id;
        if (str.toLowerCase().includes(value.toLowerCase())) {
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
      {selectedStudents?.map(student => (
        <div key={student.id}>
          <SearchRow name={student.name} email={student.email} id={student.id.toString()} />
        </div>
      ))}
    </div>
  );
};
