import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { parse as csv_parse } from "csv-parse/browser/esm/sync";

import { ExportType } from "../../components/data_export/DataExportTypes";
import { endpointWithQueryParams, fetchNormalized, normalizeEndpoint } from "../api";
import { handleError, handlePermissionsError, handleRetry, ServerError } from "./helpers";

interface DataExportPreviewMutationRequest {
  courses: number[];
  fields: string[];
  type: ExportType;
  preview: number;
}

/**
 * Mutation for fetching export data for preview.
 * Returns a table containing the CSV contents.
 */
export const useDataExportPreviewMutation = (): UseMutationResult<
  string[][],
  ServerError,
  DataExportPreviewMutationRequest
> => {
  const mutationResult = useMutation<string[][], Error, DataExportPreviewMutationRequest>(
    async (body: DataExportPreviewMutationRequest) => {
      const response = await fetchNormalized(
        "/export",
        new URLSearchParams({
          courses: body.courses.join(","),
          fields: body.fields.join(","),
          type: body.type,
          preview: body.preview.toString()
        })
      );

      if (response.ok) {
        const content = await response.text();
        // format content into a table
        const table = csv_parse(content);
        return table;
      } else {
        handlePermissionsError(response.status);
        throw new ServerError(
          `Failed to fetch preview; type ${body.type}, courses ${body.courses}, fields ${body.fields}`
        );
      }
    },
    {
      retry: handleRetry
    }
  );

  handleError(mutationResult);
  return mutationResult;
};

interface DataExportMutationRequest {
  courses: number[];
  fields: string[];
  type: ExportType;
}

/**
 * Mutation for fetching export data for download.
 * Returns a table containing the CSV contents.
 */
export const useDataExportMutation = (): UseMutationResult<void, ServerError, DataExportMutationRequest> => {
  const mutationResult = useMutation<void, Error, DataExportMutationRequest>(
    async (body: DataExportMutationRequest) => {
      const endpoint = endpointWithQueryParams(
        normalizeEndpoint("/export"),
        new URLSearchParams({
          courses: body.courses.join(","),
          fields: body.fields.join(","),
          type: body.type
        })
      );

      // open csv file endpoint
      window.open(endpoint, "_blank");
      return;
    }
  );

  handleError(mutationResult);
  return mutationResult;
};
