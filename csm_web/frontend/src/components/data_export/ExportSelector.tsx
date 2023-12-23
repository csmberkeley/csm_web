import React, { useState } from "react";

import { ExportType, EXPORT_TYPE_DATA } from "./DataExportTypes";

import "../../css/data-export.scss";

interface ExportSelectorProps {
  onContinue: (exportType: ExportType) => void;
}

/**
 * Component for selecting the courses to include in the export,
 * along with the export data config selection.
 */
export const ExportSelector = ({ onContinue }: ExportSelectorProps) => {
  const [dataExportType, setDataExportType] = useState<ExportType>(ExportType.ATTENDANCE_DATA);

  const handleContinue = () => {
    onContinue(dataExportType);
  };

  return (
    <div className="export-selector-container">
      <div className="export-selector-section">
        <h3 className="page-title center-title">Select Export Data</h3>
        <div className="export-selector-data-type-container">
          <div className="export-selector-data-type-options">
            {Array.from(EXPORT_TYPE_DATA.entries())
              .sort()
              .map(([exportType, description]) => (
                <label key={exportType} className="export-selector-data-type-label">
                  <input
                    className="export-selector-data-type-input"
                    name="export-data-type"
                    type="radio"
                    checked={dataExportType === exportType}
                    onChange={() => setDataExportType(exportType)}
                  />
                  {description}
                </label>
              ))}
          </div>
        </div>
      </div>
      <div className="export-selector-footer">
        <div className="primary-btn" onClick={handleContinue}>
          Continue
        </div>
      </div>
    </div>
  );
};
