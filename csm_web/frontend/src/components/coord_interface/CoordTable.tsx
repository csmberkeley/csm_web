import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { Mentor, Student, getCoordData } from "../../utils/queries/coord";
import { SearchBar } from "../SearchBar";
import { CheckBox } from "./CheckBox";
import DropBox from "./DropBox";
import styles from "../../css/coord_interface.scss";

export default function CoordTable() {
  const [tableData, setTableData] = useState<Mentor[] | Student[]>([]);
  const [searchData, setSearch] = useState<Mentor[] | Student[]>([]);
  const [selectedData, setSelected] = useState<Mentor[] | Student[]>([]);
  const [allSelected, setAllSelected] = useState(false);
  const params = useParams();
  const courseId = Number(params.id);
  const { pathname } = useLocation();
  const isStudents = pathname.includes("students");

  // On load
  useEffect(() => {
    const fetchData = async () => {
      const data = await getCoordData(courseId, isStudents);
      setTableData(data);
      setSearch(data);
    };
    fetchData();
  }, []);
  const navigate = useNavigate();

  // Select specific checkbox
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

  // Toggle for checkboxes
  function toggleAllCheckboxes() {
    if (allSelected) {
      deselectAllCheckboxes();
    } else {
      selectAllCheckboxes();
    }
    setAllSelected(!allSelected);
  }

  // Helper for toggle
  function selectAllCheckboxes() {
    const checkboxes = document.querySelectorAll("input[type=checkbox]");
    checkboxes.forEach(checkbox => {
      (checkbox as HTMLInputElement).checked = true;
    });
    setSelected(searchData);
  }
  // Helper for toggle
  function deselectAllCheckboxes() {
    const checkboxes = document.querySelectorAll("input[type=checkbox]");
    checkboxes.forEach(checkbox => {
      (checkbox as HTMLInputElement).checked = false;
    });
    setSelected([]);
  }

  // Filter search for table
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

  // Filter string
  function filterString(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    console.log("HELLO");
    console.log(event);
    const filter = (event.target as HTMLButtonElement).innerText;
    let filteredData: Student[] = [];
    let filteredSelectedData: Student[] = [];
    filteredData = (tableData as Student[]).filter(row => {
      return row.dayTime.includes(filter);
    });
    filteredSelectedData = (tableData as Student[]).filter(row => {
      return row.dayTime.includes(filter);
    });
    setSearch(filteredData);
    setSelected(filteredSelectedData);
  }

  // FILTER FUNCTIONS -- Student

  // Filter absences
  function filterAbsences(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    const filter = (event.target as HTMLButtonElement).innerText;
    let filteredData: Student[] = [];
    let filteredSelectedData: Student[] = [];
    if (filter.includes("0")) {
      filteredData = (tableData as Student[]).filter(row => {
        return row.numUnexcused == 0;
      });
      filteredSelectedData = (tableData as Student[]).filter(row => {
        return row.numUnexcused == 0;
      });
    } else if (filter.includes("1")) {
      filteredData = (tableData as Student[]).filter(row => {
        return row.numUnexcused == 1;
      });
      filteredSelectedData = (tableData as Student[]).filter(row => {
        return row.numUnexcused == 1;
      });
    } else if (filter.includes("2")) {
      filteredData = (tableData as Student[]).filter(row => {
        return row.numUnexcused == 2;
      });
      filteredSelectedData = (tableData as Student[]).filter(row => {
        return row.numUnexcused == 2;
      });
    } else if (filter.includes("3")) {
      filteredData = (tableData as Student[]).filter(row => {
        return row.numUnexcused >= 3;
      });
      filteredSelectedData = (tableData as Student[]).filter(row => {
        return row.numUnexcused >= 3;
      });
    }
    setSearch(filteredData);
    setSelected(filteredSelectedData);
  }

  // Debugging Function for seeing selected data
  function getSelectedData() {
    console.log(selectedData);
    return selectedData;
  }

  return (
    <div className={styles}>
      <div className="search-container">
        <SearchBar onChange={filterSearch} className="search-filter" />
      </div>
      <div id="table-buttons">
        <DropBox items={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} name={"Day"} func={filterString}></DropBox>
        {isStudents ? (
          <DropBox items={["0", "1", "2", "3+"]} name={"Absences"} func={filterAbsences}></DropBox>
        ) : (
          <>
            <DropBox items={["Family 1", "Family 2", ""]} name={"Family"} func={filterString}></DropBox>
            <button onClick={getSelectedData}>
              Section Size<div></div>
            </button>
          </>
        )}
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
