import React, { useEffect, useState } from "react";
import { LeaderboardEntry, getLeaderboardData } from "../../utils/queries/cup";
import styles from "../../css/coord_interface.scss";

export default function CoordTable() {
  const [tableData, setTableData] = useState<LeaderboardEntry[]>([]);

  // On load
  useEffect(() => {
    const fetchData = async () => {
      const data = await getLeaderboardData();
      setTableData(data);
    };
    fetchData();
  }, []);

  return (
    <div className={styles}>
      <div className="cup-table">
        <table>
          <tbody>
            {tableData.length === 0 ? <div className="no-data">No data found...</div> : null}

            {tableData.map(row => (
              <tr key={row.id} className="data-row">
                <td>{row.name}</td>
                <td>{row.course}</td>
                <td>{row.mentors}</td>
                <td>{row.total_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
