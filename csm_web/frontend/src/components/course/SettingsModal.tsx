import React, { useEffect, useState } from "react";

import LoadingSpinner from "../LoadingSpinner";
import { useCourses, useCourseSettingsMutation } from "../../utils/queries/courses";
import { Tooltip } from "../Tooltip";
import Modal from "../Modal";

// Images
import InfoIcon from "../../../static/frontend/img/info.svg";

// Styles
import "../../css/course-settings.scss";

interface SettingsModalProps {
  courseId: number;
  closeModal: () => void;
}

/**
 * Modal to configure course settings.
 *
 * TODO: replace this with an entirely new page when the coordinator interface is reworked.
 */
export const SettingsModal = ({ courseId, closeModal }: SettingsModalProps) => {
  const { data: courses, isSuccess: coursesLoaded } = useCourses();

  // limit for submission of word of the day
  const [wordOfTheDayLimit, setWordOfTheDayLimit] = useState<number>(0);

  const courseSettingsMutation = useCourseSettingsMutation(courseId);

  useEffect(() => {
    if (coursesLoaded) {
      const course = courses.find(c => c.id === courseId);
      const limit = course?.wordOfTheDayLimit;
      if (limit) {
        // limit is of form '[DD] [HH:[MM:]]ss[.uuuuuu]'; want to extract days
        const days = parseInt(limit.split(" ")[0]);
        if (days > 0) {
          // set state
          setWordOfTheDayLimit(days);
        } else {
          // fall back to 0 (will submit as null)
          setWordOfTheDayLimit(0);
        }
      } else {
        // fall back to 0 (will submit as null)
        setWordOfTheDayLimit(0);
      }
    }
  }, [coursesLoaded]);

  const handleChangeWordOfTheDayLimit = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWordOfTheDayLimit(parseInt(e.target.value));
  };

  const submitSettings = () => {
    // if state = 0, then treat as if no limit (doesn't make sense to have 0 day limit)
    let formattedWordOfTheDayLimit = null;
    if (wordOfTheDayLimit > 0) {
      // format word of the day limit; state is in days
      formattedWordOfTheDayLimit = `${wordOfTheDayLimit} 00:00:00`;
    }

    // compile all settings
    const settings = {
      wordOfTheDayLimit: formattedWordOfTheDayLimit
    };

    courseSettingsMutation.mutate(settings, {
      onSuccess: () => {
        closeModal();
      }
    });
  };

  let modalContent = <LoadingSpinner />;
  if (coursesLoaded) {
    modalContent = (
      <div className="course-settings-content">
        <h2 className="course-settings-title">Settings</h2>
        <div className="course-settings-container">
          <div className="course-settings-row">
            <div className="course-settings-label-container">
              <label htmlFor="wordOfTheDayLimit">Word of the day limit</label>
              <div className="course-settings-tooltip-container">
                <Tooltip placement="top" source={<InfoIcon className="icon course-settings-tooltip-info-icon" />}>
                  <div className="course-settings-tooltip-body">
                    Time limit in days for submitting word of the day.
                    <br />0 corresponds to no limit.
                  </div>
                </Tooltip>
              </div>
            </div>
            <div className="course-settings-input-container">
              <input
                id="wordOfTheDayLimit"
                className="form-input course-settings-input"
                type="number"
                min="0"
                value={wordOfTheDayLimit}
                onChange={handleChangeWordOfTheDayLimit}
              />
              <span className="course-settings-input-post">days</span>
            </div>
          </div>
        </div>
        <div className="course-settings-footer">
          <button className="primary-btn course-settings-submit" type="button" onClick={submitSettings}>
            Submit
          </button>
        </div>
      </div>
    );
  }

  return <Modal closeModal={closeModal}>{modalContent}</Modal>;
};
