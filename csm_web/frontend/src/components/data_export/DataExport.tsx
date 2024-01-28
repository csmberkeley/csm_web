import React, { useState } from "react";
import { useProfiles } from "../../utils/queries/base";
import { Role } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
import { ExportType } from "./DataExportTypes";
import { ExportPage } from "./ExportPage";
import { ExportSelector } from "./ExportSelector";

export const DataExport = () => {
  const [dataExportType, setDataExportType] = useState<ExportType | null>(null);
  const { data: profiles, isSuccess: profilesLoaded, isError: profilesError } = useProfiles();

  if (profilesError) {
    return <b>Error loading user profiles.</b>;
  } else if (!profilesLoaded) {
    return <LoadingSpinner className="spinner-centered" />;
  } else if (profilesLoaded && !profiles.some(profile => profile.role === Role.COORDINATOR)) {
    return <b>Permission denied; you are not a coordinator for any course.</b>;
  }

  return (
    <div className="data-export-container">
      <div className="data-export-header">
        <h2 className="data-export-page-title">Export Data</h2>
      </div>
      <div className="data-export-body">
        <div className="data-export-sidebar">
          <ExportSelector
            onSelect={(exportType: ExportType) => {
              setDataExportType(exportType);
            }}
          />
        </div>
        <div className="data-export-content">
          {dataExportType === null ? (
            <div>Select export type to start.</div>
          ) : (
            <ExportPage dataExportType={dataExportType!} />
          )}
        </div>
      </div>
    </div>
  );
};
