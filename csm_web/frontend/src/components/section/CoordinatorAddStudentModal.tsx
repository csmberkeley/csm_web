import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useUserEmails } from "../../utils/queries/base";
import LoadingSpinner from "../LoadingSpinner";
import Modal from "../Modal";

import CheckCircle from "../../../static/frontend/img/check_circle.svg";
import ErrorCircle from "../../../static/frontend/img/error_outline.svg";
import { useEnrollStudentMutation } from "../../utils/queries/sections";

enum CoordModalStates {
  INITIAL = "INITIAL",
  LOADING = "LOADING",
  WARNING = "WARNING",
  ERROR = "ERROR"
}

interface CoordinatorAddStudentModalProps {
  closeModal: (arg0?: boolean) => void;
  sectionId: number;
}

interface RequestType {
  emails: ActionType[];
  actions: {
    [action: string]: string;
  };
}

interface ResponseType {
  errors?: {
    critical?: string;
    capacity?: string;
  };
  progress?: Array<{
    email: string;
    status: string;
    detail?: any;
  }>;
}

interface ActionType {
  // capacity?: string;  // type error with below
  [email: string]: string;
}

export function CoordinatorAddStudentModal({
  closeModal,
  sectionId
}: CoordinatorAddStudentModalProps): React.ReactElement {
  const { data: userEmails, isSuccess: userEmailsLoaded } = useUserEmails();
  const enrollStudentMutation = useEnrollStudentMutation(sectionId);

  const [emailsToAdd, setEmailsToAdd] = useState<string[]>([""]);
  const [response, setResponse] = useState<ResponseType>({} as ResponseType);
  /**
   * Mapping from email to action for what the user replies with after the first submission
   */
  const [responseActions, setResponseActions] = useState<Map<string, string | ActionType>>(new Map());
  const [addStage, setAddStage] = useState<string>(CoordModalStates.INITIAL);
  /**
   * Whether or not the form fields should be highlighted if invalid
   */
  const [validationEnabled, setValidationEnabled] = useState<boolean>(false);

  function setEmail(index: number, value: string): void {
    const newEmailsToAdd = [...emailsToAdd];
    newEmailsToAdd[index] = value;
    setEmailsToAdd(newEmailsToAdd);
  }

  function addNewEmail(): void {
    setEmailsToAdd([...emailsToAdd, ""]);
  }

  function addEmailsFromClipboard(): void {
    // this will error with a DOMException if clipboard access is denied
    navigator.clipboard.readText().then(text => {
      setEmailsToAdd(lastEmails => {
        if (lastEmails.length == 1 && lastEmails[0] === "") {
          // just the initial value, so overwrite it
          lastEmails = [];
        }
        return [...lastEmails, ...text.split(/\s+/g)];
      });
    });
  }

  function removeEmailByIndex(index: number): void {
    const newEmailsToAdd = [...emailsToAdd];
    newEmailsToAdd.splice(index, 1);
    setEmailsToAdd(newEmailsToAdd);
  }

  function removeResponseEmail(email: string): void {
    setEmailsToAdd(emailsToAdd.filter(item => item !== email));
    setResponse(lastResponse => ({
      ...lastResponse,
      progress: lastResponse.progress && lastResponse.progress.filter(email_obj => email_obj.email !== email)
    }));
  }

  function handleAddStudentSubmit(e: React.ChangeEvent<HTMLFormElement>): void {
    e.preventDefault(); // prevent refresh on submit, which stops this request
    setAddStage(CoordModalStates.LOADING);

    const request_emails = emailsToAdd.map(email => {
      let action: ActionType = {};
      if (responseActions.has(email)) {
        action = responseActions.get(email) as ActionType;
      }
      return { email: email, ...action };
    });

    if (request_emails.length == 0) {
      // no student emails to add, so just exit without reloading
      closeModal();
      return;
    }

    const request: RequestType = { emails: request_emails, actions: {} };
    if (responseActions.has("capacity")) {
      request.actions["capacity"] = responseActions.get("capacity") as string;
    }

    enrollStudentMutation.mutate(request, {
      onError: ({ status, json }) => {
        if (status === 500) {
          // internal error
          setResponse({
            errors: { critical: `A internal error occurred. Please report this error to #tech-bugs immediately.` }
          });
          setAddStage(CoordModalStates.ERROR);
        } else {
          // other error
          setResponse(json);
          if (json.errors?.critical) {
            setAddStage(CoordModalStates.ERROR);
          } else {
            setAddStage(CoordModalStates.WARNING);
          }
        }
        setValidationEnabled(false); // reset validation
      },
      onSuccess: () => {
        // close modal and refresh the page
        closeModal(true);
      }
    });
  }

  function updateResponseAction(e: React.ChangeEvent<HTMLInputElement>, email: string, field: string): void {
    let newAction: ActionType = {};
    if (responseActions.has(email)) {
      newAction = responseActions.get(email) as ActionType;
    }

    if (e.target.checked) {
      newAction[field] = e.target.value;
    } else {
      delete newAction[field];
    }

    const newResponseActions = new Map(responseActions);
    newResponseActions.set(email, newAction);
    setResponseActions(newResponseActions);
  }

  function updateGeneralResponseAction(e: React.ChangeEvent<HTMLInputElement>, field: string): void {
    const newResponseActions = new Map(responseActions);
    if (e.target.checked) {
      newResponseActions.set(field, e.target.value);
    } else {
      newResponseActions.delete(field);
    }
    setResponseActions(newResponseActions);
  }

  const initial_component = (
    <React.Fragment>
      <h4>Add new students</h4>
      <div className="coordinator-email-content">
        <div className="coordinator-email-input-list">
          {emailsToAdd.map((email, index) => (
            <div className="coordinator-email-input-item" key={index}>
              <span className="inline-plus-sign" title="Remove" onClick={() => removeEmailByIndex(index)}>
                ×
              </span>
              <input
                className={"coordinator-email-input" + (validationEnabled ? "" : " lock-validation")}
                type="email"
                required
                pattern=".+@berkeley.edu$"
                title="Please enter a valid @berkeley.edu email address"
                placeholder="New student's email"
                list="user-emails-list"
                value={email}
                onChange={({ target: { value } }) => setEmail(index, value)}
              />
            </div>
          ))}
          <datalist id="user-emails-list">
            {userEmailsLoaded && userEmails.map(email => <option key={email} value={email} />)}
          </datalist>
        </div>
      </div>
      <div className="coordinator-email-input-buttons">
        <button className="coordinator-email-input-add" type="button" onClick={() => addNewEmail()}>
          Add email
        </button>
        {
          /* Firefox doesn't support clipboard reads from sites; readText would be undefined */
          navigator?.clipboard?.readText !== undefined && (
            <button className="coordinator-email-input-add" type="button" onClick={() => addEmailsFromClipboard()}>
              Add from clipboard
            </button>
          )
        }
        <button className="coordinator-email-input-submit" type="submit" onClick={() => setValidationEnabled(true)}>
          Submit
        </button>
      </div>
    </React.Fragment>
  );

  const loading_component = (
    <React.Fragment>
      <h4>Add new students</h4>
      <LoadingSpinner />
      <div></div> {/* empty element to align the content */}
    </React.Fragment>
  );

  const ADD_STATUS = {
    OK: "OK",
    CONFLICT: "CONFLICT",
    BANNED: "BANNED",
    RESTRICTED: "RESTRICTED"
  };

  const ok_arr = [];
  const conflict_arr = [];
  const banned_arr = [];
  const restricted_arr = [];

  if (response && response.progress) {
    for (const email_obj of response.progress) {
      switch (email_obj.status) {
        case ADD_STATUS.OK:
          ok_arr.push(email_obj);
          break;
        case ADD_STATUS.CONFLICT:
          conflict_arr.push(email_obj);
          break;
        case ADD_STATUS.BANNED:
          banned_arr.push(email_obj);
          break;
        case ADD_STATUS.RESTRICTED:
          restricted_arr.push(email_obj);
          break;
      }
    }
  }

  const warning_component = (
    <React.Fragment>
      <h4>Add new students</h4>
      <div className="coordinator-email-content">
        <div className="coordinator-email-response-list">
          {conflict_arr.length > 0 && (
            <div className="coordinator-email-response-container">
              <div className="coordinator-email-response-head">
                <div className="coordinator-email-response-head-left coordinator-email-response-status-conflict">
                  <ErrorCircle className="coordinator-email-response-status-conflict-icon" />
                  Section conflict
                </div>
                <div className="coordinator-email-response-head-right">
                  <div className="coordinator-email-reaponse-head-right-item">Drop?</div>
                </div>
              </div>
              <div className="coordinator-email-response-item-container">
                {conflict_arr.map(email_obj => {
                  let conflictDetail: React.ReactNode = "";
                  let drop_disabled = false;
                  if (!email_obj.detail.section) {
                    // look at reason
                    if (!email_obj.detail.reason || email_obj.detail.reason === "other") {
                      // unknown reason
                      conflictDetail = "Unable to enroll user in section!";
                    } else if (email_obj.detail.reason === "coordinator") {
                      conflictDetail = "User is already a coordinator for the course!";
                    } else if (email_obj.detail.reason === "mentor") {
                      conflictDetail = "User is already a mentor for the course!";
                    }
                    drop_disabled = true;
                  } else if (email_obj.detail.section.id == sectionId) {
                    conflictDetail = "Already enrolled!";
                    drop_disabled = true;
                  } else {
                    conflictDetail = (
                      <React.Fragment>
                        Conflict:{" "}
                        <Link to={`/sections/${email_obj.detail.section.id}`} target="_blank" rel="noopener noreferrer">
                          {email_obj.detail.section.mentor.name}
                        </Link>
                      </React.Fragment>
                    );
                  }
                  return (
                    <div key={email_obj.email} className="coordinator-email-response-item">
                      <div className="coordinator-email-response-item-left">
                        <div className="coordinator-email-response-item-left-email">
                          <span
                            className="inline-plus-sign"
                            title="Remove"
                            onClick={() => removeResponseEmail(email_obj.email)}
                          >
                            ×
                          </span>
                          <span>{email_obj.email}</span>
                        </div>
                        <div className="coordinator-email-response-item-left-detail">{conflictDetail}</div>
                      </div>
                      <div className="coordinator-email-response-item-right">
                        <input
                          type="checkbox"
                          value="DROP"
                          disabled={drop_disabled}
                          onChange={e => updateResponseAction(e, email_obj.email, "conflict_action")}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {banned_arr.length > 0 && (
            <div className="coordinator-email-response-container">
              <div className="coordinator-email-response-head">
                <div className="coordinator-email-response-head-left coordinator-email-response-status-banned">
                  <ErrorCircle className="coordinator-email-response-status-conflict-icon" />
                  Student banned
                </div>
                <div className="coordinator-email-response-head-right">
                  <div className="coordinator-email-reaponse-head-right-item">
                    Unban,
                    <br /> Enroll
                  </div>
                  <div className="coordinator-email-reaponse-head-right-item">
                    Unban,
                    <br /> No Enroll
                  </div>
                </div>
              </div>
              <div className="coordinator-email-response-item-container">
                {banned_arr.map(email_obj => (
                  <div key={email_obj.email} className="coordinator-email-response-item">
                    <div className="coordinator-email-response-item-left">
                      <div className="coordinator-email-response-item-left-email">
                        <span
                          className="inline-plus-sign"
                          title="Remove"
                          onClick={() => removeResponseEmail(email_obj.email)}
                        >
                          ×
                        </span>
                        <span>{email_obj.email}</span>
                      </div>
                    </div>
                    <div className="coordinator-email-response-item-right">
                      <input
                        type="radio"
                        name={`unban-${email_obj.email}`}
                        value="UNBAN_ENROLL"
                        onChange={e => updateResponseAction(e, email_obj.email, "ban_action")}
                      />
                      <input
                        type="radio"
                        name={`unban-${email_obj.email}`}
                        value="UNBAN_SKIP"
                        onChange={e => updateResponseAction(e, email_obj.email, "ban_action")}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {restricted_arr.length > 0 && (
            <div className="coordinator-email-response-container">
              <div className="coordinator-email-response-head">
                <div className="coordinator-email-response-head-left coordinator-email-response-status-banned">
                  <ErrorCircle className="coordinator-email-response-status-conflict-icon" />
                  Course restricted
                </div>
                <div className="coordinator-email-response-head-right">
                  <div className="coordinator-email-reaponse-head-right-item">
                    Whitelist,
                    <br /> Enroll
                  </div>
                </div>
              </div>
              <div className="coordinator-email-response-item-container">
                {restricted_arr.map(email_obj => (
                  <div key={email_obj.email} className="coordinator-email-response-item">
                    <div className="coordinator-email-response-item-left">
                      <div className="coordinator-email-response-item-left-email">
                        <span
                          className="inline-plus-sign"
                          title="Remove"
                          onClick={() => removeResponseEmail(email_obj.email)}
                        >
                          ×
                        </span>
                        {email_obj.email}
                      </div>
                    </div>
                    <div className="coordinator-email-response-item-right">
                      <input
                        type="checkbox"
                        name={`whitelist-${email_obj.email}`}
                        value="WHITELIST"
                        onChange={e => updateResponseAction(e, email_obj.email, "restricted_action")}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {ok_arr.length > 0 && (
            <div className="coordinator-email-response-container">
              <div className="coordinator-email-response-head">
                <div className="coordinator-email-response-head-left coordinator-email-response-status-ok">
                  <CheckCircle className="coordinator-email-response-status-ok-icon" />
                  OK
                </div>
                <div className="coordinator-email-response-head-right"></div>
              </div>
              <div className="coordinator-email-response-item-container">
                {ok_arr.map(email_obj => (
                  <div key={email_obj.email} className="coordinator-email-response-item">
                    <div className="coordinator-email-response-item-left">
                      <span
                        className="inline-plus-sign"
                        title="Remove"
                        onClick={() => removeResponseEmail(email_obj.email)}
                      >
                        ×
                      </span>
                      <span>{email_obj.email}</span>
                    </div>
                    <div className="coordinator-email-response-item-right"></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {response && response.errors && response.errors.capacity && (
            <div className="coordinator-email-response-capacity-container">
              <hr className="coordinator-email-response-hr" />
              <div className="coordinator-email-response-email-status">
                <div className="coordinator-email-response-capacity">
                  <ErrorCircle className="coordinator-email-response-status-conflict-icon" />
                  Section capacity exceeded!
                </div>
              </div>
              <div className="coordinator-email-response-form">
                <label>
                  <input
                    type="radio"
                    name="capacity"
                    value="EXPAND"
                    onChange={e => updateGeneralResponseAction(e, "capacity")}
                  />
                  Enroll and expand section
                </label>
                <label>
                  <input
                    type="radio"
                    name="capacity"
                    value="SKIP"
                    onChange={e => updateGeneralResponseAction(e, "capacity")}
                  />
                  Ignore (delete students manually)
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="coordinator-email-input-buttons">
        <button className="coordinator-email-input-submit" type="submit" onClick={() => setValidationEnabled(true)}>
          Retry
        </button>
      </div>
    </React.Fragment>
  );

  const error_component = (
    <React.Fragment>
      <h4 className="internal-error-title">Internal Error</h4>
      <div className="internal-error-body">{response && response.errors && response.errors.critical}</div>
      <div>Timestamp: {`${new Date()}`}</div>
    </React.Fragment>
  );

  let curContents = null;
  if (addStage === CoordModalStates.INITIAL) {
    curContents = initial_component;
  } else if (addStage === CoordModalStates.LOADING) {
    curContents = loading_component;
  } else if (addStage === CoordModalStates.ERROR) {
    curContents = error_component;
  } else if (addStage === CoordModalStates.WARNING) {
    curContents = warning_component;
  }

  return (
    <Modal className="coordinator-add-student-modal" closeModal={() => closeModal()}>
      <form
        id="coordinator-add-student-form"
        className="coordinator-add-student-modal-contents"
        onSubmit={handleAddStudentSubmit}
      >
        {curContents}
      </form>
    </Modal>
  );
}
