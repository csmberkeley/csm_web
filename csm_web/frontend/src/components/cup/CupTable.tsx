import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import {
  LeaderboardEntry,
  ChallengeEntry,
  getLeaderboardData,
  useAddPointsMutation,
  getFamilyChallenges,
  getChallenges
} from "../../utils/queries/cup";
import Modal from "../Modal";
import { CheckBox } from "../coord_interface/CheckBox";
import "../../css/cup.scss";

export default function CupTable(): JSX.Element {
  const {
    data: tableData = [],
    isLoading: isLeaderboardLoading,
    isError: isLeaderboardError
  } = useQuery<LeaderboardEntry[], Error>({
    queryKey: ["leaderboard"],
    queryFn: getLeaderboardData
  });

  const { data: challenges = [] } = useQuery<ChallengeEntry[], Error>({
    queryKey: ["challenges"],
    queryFn: getChallenges
  });

  const [courseFilter, setCourseFilter] = useState<string>("All");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedChallenge, setSelectedChallenge] = useState<string>("");
  const [pointsToAdd, setPointsToAdd] = useState<number>(0);

  // History State
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [historyData, setHistoryData] = useState<ChallengeEntry[]>([]);
  const [selectedFamilyName, setSelectedFamilyName] = useState<string>("");

  const addPointsMutation = useAddPointsMutation();

  const courses: string[] = ["All", ...Array.from(new Set(tableData.map((d: LeaderboardEntry) => d.course)))];

  const displayedData: LeaderboardEntry[] = useMemo(() => {
    if (courseFilter === "All") return tableData;
    return tableData.filter((d: LeaderboardEntry) => d.course === courseFilter);
  }, [tableData, courseFilter]);

  const isAllSelected = displayedData.length > 0 && selectedIds.size === displayedData.length;

  useEffect(() => {
    setSelectedIds(new Set());
  }, [courseFilter]);

  function toggleRowSelection(id: number): void {
    setSelectedIds((prev: Set<number>) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function toggleAllCheckboxes(): void {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const allDisplayedIds = displayedData.map(d => d.id);
      setSelectedIds(new Set(allDisplayedIds));
    }
  }

  function handleChallengeSelect(e: React.ChangeEvent<HTMLSelectElement>): void {
    const challengeId = e.target.value;
    setSelectedChallenge(challengeId);

    const selected = challenges.find((c: ChallengeEntry) => c.id.toString() === challengeId);
    if (selected) {
      setPointsToAdd(selected.maxPoints);
    }
  }

  function handleAddPoints(): void {
    if (pointsToAdd <= 0) {
      alert("Points must be greater than zero.");
      return;
    }

    if (selectedIds.size === 0) {
      alert("Please select at least one family.");
      return;
    }

    addPointsMutation.mutate(
      {
        challenge: selectedChallenge,
        points: pointsToAdd,
        family_ids: Array.from(selectedIds)
      },
      {
        onSuccess: () => {
          setIsModalOpen(false);
          setSelectedIds(new Set());
          setSelectedChallenge("");
          setPointsToAdd(0);
        }
      }
    );
  }

  async function handleRowClick(familyId: number, familyName: string): Promise<void> {
    try {
      const data: ChallengeEntry[] = await getFamilyChallenges(familyId);
      setHistoryData(data);
      setSelectedFamilyName(familyName);
      setHistoryModalOpen(true);
    } catch (error) {
      console.error(error);
    }
  }

  function getRankIcon(index: number): JSX.Element {
    if (index === 0) return <span className="rank-icon rank-first">🏆</span>;
    if (index === 1) return <span className="rank-icon rank-second">🥈</span>;
    if (index === 2) return <span className="rank-icon rank-third">🥉</span>;
    return <span className="rank-icon rank-none"></span>;
  }

  function parseMentors(mentorsData: string | string[]): string[] {
    if (Array.isArray(mentorsData)) return mentorsData;
    if (typeof mentorsData === "string") {
      return mentorsData
        .split(/\r?\n|,/)
        .map(m => m.trim())
        .filter(Boolean);
    }
    return [];
  }

  if (isLeaderboardLoading) return <div>Loading leaderboard...</div>;
  if (isLeaderboardError) return <div>Error loading leaderboard.</div>;

  return (
    <div className="cup-table-wrapper">
      <div className="cup-table coord-table">
        <div className="table-header">
          <h2>All Courses Families</h2>

          <div className="table-actions">
            <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="filter-select">
              {courses.map(c => (
                <option key={c} value={c}>
                  {c === "All" ? "All Courses" : c}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsModalOpen(true)}
              disabled={selectedIds.size === 0}
              className={`add-points-btn ${selectedIds.size > 0 ? "active" : "disabled"}`}
            >
              + Add Points
            </button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <CheckBox id="checkall" checked={isAllSelected} onChange={toggleAllCheckboxes} />
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

            {displayedData.map((row: LeaderboardEntry, index: number) => {
              const mentorsList = parseMentors(row.mentors);
              const isSelected = selectedIds.has(row.id);

              return (
                <tr
                  key={row.id}
                  className={`data-row ${isSelected ? "selected" : ""}`}
                  onClick={() => handleRowClick(row.id, row.familyName)}
                >
                  <CheckBox id={row.id.toString()} checked={isSelected} onChange={() => toggleRowSelection(row.id)} />
                  <td className="col-rank">
                    {getRankIcon(index)} #{index + 1}
                  </td>
                  <td className="col-family">{row.familyName}</td>
                  <td className="col-course">
                    <span className="course-badge">{row.course}</span>
                  </td>
                  <td className="col-mentors">
                    <div className="mentors-grid">
                      {mentorsList.map((mentor: string, i: number) => (
                        <div key={i} className="mentor-name">
                          {mentor}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="col-points">{row.totalPoints}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <Modal closeModal={() => setIsModalOpen(false)}>
          <div className="modal-content">
            <h3>
              Add Points to {selectedIds.size} {selectedIds.size === 1 ? "Family" : "Families"}
            </h3>

            <div className="form-container">
              <label className="form-group">
                Select Challenge:
                <select value={selectedChallenge} onChange={handleChallengeSelect} className="modal-input">
                  <option value="" disabled>
                    -- Select a Challenge --
                  </option>
                  {challenges.map((challenge: ChallengeEntry) => (
                    <option key={challenge.id} value={challenge.id.toString()}>
                      {challenge.name} ({challenge.points} pts)
                    </option>
                  ))}
                  <option value="Custom">Custom / Other</option>
                </select>
              </label>

              <label className="form-group">
                Points Amount:
                <input
                  type="number"
                  value={pointsToAdd}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPointsToAdd(Number(e.target.value))}
                  placeholder="e.g. 50"
                  className="modal-input"
                />
              </label>

              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button
                  className={`btn-submit ${
                    !selectedChallenge || pointsToAdd === 0 || addPointsMutation.isLoading ? "disabled" : ""
                  }`}
                  onClick={handleAddPoints}
                  disabled={!selectedChallenge || pointsToAdd === 0 || addPointsMutation.isLoading}
                >
                  {addPointsMutation.isLoading ? "Submitting..." : "Submit Points"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {historyModalOpen && (
        <Modal closeModal={() => setHistoryModalOpen(false)}>
          <div className="modal-content history-content">
            <h3>
              <span className="history-icon">🕒</span> Point History: {selectedFamilyName}
            </h3>

            {historyData.length === 0 ? (
              <p>No points received yet.</p>
            ) : (
              <ul className="history-list">
                {historyData.map((item: ChallengeEntry, i: number) => (
                  <li key={i} className="history-item">
                    <div className="history-header">
                      <span className="history-title">
                        {item.name}
                        <span className="history-dates">
                          {item.start_date} to {item.end_date}
                        </span>
                      </span>
                      <span className="history-points">+{item.points}</span>
                    </div>
                    {item.description && <div className="history-description">{item.description}</div>}
                  </li>
                ))}
              </ul>
            )}

            <div className="modal-actions">
              <button className="btn-close" onClick={() => setHistoryModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
