import React, { useState } from "react";
import { ExportType } from "./DataExportTypes";
import { ExportPage } from "./ExportPage";
import { ExportSelector } from "./ExportSelector";

export const DataExport = () => {
  const [dataExportType, setDataExportType] = useState<ExportType | null>(null);

  return (
    <div className="data-export-container">
      {dataExportType === null ? (
        <ExportSelector
          onContinue={(exportType: ExportType) => {
            setDataExportType(exportType);
          }}
        />
      ) : (
        <ExportPage dataExportType={dataExportType} onBack={() => setDataExportType(null)} />
      )}
    </div>
  );
};
