import React, { useEffect, useState } from "react";
import { LeaderboardEntry, getLeaderboardData } from "../../utils/queries/cup";
import Modal from "../Modal";
import { CheckBox } from "../coord_interface/CheckBox";
import styles from "../../css/coord_interface.scss";

export default function CupTable() {
  const [tableData, setTableData] = useState<LeaderboardEntry[]>([]);
  const [displayedData, setDisplayedData] = useState<LeaderboardEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState("");
  const [pointsToAdd, setPointsToAdd] = useState<number>(0);

  // Filtering State
  const [courseFilter, setCourseFilter] = useState("All");

  // Derive unique courses from fetched data
  const courses = ["All", ...Array.from(new Set(tableData.map(d => d.course)))];

  // On load
  useEffect(() => {
    const fetchData = async () => {
      const data = await getLeaderboardData();
      setTableData(data);
      setDisplayedData(data);
    };
    fetchData();
  }, []);

  // Handle Dropdown Filtering
  useEffect(() => {
    if (courseFilter === "All") {
      setDisplayedData(tableData);
    } else {
      setDisplayedData(tableData.filter(d => d.course === courseFilter));
    }
  }, [courseFilter, tableData]);

  // Mimics the selection behavior to support the uncontrolled CheckBox.tsx
  function selectCheckbox(id: number) {
    const checkbox = document.getElementById(id + "check") as HTMLInputElement;
    if (!checkbox) return;

    checkbox.checked = !checkbox.checked;

    const newSet = new Set(selectedIds);
    if (checkbox.checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  }

  // Toggle all checkboxes in the view
  function toggleAllCheckboxes() {
    const allSelected = selectedIds.size === displayedData.length && displayedData.length > 0;
    const checkboxes = document.querySelectorAll<HTMLInputElement>(".cup-table input[type=checkbox]");
    const newSet = new Set<number>();

    checkboxes.forEach(checkbox => {
      checkbox.checked = !allSelected;
    });

    if (!allSelected) {
      displayedData.forEach(d => newSet.add(d.id));
    }
    setSelectedIds(newSet);
  }

  // Handle adding points submission
  function handleAddPoints() {
    console.log(`Adding ${pointsToAdd} points for ${selectedChallenge} to families:`, Array.from(selectedIds));
    setIsModalOpen(false);

    const checkboxes = document.querySelectorAll<HTMLInputElement>(".cup-table input[type=checkbox]");
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    setSelectedIds(new Set());
    setSelectedChallenge("");
    setPointsToAdd(0);
  }

  // Helper for Rank column aesthetics
  function getRankIcon(index: number) {
    if (index === 0) return <span style={{ marginRight: "8px" }}>🏆</span>;
    if (index === 1) return <span style={{ marginRight: "8px", color: "#C0C0C0" }}>🥈</span>;
    if (index === 2) return <span style={{ marginRight: "8px", color: "#CD7F32" }}>🥉</span>;
    return <span style={{ display: "inline-block", width: "24px" }}></span>;
  }

  // Helper to parse the mentors data into an array for the grid layout
  function parseMentors(mentorsData: string | string[]): string[] {
    if (Array.isArray(mentorsData)) return mentorsData;
    if (typeof mentorsData === "string") {
      // Splits by newline or comma, trims whitespace, and removes empty strings
      return mentorsData
        .split(/\r?\n|,/)
        .map(m => m.trim())
        .filter(Boolean);
    }
    return [];
  }

  return (
    <div className={styles}>
      <div className="cup-table coord-table">
        {/* Header Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0" }}>
          <h2 style={{ fontSize: "1.25rem", color: "#333", margin: 0, fontWeight: 600 }}>All Courses Families</h2>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <select
              value={courseFilter}
              onChange={e => setCourseFilter(e.target.value)}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #eee",
                backgroundColor: "#f9f9f9",
                fontFamily: "inherit",
                cursor: "pointer"
              }}
            >
              {courses.map(c => (
                <option key={c} value={c}>
                  {c === "All" ? "All Courses" : c}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsModalOpen(true)}
              disabled={selectedIds.size === 0}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: selectedIds.size > 0 ? "#050505" : "#ccc",
                color: "#fff",
                fontWeight: 600,
                cursor: selectedIds.size > 0 ? "pointer" : "not-allowed",
                transition: "background-color 0.2s"
              }}
            >
              + Add Points
            </button>
          </div>
        </div>

        {/* Table structure */}
        <table>
          <thead>
            <tr>
              <CheckBox id="checkall" onClick={toggleAllCheckboxes} />
              <th>Rank</th>
              <th>Family</th>
              <th>Course</th>
              <th>Mentors</th>
              <th>Total Points</th>
            </tr>
          </thead>
          <tbody>
            {displayedData.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="no-data">No data found...</div>
                </td>
              </tr>
            ) : null}

            {displayedData.map((row, index) => {
              const mentorsList = parseMentors(row.mentors);

              return (
                <tr key={row.id} className="data-row" onClick={() => selectCheckbox(row.id)}>
                  <CheckBox
                    id={row.id.toString()}
                    onClick={(e: React.MouseEvent<HTMLInputElement>) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  />
                  <td style={{ fontWeight: 600, verticalAlign: "middle" }}>
                    {getRankIcon(index)} #{index + 1}
                  </td>
                  <td style={{ verticalAlign: "middle" }}>{row.familyName}</td>
                  <td style={{ verticalAlign: "middle" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        backgroundColor: "#f3f4f6",
                        borderRadius: "12px",
                        fontSize: "0.85rem",
                        fontWeight: 500
                      }}
                    >
                      {row.course}
                    </span>
                  </td>

                  {/* Two-Column CSS Grid for Mentors */}
                  <td style={{ minWidth: "350px", verticalAlign: "middle" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr", // Forces exactly two equal columns
                        columnGap: "16px", // Consistent horizontal spacing
                        rowGap: "6px", // Consistent vertical spacing
                        alignItems: "start"
                      }}
                    >
                      {mentorsList.map((mentor, i) => (
                        <div key={i} style={{ fontSize: "0.95rem", color: "#444" }}>
                          {mentor}
                        </div>
                      ))}
                    </div>
                  </td>

                  <td style={{ fontWeight: 600, verticalAlign: "middle" }}>{row.totalPoints}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Points Modal */}
      {isModalOpen && (
        <Modal closeModal={() => setIsModalOpen(false)}>
          <div style={{ padding: "10px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "1.25rem" }}>
              Add Points to {selectedIds.size} {selectedIds.size === 1 ? "Family" : "Families"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontWeight: 500 }}>
                Select Challenge:
                <select
                  value={selectedChallenge}
                  onChange={e => setSelectedChallenge(e.target.value)}
                  style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontFamily: "inherit" }}
                >
                  <option value="" disabled>
                    -- Select a Challenge --
                  </option>
                  <option value="Attendance">Attendance (10 pts)</option>
                  <option value="Event_Participation">Event Participation (20 pts)</option>
                  <option value="Teaching_Eval">Excellent Teaching Eval (50 pts)</option>
                  <option value="Custom">Custom / Other</option>
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontWeight: 500 }}>
                Points Amount:
                <input
                  type="number"
                  value={pointsToAdd}
                  onChange={e => setPointsToAdd(Number(e.target.value))}
                  placeholder="e.g. 50"
                  style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontFamily: "inherit" }}
                />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "10px" }}>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 500
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPoints}
                  disabled={!selectedChallenge || pointsToAdd === 0}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: !selectedChallenge || pointsToAdd === 0 ? "#ccc" : "#000",
                    color: "#fff",
                    cursor: !selectedChallenge || pointsToAdd === 0 ? "not-allowed" : "pointer",
                    fontWeight: 500
                  }}
                >
                  Submit Points
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
