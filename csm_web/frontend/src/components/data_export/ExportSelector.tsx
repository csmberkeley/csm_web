import React, { useState } from "react";

import { ExportType, EXPORT_TYPE_DATA } from "./DataExportTypes";

import "../../css/data-export.scss";

interface ExportSelectorProps {
  onSelect: (exportType: ExportType) => void;
}

/**
 * Component for selecting the courses to include in the export,
 * along with the export data config selection.
 */
export const ExportSelector = ({ onSelect }: ExportSelectorProps) => {
  const [dataExportType, setDataExportType] = useState<ExportType | null>(null);

  const handleSelect = (exportType: ExportType) => {
    onSelect(exportType);
    setDataExportType(exportType);
  };

  return (
    <div className="export-selector-container">
      <div className="export-selector-data-type-options">
        {Array.from(EXPORT_TYPE_DATA.entries())
          .sort()
          .map(([exportType, description]) => (
            <div
              key={exportType}
              className={`export-selector-data-type-label ${dataExportType === exportType ? "active" : ""}`}
              onClick={() => handleSelect(exportType)}
            >
              {description}
            </div>
          ))}
      </div>
    </div>
  );
};
