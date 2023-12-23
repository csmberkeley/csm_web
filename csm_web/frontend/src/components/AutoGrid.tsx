import React from "react";

import "../css/base/autogrid.scss";

interface AutoColumnsProps {
  children?: React.ReactNode[];
}

/**
 * Automatically format children in balanced columns.
 */
export const AutoGrid = ({ children }: AutoColumnsProps) => {
  const gridSize = Math.ceil(Math.sqrt(children?.length ?? 0));

  if (children == null) {
    return null;
  }

  const raw_table: React.ReactNode[][] = [];
  children.forEach((item, idx) => {
    if (idx % gridSize == 0) {
      raw_table.push([item]);
    } else {
      raw_table[raw_table.length - 1].push(item);
    }
  });

  // transpose table
  const table = raw_table[0].map((_, colIndex) => raw_table.map(row => row[colIndex]));

  return (
    <div className="auto-grid-container">
      <table className="auto-grid-table">
        <tbody>
          {table.map((row, rowIdx) => (
            <tr key={rowIdx} className="auto-grid-row">
              {row.map((item, itemIdx) => (
                <td key={itemIdx} className="auto-grid-item">
                  {item}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
