import React, { useEffect, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import { fetchJSON } from "../../utils/api";
import "../../css/coord_interface.scss";

interface Student {
  id: number;
  name: string;
  email: string;
  numUnexcused: number;
  section: number;
  mentorName: string;
  dayTime: string;
}

interface Mentor {
  id: number;
  name: string;
  email: string;
  numStudents: number;
  section: number;
  family: string;
  dayTime: string;
}

export default function CoordTable() {
  const [tableData, setTableData] = useState<Mentor[] | Student[]>([]);
  const params = useParams();
  const courseId = Number(params.id);
  const { pathname } = useLocation();
  const isStudents = pathname.includes("students");

  useEffect(() => {
    const fetchData = async () => {
      const { tempTableData } = await fetchJSON(`/api/coord/${courseId}/${isStudents ? "students" : "mentors"} `);
      setTableData(tempTableData);
    };
    fetchData();
  }, []);

  return (
    <table>
      isStudents ? (
      <thead>
        <td>Name</td>
        <td>Email</td>
        <td>Absenses</td>
        <td>Mentor Name</td>
        <td>Time</td>
      </thead>
      ) : (
      <thead>
        <td>Name</td>
        <td>Email</td>
        <td>Family</td>
        <td>Section Size</td>
      </thead>
      )
      {tableData.map(row =>
        isStudents ? (
          <Link to={`/sections/${row.section}`} key={row.id}>
            <tr>
              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>{(row as Student).mentorName}</td>
              <td>{row.dayTime}</td>
              <td>{(row as Student).numUnexcused}</td>
            </tr>
          </Link>
        ) : (
          <Link to={`/sections/${row.section}`} key={row.id}>
            <tr>
              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>{(row as Mentor).family}</td>
              <td>{row.dayTime}</td>
              <td>{(row as Mentor).numStudents}</td>
            </tr>
          </Link>
        )
      )}
    </table>
  );
}
