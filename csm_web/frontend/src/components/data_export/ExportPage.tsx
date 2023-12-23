import React, { useEffect, useState } from "react";
import { useProfiles } from "../../utils/queries/base";
import { useDataExportMutation, useDataExportPreviewMutation } from "../../utils/queries/export";
import { Role } from "../../utils/types";
import { AutoGrid } from "../AutoGrid";
import LoadingSpinner from "../LoadingSpinner";
import { ExportType, EXPORT_COLUMNS } from "./DataExportTypes";

import RefreshIcon from "../../../static/frontend/img/refresh.svg";

interface ExportPageProps {
  dataExportType: ExportType;
  onBack: () => void;
}

export const ExportPage = ({ dataExportType, onBack }: ExportPageProps) => {
  const { data: profiles, isSuccess: profilesLoaded, isError: profilesError } = useProfiles();
  const [includedCourses, setIncludedCourses] = useState<number[]>([]);
  const [includedFields, setIncludedFields] = useState<string[]>(
    Array.from(Object.keys(EXPORT_COLUMNS[dataExportType].optional))
  );

  const dataExportMutation = useDataExportMutation();

  useEffect(() => {
    if (profiles != null && profilesLoaded) {
      const coordinatorProfiles = profiles.filter(profile => profile.role === Role.COORDINATOR);
      setIncludedCourses(coordinatorProfiles.map(profile => profile.courseId));
    }
  }, [profilesLoaded, profiles]);

  if (profilesError) {
    return <h3>Profiles not found</h3>;
  } else if (!profilesLoaded) {
    return <LoadingSpinner className="spinner-centered" />;
  }

  const coordinatorProfiles = profiles.filter(profile => profile.role === Role.COORDINATOR);

  const courseSelection = (
    <div className="export-page-section">
      <h4 className="export-page-sidebar-title center-title">Select Courses</h4>
      <div className="export-page-sidebar-container">
        <AutoGrid>
          {coordinatorProfiles
            .sort((profileA, profileB) => profileA.course.localeCompare(profileB.course))
            .map(profile => (
              <label key={profile.id} className="export-page-input-label">
                <input
                  className="export-page-input form-checkbox"
                  name="export-courses"
                  type="checkbox"
                  checked={includedCourses.includes(profile.courseId)}
                  onChange={() => {
                    if (includedCourses.includes(profile.courseId)) {
                      setIncludedCourses([...includedCourses].filter(id => profile.courseId !== id));
                    } else {
                      setIncludedCourses([...includedCourses, profile.courseId]);
                    }
                  }}
                />
                {profile.course}
              </label>
            ))}
        </AutoGrid>
      </div>
    </div>
  );

  const columnFields = EXPORT_COLUMNS[dataExportType];
  const requiredInputs = Object.entries(columnFields.required).map(([key, description]) => ({
    key,
    description,
    disabled: true
  }));
  const optionalInputs = Object.entries(columnFields.optional).map(([key, description]) => ({
    key,
    description,
    disabled: false
  }));
  const columnInputs = requiredInputs.concat(optionalInputs).map(({ key, description, disabled }) => (
    <label key={key} className="export-page-input-label">
      <input
        className="export-page-input"
        name="export-attributes"
        type="checkbox"
        checked={disabled || includedFields.includes(key)}
        disabled={disabled}
        onChange={() => {
          if (includedFields.includes(key)) {
            setIncludedFields([...includedFields].filter(curKey => curKey !== key));
          } else {
            setIncludedFields([...includedFields, key]);
          }
        }}
      />
      {description}
    </label>
  ));

  const columnSelection = (
    <div className="export-selector-section">
      <h4 className="export-page-sidebar-title center-title">Select Fields</h4>
      <div className="export-page-sidebar-container">
        <AutoGrid>{columnInputs}</AutoGrid>
      </div>
    </div>
  );

  /**
   * Download the data; open a new page with the data
   */
  const downloadData = () => {
    dataExportMutation.mutate({
      courses: includedCourses,
      fields: includedFields,
      type: dataExportType
    });
  };

  return (
    <div className="export-page-container">
      <div className="export-page-header">
        <h3 className="page-title">Export Data</h3>
        <button className="secondary-btn" onClick={onBack}>
          Back
        </button>
      </div>
      <div className="export-page-config">
        <div className="export-page-sidebar sidebar-left">{courseSelection}</div>
        <div className="export-page-sidebar sidebar-right">{columnSelection}</div>
      </div>
      <ExportPagePreview courses={includedCourses} fields={includedFields} exportType={dataExportType} preview={3} />
      <div className="export-page-footer">
        <button className="primary-btn" onClick={downloadData}>
          Download Data
        </button>
      </div>
    </div>
  );
};

const PREVIEW_OPTIONS = [5, 10, 25, 50];

interface ExportPagePreviewProps {
  courses: number[];
  fields: string[];
  exportType: ExportType;
  preview: number;
}

/**
 * Preview of the exported data
 */
const ExportPagePreview = ({ exportType, courses, fields }: ExportPagePreviewProps) => {
  const dataExportPreviewMutation = useDataExportPreviewMutation();
  const [preview, setPreview] = useState<number>(10);
  const [data, setData] = useState<string[][]>([]);

  const refreshPreview = () => {
    if (courses.length == 0) {
      return;
    }

    dataExportPreviewMutation.mutate(
      {
        courses: courses,
        fields: fields,
        type: exportType,
        preview: preview
      },
      {
        onSuccess: dataPreview => {
          setData(dataPreview);
        }
      }
    );
  };

  const handlePreviewSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = parseInt(e.target.value);
    setPreview(selectedValue);
  };

  return (
    <div className="export-page-preview-container">
      <h3>Preview</h3>
      <div className="export-preview-header">
        Rows:
        <select className="export-preview-select form-select" onChange={handlePreviewSelect} value={preview}>
          {PREVIEW_OPTIONS.map(count => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
        <RefreshIcon className="export-preview-icon icon" onClick={refreshPreview} />
      </div>
      <div className="export-preview-table-container">
        <table className="export-preview-table">
          <thead>
            <tr className="export-preview-table-header">
              {data?.length > 0 &&
                data[0].map((cell, cellIdx) => (
                  <th key={cellIdx} className="export-preview-table-header-item">
                    {cell}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {data.map(
              (row, rowIdx) =>
                rowIdx > 0 && (
                  <tr key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="export-preview-table-item">
                        {cell}
                      </td>
                    ))}
                  </tr>
                )
            )}
            {data?.length >= preview && (
              <tr className="export-preview-table-more-row">
                <td className="export-preview-table-more-row-item" colSpan={data[0].length}>
                  <i>(More rows clipped)</i>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
