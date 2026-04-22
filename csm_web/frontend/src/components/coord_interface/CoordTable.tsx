import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { Mentor, Student, getCoordData } from "../../utils/queries/coord";
import ActionButton from "./ActionButton";
import { CheckBox } from "./CheckBox";
import DropBox from "./DropBox";
import { SearchBar } from "./SearchBar";
import styles from "../../css/coord_interface.scss";

export default function CoordTable() {
  const [tableData, setTableData] = useState<(Mentor | Student)[]>([]);
  const [searchData, setSearchData] = useState<(Mentor | Student)[]>([]);
  const [selectedData, setSelectedData] = useState<(Mentor | Student)[]>([]);

  const params = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const courseId = Number(params.id);
  const isStudents = pathname.includes("students");
  const [currentFilter, setCurrentFilter] = useState<HTMLButtonElement | null>(null);

  const sectionSizes = !isStudents
    ? [...new Set(tableData.map(item => (item as Mentor).numStudents?.toString()))].sort()
    : [];
  const familyNames = !isStudents ? [...new Set(tableData.map(item => (item as Mentor).family))].sort() : [];

  useEffect(() => {
    const fetchData = async () => {
      const data = await getCoordData(courseId, isStudents);
      setTableData(data);
      setSearchData(data);
    };
    fetchData();
  }, [pathname, courseId, isStudents]);

  function reset() {
    setTableData([]);
    setSearchData([]);
    setSelectedData([]);
    const searchFilter = document.getElementById("search-filter") as HTMLInputElement;
    if (searchFilter) {
      searchFilter.innerText = "";
      searchFilter.value = "";
    }
    currentFilter?.classList.remove("using-filter");
  }

  function update(filteredData: (Mentor | Student)[], filteredSelectData: (Mentor | Student)[]) {
    setSearchData(filteredData);
    setSelectedData(filteredSelectData);
  }

  function toggleRowSelection(row: Mentor | Student) {
    const isSelected = selectedData.some(r => r.id === row.id);
    if (isSelected) {
      setSelectedData(selectedData.filter(r => r.id !== row.id));
    } else {
      setSelectedData([...selectedData, row]);
    }
  }

  function toggleAllCheckboxes() {
    const isAllSelected = searchData.length > 0 && selectedData.length === searchData.length;
    if (isAllSelected) {
      setSelectedData([]);
    } else {
      setSelectedData([...searchData]);
    }
  }

  function filterSearch(event: React.ChangeEvent<HTMLInputElement>) {
    const search = event.target.value.toLowerCase();
    if (search.length === 0) {
      update(tableData, selectedData);
      return;
    }
    const filteredData = tableData.filter(
      row => row.name.toLowerCase().includes(search) || row.email.toLowerCase().includes(search)
    );
    const filteredSelectedData = selectedData.filter(
      row => row.name.toLowerCase().includes(search) || row.email.toLowerCase().includes(search)
    );

    if (currentFilter != null) {
      currentFilter.classList.remove("using-filter");
    }
    update(filteredData, filteredSelectedData);
  }

  function filterString(event: React.MouseEvent<HTMLButtonElement, MouseEvent>, field: string) {
    const filter = (event.target as HTMLButtonElement).innerText;

    const filterLogic = (row: Mentor | Student) => {
      const rowData = row as unknown as Record<string, string | number | undefined>;
      if (field in rowData) {
        const value = rowData[field];
        if (filter.includes("+")) return value != null ? value.toString() >= filter.slice(0, -1) : false;
        return value != null ? value.toString().includes(filter) : false;
      }
      return false;
    };

    checkFilter(event);
    update(tableData.filter(filterLogic), selectedData.filter(filterLogic));
  }

  function checkFilter(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    const mainButton = (event.target as HTMLButtonElement).parentElement?.previousElementSibling as HTMLButtonElement;
    if (currentFilter != null && currentFilter !== mainButton) {
      currentFilter.classList.remove("using-filter");
    }
    mainButton.classList.add("using-filter");
    setCurrentFilter(mainButton);
    const searchFilter = document.getElementById("search-filter") as HTMLInputElement;
    if (searchFilter) searchFilter.value = "";
  }

  function resetFilters(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    const resetButton = event.target as HTMLButtonElement;
    if (currentFilter != null && currentFilter !== resetButton) return;
    update(tableData, selectedData);
    resetButton.classList.remove("using-filter");
    setCurrentFilter(null);
  }

  function copyEmail() {
    const emails = selectedData.map(user => user.email).join(", ");
    const defaultCopy = document.getElementById("default-copy") as HTMLDivElement;
    const successCopy = document.getElementById("success-copy") as HTMLDivElement;

    defaultCopy.classList.add("hidden");
    successCopy.classList.remove("hidden");

    setTimeout(() => {
      defaultCopy.classList.remove("hidden");
      successCopy.classList.add("hidden");
    }, 2000);

    navigator.clipboard.writeText(emails);
  }

  const isAllSelected = searchData.length > 0 && selectedData.length === searchData.length;

  return (
    <div className={styles}>
      <div className="coord-table">
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
          />
          {isStudents ? (
            <DropBox
              items={["0", "1", "2", "3+"]}
              name={"Absences"}
              field={"numUnexcused"}
              func={filterString}
              reset={resetFilters}
            />
          ) : (
            <>
              <DropBox items={familyNames} name={"Family"} field={"family"} func={filterString} reset={resetFilters} />
              <DropBox
                items={sectionSizes}
                name={"Section Size"}
                field={"numStudents"}
                func={filterString}
                reset={resetFilters}
              />
            </>
          )}
        </div>

        <div id="table-header">
          <div className="title">{isStudents ? "Students List" : "Mentors List"}</div>
          <ActionButton copyEmail={copyEmail} reset={reset} />
        </div>

        <table>
          <thead>
            <tr>
              <CheckBox id="checkall" checked={isAllSelected} onChange={toggleAllCheckboxes} />
              <th>Name</th>
              <th>Email</th>
              {isStudents ? (
                <>
                  <th>Mentor Name</th>
                  <th>Time</th>
                  <th>Unexcused Absences</th>
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

            {searchData.map(row => {
              const isSelected = selectedData.some(r => r.id === row.id);

              return (
                <tr
                  key={row.id}
                  className={`data-row ${isSelected ? "selected" : ""}`}
                  onDoubleClick={() => navigate(`/sections/${row.section}`)}
                  onClick={() => toggleRowSelection(row)}
                >
                  <CheckBox id={row.id.toString()} checked={isSelected} onChange={() => toggleRowSelection(row)} />
                  <td>{row.name}</td>
                  <td>{row.email}</td>
                  {isStudents ? (
                    <>
                      <td>{(row as Student).mentorName}</td>
                      <td>{row.dayTime}</td>
                      <td>{(row as Student).numUnexcused}</td>
                    </>
                  ) : (
                    <>
                      <td>{(row as Mentor).family}</td>
                      <td>{row.dayTime}</td>
                      <td>{(row as Mentor).numStudents}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
