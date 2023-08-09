import React, { useEffect, useRef, useState } from "react";
import {
  useCourseAddWhitelistMutation,
  useCourseDeleteWhitelistMutation,
  useCourseWhitelistedEmails
} from "../../utils/queries/courses";
import { Course, RawUserInfo } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
import Modal from "../Modal";
import { SearchBar } from "../SearchBar";

// Images
import CheckCircleIcon from "../../../static/frontend/img/check_circle.svg";
import ExclamationCircleIcon from "../../../static/frontend/img/exclamation-circle.svg";
import UndoIcon from "../../../static/frontend/img/undo.svg";
import XIcon from "../../../static/frontend/img/x.svg";

// Styles
import "../../css/whitelist_modal.scss";

interface WhitelistModalProps {
  course: Course;
  closeModal: () => void;
}

enum ModalTab {
  ADD,
  DELETE
}

enum Status {
  NONE,
  LOADING,
  SUCCESS,
  ERROR
}

export const WhitelistModal = ({ course, closeModal }: WhitelistModalProps) => {
  const [modalTab, setModalTab] = useState<ModalTab>(ModalTab.ADD);
  const [stagedBlacklistEmails, setStagedBlacklistEmails] = useState<string[]>([]);
  const [whitelistedUsers, setWhitelistedUsers] = useState<RawUserInfo[]>([]);
  const [filteredWhitelistedUsers, setFilteredWhitelistedUsers] = useState<RawUserInfo[]>([]);

  const [whitelistAddStatus, setWhitelistAddStatus] = useState<Status>(Status.NONE);
  const [whitelistDeleteStatus, setWhitelistDeleteStatus] = useState<Status>(Status.NONE);

  const { data: jsonWhitelistedUsers, isSuccess: jsonWhitelistedUsersLoaded } = useCourseWhitelistedEmails(course.id);

  const whitelistAddMutation = useCourseAddWhitelistMutation(course.id);
  const whitelistDeleteMutation = useCourseDeleteWhitelistMutation(course.id);

  const whitelistAddTextArea = useRef<HTMLTextAreaElement>(null);
  const whitelistSearch = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (jsonWhitelistedUsersLoaded) {
      setWhitelistedUsers(jsonWhitelistedUsers.users);
    }
  }, [jsonWhitelistedUsers]);

  useEffect(() => {
    handleUpdateSearch();
  }, [whitelistedUsers]);

  const submitWhitelistAdd = () => {
    const whitelistedString = whitelistAddTextArea.current?.value;
    if (!whitelistedString) {
      // nothing to request
      return;
    }

    let whitelisted: string[] = [];
    if (whitelistedString.includes(",")) {
      // split by comma
      whitelisted = whitelistedString.split(",").map(email => email.trim());
    } else {
      // split by newline
      whitelisted = whitelistedString.split("\n").map(email => email.trim());
    }
    // filter empty emails
    whitelisted = whitelisted.filter(email => email.length > 0);

    if (whitelisted.length == 0) {
      // nothing to request
      return;
    }

    setWhitelistAddStatus(Status.LOADING);

    // submit email list to whitelist to course
    whitelistAddMutation.mutate(
      { emails: whitelisted },
      {
        onSuccess: () => {
          // clear textarea
          if (whitelistAddTextArea.current) {
            whitelistAddTextArea.current.value = "";
          }
          setWhitelistAddStatus(Status.SUCCESS);
          setTimeout(() => setWhitelistAddStatus(Status.NONE), 1500);
        }
      }
    );
  };

  const submitWhitelistDelete = () => {
    if (stagedBlacklistEmails.length === 0) {
      // nothing to submit
      return;
    }

    setWhitelistDeleteStatus(Status.LOADING);

    whitelistDeleteMutation.mutate(
      { emails: stagedBlacklistEmails },
      {
        onSuccess: () => {
          // clear staged blacklist emails
          setStagedBlacklistEmails([]);
          setWhitelistDeleteStatus(Status.SUCCESS);
          setTimeout(() => setWhitelistDeleteStatus(Status.NONE), 1500);
        }
      }
    );
  };

  const handleBlacklistUser = (user: RawUserInfo) => {
    setStagedBlacklistEmails(staged => [...staged, user.email]);
  };

  const handleUndoBlacklistUser = (user: RawUserInfo) => {
    setStagedBlacklistEmails(staged => staged.filter(email => email !== user.email));
  };

  const handleUpdateSearch = () => {
    const rawSearchValue = whitelistSearch.current?.value;
    if (!rawSearchValue) {
      setFilteredWhitelistedUsers(whitelistedUsers);
    } else {
      const searchValue = rawSearchValue.toLowerCase();
      const filtered = whitelistedUsers.filter(user => {
        return (
          user.email.toLowerCase().includes(searchValue) ||
          user.firstName.includes(searchValue) ||
          user.lastName.includes(searchValue) ||
          `${user.firstName} ${user.lastName}`.includes(searchValue)
        );
      });
      setFilteredWhitelistedUsers(filtered);
    }
  };

  // TODO: add search bar for filter

  let modalTabContents = null;
  if (modalTab === ModalTab.ADD) {
    let whitelistAddStatusIcon = null;
    if (whitelistAddStatus === Status.LOADING) {
      whitelistAddStatusIcon = <LoadingSpinner />;
    } else if (whitelistAddStatus === Status.SUCCESS) {
      whitelistAddStatusIcon = <CheckCircleIcon className="icon" />;
    } else if (whitelistAddStatus === Status.ERROR) {
      whitelistAddStatusIcon = <ExclamationCircleIcon className="icon" />;
    }

    modalTabContents = (
      <div className="whitelist-modal-add-container">
        <span className="whitelist-modal-subtitle">Add to whitelist</span>
        <span className="whitelist-modal-description">List of emails, one per line or separated by commas</span>
        <textarea className="whitelist-modal-add-textarea" ref={whitelistAddTextArea}></textarea>
        <div className="whitelist-modal-footer">
          <button className="primary-btn whitelist-modal-submit" onClick={submitWhitelistAdd}>
            Submit
          </button>
          <div className="whitelist-modal-submit-status">{whitelistAddStatusIcon}</div>
        </div>
      </div>
    );
  } else if (modalTab === ModalTab.DELETE) {
    let whitelistDeleteStatusIcon = null;
    if (whitelistDeleteStatus === Status.LOADING) {
      whitelistDeleteStatusIcon = <LoadingSpinner />;
    } else if (whitelistDeleteStatus === Status.SUCCESS) {
      whitelistDeleteStatusIcon = <CheckCircleIcon className="icon" />;
    } else if (whitelistDeleteStatus === Status.ERROR) {
      whitelistDeleteStatusIcon = <ExclamationCircleIcon className="icon" />;
    }

    modalTabContents = (
      <div className="whitelist-modal-delete-container">
        <span className="whitelist-modal-subtitle">Delete from whitelist</span>
        <div className="whitelist-modal-delete-search-container">
          <SearchBar
            className="whitelist-modal-delete-search"
            refObject={whitelistSearch}
            onChange={handleUpdateSearch}
          />
          <span className="whitelist-modal-delete-search-description">({whitelistedUsers.length} total)</span>
        </div>
        <div className="whitelist-modal-delete-content">
          {filteredWhitelistedUsers.map((user: RawUserInfo) => (
            <div
              className={`whitelist-modal-delete-row ${stagedBlacklistEmails.includes(user.email) ? "deleted" : ""}`}
              key={user.id}
            >
              <div className="whitelist-modal-delete-row-btn">
                {stagedBlacklistEmails.includes(user.email) ? (
                  <UndoIcon
                    className="icon whitelist-modal-delete-row-btn-icon"
                    onClick={() => handleUndoBlacklistUser(user)}
                  />
                ) : (
                  <XIcon
                    className="icon whitelist-modal-delete-row-btn-icon"
                    onClick={() => handleBlacklistUser(user)}
                  />
                )}
              </div>
              <div className="whitelist-modal-delete-row-content">
                {user.firstName.length === 0 && user.lastName.length === 0 ? (
                  <div className="whitelist-modal-delete-row-name">{user.email}</div>
                ) : (
                  <React.Fragment>
                    <div className="whitelist-modal-delete-row-name">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="whitelist-modal-delete-row-email">{user.email}</div>
                  </React.Fragment>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="whitelist-modal-footer">
          <button
            className="primary-btn whitelist-modal-submit"
            onClick={submitWhitelistDelete}
            disabled={stagedBlacklistEmails.length === 0}
          >
            Submit
          </button>
          <div className="whitelist-modal-submit-status">{whitelistDeleteStatusIcon}</div>
        </div>
      </div>
    );
  }

  return (
    <Modal className="whitelist-modal-container" closeModal={closeModal}>
      <div className="whitelist-modal">
        <div className="tab-list">
          <button
            className={`tab ${modalTab === ModalTab.ADD ? "active" : ""}`}
            onClick={() => setModalTab(ModalTab.ADD)}
          >
            Add
          </button>
          <button
            className={`tab ${modalTab === ModalTab.DELETE ? "active" : ""}`}
            onClick={() => setModalTab(ModalTab.DELETE)}
          >
            Delete
          </button>
        </div>
        {modalTabContents}
      </div>
    </Modal>
  );
};
