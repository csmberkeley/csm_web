import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { Mentor, Student, getCoordData } from "../../utils/queries/coord";
import ActionButton from "./ActionButton";
import { CheckBox } from "./CheckBox";
import DropBox from "./DropBox";
import { SearchBar } from "./SearchBar";
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
  const [currentFilter, setCurrentFilter] = useState<HTMLButtonElement | null>(null);
  const sectionSizes = !isStudents
    ? [...new Set(tableData.map(item => (item as Mentor).numStudents?.toString()))].sort()
    : []; // Unique section sizes for mentors
  const familyNames = !isStudents ? [...new Set(tableData.map(item => (item as Mentor).family))].sort() : []; // Unique family names for mentors

  // On load
  useEffect(() => {
    const fetchData = async () => {
      const data = await getCoordData(courseId, isStudents);
      setTableData(data);
      setSearch(data);
    };
    fetchData();
  }, [pathname]);
  const navigate = useNavigate();

  function reset() {
    setTableData([]);
    setSearch([]);
    setSelected([]);
    setAllSelected(false);
    const checkbox = document.getElementById("checkcheck") as HTMLInputElement;
    checkbox.checked = false;
    const searchFilter = document.getElementById("search-filter") as HTMLInputElement;
    searchFilter.innerText = "";
    searchFilter.value = "";
    currentFilter?.classList.remove("using-filter");
  }

  // Update function for search and selected data
  function update(filteredData: (Mentor | Student)[], filteredSelectData: (Mentor | Student)[]) {
    setSearch(filteredData as Mentor[] | Student[]);
    setSelected(filteredSelectData as Mentor[] | Student[]);
    setAllSelected(false);
    const checkbox = document.getElementById("checkcheck") as HTMLInputElement;
    checkbox.checked = false;
  }

  // Select specific checkbox
  function selectCheckbox(id: number) {
    const checkbox = document.getElementById(id + "check") as HTMLInputElement;
    checkbox.checked = !checkbox.checked;
    if (checkbox.checked) {
      console.log("Checkbox checked");
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
      update(tableData, [] as Mentor[] | Student[]);
      return;
    }
    const filteredData = tableData.filter(row => {
      return row.name.toLowerCase().includes(search) || row.email.toLowerCase().includes(search);
    });
    const filteredSelectedData = selectedData.filter(row => {
      return row.name.toLowerCase().includes(search) || row.email.toLowerCase().includes(search);
    });

    if (currentFilter != null) {
      currentFilter.classList.remove("using-filter");
    }
    update(filteredData, filteredSelectedData);
  }

  // Filter string
  function filterString(event: React.MouseEvent<HTMLButtonElement, MouseEvent>, field: keyof Mentor | keyof Student) {
    const filter = (event.target as HTMLButtonElement).innerText;
    let filteredData: (Student | Mentor)[] = [];
    let filteredSelectedData: (Student | Mentor)[] = [];

    filteredData = tableData.filter(row => {
      if (field in row) {
        const value = row[field as keyof typeof row];
        if (filter.includes("+")) {
          return value != null ? value.toString() >= filter.slice(0, -1) : false;
        }
        return value != null ? value.toString().includes(filter) : false;
      }
      return false;
    });
    filteredSelectedData = selectedData.filter(row => {
      if (field in row) {
        const value = row[field as keyof typeof row];
        if (filter.includes("+")) {
          return value != null ? value.toString() >= filter.slice(0, -1) : false;
        }
        return value != null ? value.toString().includes(filter) : false;
      }
      return false;
    });

    checkFilter(event);
    update(filteredData, filteredSelectedData);
  }

  // Check filter
  function checkFilter(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    const mainButton = (event.target as HTMLButtonElement).parentElement?.previousElementSibling as HTMLButtonElement;
    if (currentFilter != null && currentFilter != mainButton) {
      currentFilter.classList.remove("using-filter");
    }
    mainButton.classList.add("using-filter");
    setCurrentFilter(mainButton);
    const searchFilter = document.getElementById("search-filter") as HTMLInputElement;
    if (searchFilter) {
      searchFilter.value = "";
    }
  }

  // Reset filters
  function resetFilters(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    const resetButton = event.target as HTMLButtonElement;
    if (currentFilter != null && currentFilter != resetButton) {
      return;
    }
    update(tableData, [] as Mentor[] | Student[]);
    resetButton.classList.remove("using-filter");
    setCurrentFilter(null);
  }

  // Function for Copy Email
  function copyEmail() {
    const selected: string[] = [];
    selectedData.forEach(userSelected => {
      selected.push(userSelected["email"]);
    });

    const defaultCopy = document.getElementById("default-copy") as HTMLDivElement;
    const successCopy = document.getElementById("success-copy") as HTMLDivElement;

    defaultCopy.classList.add("hidden");
    successCopy.classList.remove("hidden");

    // reset to default state
    setTimeout(() => {
      defaultCopy.classList.remove("hidden");
      successCopy.classList.add("hidden");
    }, 2000);

    navigator.clipboard.writeText(selected.join(", "));
  }

  // Debugging Function for seeing selected data
  // function getSelectedData() {
  //   console.log(selectedData);
  //   return selectedData;
  // }

  return (
    <div className={styles}>
      <div className="search-container">
        <SearchBar onChange={filterSearch} />
      </div>
      <div id="table-buttons">
        <DropBox
          items={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
          name={"Day"}
          field={"dayTime"}
          func={filterString}
          reset={resetFilters}
        ></DropBox>
        {isStudents ? (
          <DropBox
            items={["0", "1", "2", "3+"]}
            name={"Absences"}
            field={"numUnexcused"}
            func={filterString}
            reset={resetFilters}
          ></DropBox>
        ) : (
          <>
            <DropBox
              items={familyNames}
              name={"Family"}
              field={"family"}
              func={filterString}
              reset={resetFilters}
            ></DropBox>
            <DropBox
              items={sectionSizes}
              name={"Section Size"}
              field={"numStudents"}
              func={filterString}
              reset={resetFilters}
            ></DropBox>
          </>
        )}
      </div>

      <div id="table-header">
        {isStudents ? <div className="title">Students List</div> : <div className="title">Mentors List</div>}
        <ActionButton copyEmail={copyEmail} drop={copyEmail} reset={reset} />
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
          {searchData.length === 0 ? <div className="no-data">No data found...</div> : null}

          {searchData.map(row => (
            <tr
              key={row.id}
              className="data-row"
              onDoubleClick={() => navigate(`/sections/${row.section}`)}
              onClick={() => selectCheckbox(row.id)}
            >
              <CheckBox
                id={row.id.toString()}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
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
