import { DateTime } from "luxon";
import React, { useState } from "react";

import { DEFAULT_TIMEZONE } from "../../utils/datetime";
import Modal from "../Modal";
import TimeInput from "../TimeInput";
import { PublishOptions } from "./ResourceTypes";

type PublicationMode = "now" | "scheduled";

interface ResourcePublishModalProps {
  onConfirm: (options: PublishOptions, e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submissionError?: string;
}

function getInitialScheduledDateTime(): DateTime {
  const now = DateTime.now().setZone(DEFAULT_TIMEZONE).startOf("minute");
  const minutesUntilNextQuarterHour = 15 - (now.minute % 15);
  return now.plus({ minutes: minutesUntilNextQuarterHour });
}

/**
 * Prompts a coordinator to publish worksheets immediately or at a future time.
 */
export const ResourcePublishModal = ({
  onConfirm,
  onCancel,
  isSubmitting = false,
  submissionError = ""
}: ResourcePublishModalProps): React.ReactElement => {
  const initialScheduledDateTime = getInitialScheduledDateTime();
  const [publicationMode, setPublicationMode] = useState<PublicationMode>("now");
  const [scheduledDate, setScheduledDate] = useState<string>(initialScheduledDateTime.toISODate() ?? "");
  const [scheduledTime, setScheduledTime] = useState<string>(initialScheduledDateTime.toFormat("HH:mm"));

  const today = DateTime.now().setZone(DEFAULT_TIMEZONE).toISODate() ?? "";

  function getScheduledPublishAt(): { publishAt: string | null; error: string } {
    if (!scheduledDate || !scheduledTime) {
      return { publishAt: null, error: "Select both a publication date and time." };
    }

    const scheduledDateTime = DateTime.fromISO(`${scheduledDate}T${scheduledTime}`, {
      zone: DEFAULT_TIMEZONE
    });

    if (!scheduledDateTime.isValid) {
      return { publishAt: null, error: "Enter a valid publication date and time." };
    }

    if (scheduledDateTime <= DateTime.now().setZone(DEFAULT_TIMEZONE)) {
      return { publishAt: null, error: "The publication time must be in the future." };
    }

    const publishAt = scheduledDateTime.toUTC().toISO();
    if (!publishAt) {
      return { publishAt: null, error: "Enter a valid publication date and time." };
    }

    return { publishAt, error: "" };
  }

  const scheduledPublication = getScheduledPublishAt();
  const scheduleIsInvalid = publicationMode === "scheduled" && Boolean(scheduledPublication.error);

  function handleConfirm(e: React.MouseEvent<HTMLButtonElement>): void {
    if (publicationMode === "now") {
      onConfirm({ publishAt: null }, e);
      return;
    }

    if (!scheduledPublication.error) {
      onConfirm({ publishAt: scheduledPublication.publishAt }, e);
    }
  }

  return (
    <Modal
      closeModal={isSubmitting ? () => undefined : onCancel}
      className="resource-publish-modal"
      modalClassName="resource-publish-shell"
      overlayClassName="resource-publish-overlay"
    >
      <div className="resource-publish-container">
        <h2>When should these worksheets be published?</h2>

        <div className="form-radio-group-col">
          <label className="form-radio-item" htmlFor="publish-now">
            <input
              checked={publicationMode === "now"}
              className="form-radio"
              disabled={isSubmitting}
              id="publish-now"
              name="publication-mode"
              onChange={() => setPublicationMode("now")}
              type="radio"
            />
            Post now
          </label>

          <label className="form-radio-item" htmlFor="publish-scheduled">
            <input
              checked={publicationMode === "scheduled"}
              className="form-radio"
              disabled={isSubmitting}
              id="publish-scheduled"
              name="publication-mode"
              onChange={() => setPublicationMode("scheduled")}
              type="radio"
            />
            Schedule for later
          </label>
        </div>

        <div className="resource-publish-datetime">
          <label className="form-label" htmlFor="publish-date">
            Date
            <input
              className="form-date"
              disabled={publicationMode === "now" || isSubmitting}
              id="publish-date"
              min={today}
              onChange={e => setScheduledDate(e.target.value)}
              type="date"
              value={scheduledDate}
            />
          </label>

          <label className="form-label" htmlFor="publish-time">
            Time
            <TimeInput
              className="form-input"
              disabled={publicationMode === "now" || isSubmitting}
              id="publish-time"
              onChange={e => setScheduledTime(e.target.value)}
              value={scheduledTime}
            />
          </label>
        </div>

        <div className="resource-publish-timezone">Pacific Time</div>
        {scheduleIsInvalid && (
          <div className="resource-validation-error" role="alert">
            {scheduledPublication.error}
          </div>
        )}
        {submissionError && (
          <div className="resource-validation-error" role="alert">
            {submissionError}
          </div>
        )}

        <div className="resource-publish-actions">
          <button className="secondary-btn" disabled={isSubmitting} onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="primary-btn"
            disabled={isSubmitting || scheduleIsInvalid}
            onClick={handleConfirm}
            type="button"
          >
            {isSubmitting ? "Saving..." : publicationMode === "now" ? "Publish & Save" : "Schedule & Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ResourcePublishModal;
