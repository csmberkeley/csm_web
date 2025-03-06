import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { Mentor, Student, getCoordData } from "../../utils/queries/coord";
import { SearchBar } from "../SearchBar";
import { CheckBox } from "./CheckBox";
import styles from "../../css/coord_interface.scss";
// import DropBox from "./DropBox";

export default function CoordTable() {
  const [tableData, setTableData] = useState<Mentor[] | Student[]>([]);
  const [searchData, setSearch] = useState<Mentor[] | Student[]>([]);
  const [selectedData, setSelected] = useState<Mentor[] | Student[]>([]);
  const params = useParams();
  const courseId = Number(params.id);
  const { pathname } = useLocation();
  const isStudents = pathname.includes("students");
  let selected = false;

  useEffect(() => {
    const fetchData = async () => {
      const data = await getCoordData(courseId, isStudents);
      setTableData(data);
      setSearch(data);
    };
    fetchData();
  }, []);

  const navigate = useNavigate();

  function selectCheckbox(id: number) {
    const checkbox = document.getElementById(id + "check") as HTMLInputElement;
    checkbox.checked = !checkbox.checked;
    if (checkbox.checked) {
      const selectedRow = searchData.find(row => row.id === id);
      if (selectedRow) {
        setSelected([...selectedData, selectedRow] as Mentor[] | Student[]);
      }
    } else {
      setSelected(selectedData.filter(row => row.id !== id) as Mentor[] | Student[]);
    }
  }
  function toggleAllCheckboxes() {
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
    setSelected(searchData);
  }
  function deselectAllCheckboxes() {
    const checkboxes = document.querySelectorAll("input[type=checkbox]");
    checkboxes.forEach(checkbox => {
      (checkbox as HTMLInputElement).checked = false;
    });
    setSelected([]);
  }

  function filterSearch(event: React.ChangeEvent<HTMLInputElement>) {
    const search = event.target.value.toLowerCase();
    if (search.length === 0) {
      setSearch(tableData);
      return;
    }
    const filteredData = tableData.filter(row => {
      return row.name.toLowerCase().includes(search) || row.email.toLowerCase().includes(search);
    });
    const filteredSelectData = selectedData.filter(row => {
      return row.name.toLowerCase().includes(search) || row.email.toLowerCase().includes(search);
    });

    setSearch(filteredData as Mentor[] | Student[]);
    setSelected(filteredSelectData as Mentor[] | Student[]);
  }

  function getSelectedData() {
    console.log(selectedData);
    return selectedData;
  }

  return (
    <div className={styles}>
      <SearchBar onChange={filterSearch} />
      <div id="table-buttons">
        <button onClick={getSelectedData}>Select All</button>
        {/* <DropBox click={getSelectedData}/>
        <DropBox />
        <DropBox /> */}
      </div>
      <table>
        <thead>
          <tr>
            <CheckBox id="check" onClick={toggleAllCheckboxes} />
            <th>Name</th>
            <th>Email</th>
            {isStudents ? (
              <>
                <th>Mentor Name</th>
                <th>Time</th>
                <th>Unexcused Absenses</th>
              </>
            ) : (
              <>
                <th>Family</th>
                <th>Time</th>
                <th>Section Size</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {searchData.map(row => (
            <tr
              key={row.id}
              className="data-row"
              onDoubleClick={() => navigate(`/sections/${row.section}`)}
              onClick={() => selectCheckbox(row.id)}
            >
              <CheckBox id={row.id.toString()} />
              {isStudents ? (
                <>
                  <td>{row.name}</td>
                  <td>{row.email}</td>
                  <td>{(row as Student).mentorName}</td>
                  <td>{row.dayTime}</td>
                  <td>{(row as Student).numUnexcused}</td>
                </>
              ) : (
                <>
                  <td>{row.name}</td>
                  <td>{row.email}</td>
                  <td>{(row as Mentor).family}</td>
                  <td>{row.dayTime}</td>
                  <td>{(row as Mentor).numStudents}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
