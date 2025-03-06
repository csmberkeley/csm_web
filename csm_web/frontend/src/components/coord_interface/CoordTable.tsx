import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { Mentor, Student, getCoordData } from "../../utils/queries/coord";
import styles from "../../css/coord_interface.scss";

export default function CoordTable() {
  const [tableData, setTableData] = useState<Mentor[] | Student[]>([]);
  const params = useParams();
  const courseId = Number(params.id);
  const { pathname } = useLocation();
  const isStudents = pathname.includes("students");
  let selected = false;

  useEffect(() => {
    const fetchData = async () => {
      setTableData(await getCoordData(courseId, isStudents));
    };
    fetchData();
  }, []);

  const navigate = useNavigate();

  function selectCheckbox(id: number) {
    const checkbox = document.getElementById(id + "check") as HTMLInputElement;
    checkbox.checked = !checkbox.checked;
  }
  function toggleAllCheckboxes() {
    console.log(selected);
    if (selected) {
      deselectAllCheckboxes();
      selected = false;
    } else {
      selectAllCheckboxes();
      selected = true;
    }
  }
  function selectAllCheckboxes() {
    const checkboxes = document.querySelectorAll("input[type=checkbox]");
    checkboxes.forEach(checkbox => {
      (checkbox as HTMLInputElement).checked = true;
    });
  }
  function deselectAllCheckboxes() {
    const checkboxes = document.querySelectorAll("input[type=checkbox]");
    checkboxes.forEach(checkbox => {
      (checkbox as HTMLInputElement).checked = false;
    });
  }

  return (
    <div className={styles}>
      <table>
        {isStudents ? (
          <tr>
            <CheckBox id="check" onClick={toggleAllCheckboxes} />
            <th>Name</th>
            <th>Email</th>
            <th>Mentor Name</th>
            <th>Time</th>
            <th>Unexcused Absenses</th>
          </tr>
        ) : (
          <tr>
            <CheckBox id="check" onClick={toggleAllCheckboxes} />
            <th>Name</th>
            <th>Email</th>
            <th>Family</th>
            <th>Time</th>
            <th>Section Size</th>
          </tr>
        )}
        {tableData.map(row =>
          isStudents ? (
            <tr
              key={row.id}
              className="data-row"
              onDoubleClick={() => navigate(`/sections/${row.section}`)}
              onClick={() => selectCheckbox(row.id)}
            >
              <CheckBox id={row.id.toString()} />

              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>{(row as Student).mentorName}</td>
              <td>{row.dayTime}</td>
              <td>{(row as Student).numUnexcused}</td>
            </tr>
          ) : (
            <tr
              key={row.id}
              className="dataRow"
              onDoubleClick={() => navigate(`/sections/${row.section}`)}
              onClick={() => selectCheckbox(row.id)}
            >
              <CheckBox id={row.id.toString()} />
              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>{(row as Mentor).family}</td>
              <td>{row.dayTime}</td>
              <td>{(row as Mentor).numStudents}</td>
            </tr>
          )
        )}
      </table>
    </div>
  );
}

interface CheckBoxProps {
  id: string;
  onClick?: () => void;
}

function CheckBox({ id, onClick: onClick }: CheckBoxProps) {
  return (
    <td className="checkbox">
      <div className="checkbox-wrapper">
        <input className="inp-cbx" id={id + "check"} type="checkbox" onClick={onClick} />
        <label className="cbx" htmlFor={id + "check"}>
          <span>
            <svg width="12px" height="10px">
              <use xlinkHref="#check"></use>
            </svg>
          </span>
        </label>
        <svg className="inline-svg">
          <symbol id="check" viewBox="0 0 12 10">
            <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
          </symbol>
        </svg>
      </div>
    </td>
  );
}
