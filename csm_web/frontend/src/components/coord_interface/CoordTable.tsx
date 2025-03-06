import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { Mentor, Student, getCoordData } from "../../utils/queries/coord";
import "../../css/coord_interface.scss";

export default function CoordTable() {
  const [tableData, setTableData] = useState<Mentor[] | Student[]>([]);
  const params = useParams();
  const courseId = Number(params.id);
  const { pathname } = useLocation();
  const isStudents = pathname.includes("students");

  useEffect(() => {
    const fetchData = async () => {
      setTableData(await getCoordData(courseId, isStudents));
    };
    fetchData();
  }, []);

  const navigate = useNavigate();

  return (
    <table>
      {isStudents ? (
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Mentor Name</th>
          <th>Time</th>
          <th>Unexcused Absenses</th>
        </tr>
      ) : (
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Family</th>
          <th>Time</th>
          <th>Section Size</th>
        </tr>
      )}
      {tableData.map(row =>
        isStudents ? (
          <tr key={row.id} onClick={() => navigate(`/sections/${row.section}`)}>
            <td>{row.name}</td>
            <td>{row.email}</td>
            <td>{(row as Student).mentorName}</td>
            <td>{row.dayTime}</td>
            <td>{(row as Student).numUnexcused}</td>
          </tr>
        ) : (
          <tr key={row.id} onClick={() => navigate(`/sections/${row.section}`)}>
            <td>{row.name}</td>
            <td>{row.email}</td>
            <td>{(row as Mentor).family}</td>
            <td>{row.dayTime}</td>
            <td>{(row as Mentor).numStudents}</td>
          </tr>
        )
      )}
    </table>
  );
}
