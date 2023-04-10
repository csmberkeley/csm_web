import React, { useEffect, useState } from "react";
import Modal from "../Modal";
import { useUserEmails } from "../../utils/queries/base";
import {
  useSwapRequestQuery,
  useSwapPostMutation,
  useReceivedSwapRequestQuery,
  useAllSwapRequestQuery
} from "../../utils/queries/sections";

interface SwapSectionModalProps {
  sectionId: number;
  closeModal: () => void;
}

export const SwapSectionModal = ({ sectionId, closeModal }: SwapSectionModalProps) => {
  // Need API endpoints

  return (
    <Modal className="swap-display" closeModal={closeModal}>
      <SwapRequestDashboard sectionId={sectionId} />
      <SwapRequestForm sectionId={sectionId} />
    </Modal>
  );
};

export const SwapRequestDashboard = ({ sectionId }: SwapRequestDashBoardProps) => {
  const [myRequest, setMyRequest] = useState<string[]>([]);
  const [sendRequest, setSendRequest] = useState<string[]>([]);
  const requests = useAllSwapRequestQuery(sectionId, studentId).data;
  const send_requests = useReceivedSwapRequestQuery(sectionId, studentId).data;
  useEffect(() => {
    // How do i get student id?
  }, []);

  return (
    <div className="swap-dashboard">
      <div className="my-request">
        <div className="swap-title">My Swap Requests</div>
        <ul>
          {/* {myRequest.map(request => (
            <li key={request.id}>
              {request.sender.user.first_name} {request.sender.user.last_name} (id: {request.sender.id})
            </li>
          ))} */}
        </ul>
      </div>
      <div className="received-request">
        <div className="swap-title">Receive Swap Requests</div>
        <ul>
          {/* {myRequest.map(request => (
            <li key={request.id}>
              {request.sender.user.first_name} {request.sender.user.last_name} (id: {request.sender.id})
            </li>
          ))} */}
        </ul>
      </div>
    </div>
  );
};
interface SwapRequestDashBoardProps {
  sectionId: number;
}

interface SwapRequestFormProps {
  sectionId: number;
  email: string;
}

export const SwapRequestForm = ({ sectionId }: SwapRequestFormProps) => {
  const { data: userEmails, isSuccess: userEmailsLoaded } = useUserEmails();
  // const swapSectionMutation = useSwapRequestMutation(sectionId); can be changed, not too sure
  const [email, setEmail] = useState<string>();
  const body = { sectionId: sectionId, email: email };
  const studentDropMutation = useSwapPostMutation(sectionId, email);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
  };

  return (
    <form id="swap-request-form" className="csm-form" onSubmit={handleSubmit}>
      <div id="swap-request-form-contents">
        <label>
          Email
          <input
            onChange={event => {
              setEmail(event.target.value);
            }}
            type="email"
            list="swap-student-email-list"
            required
            name="email"
            pattern=".+@berkeley.edu"
            title="Please enter a valid @berkeley.edu email address"
            value={email}
            autoFocus
          />
          {/* <datalist id="swap-student-email-list">
            {userEmailsLoaded ? userEmails.map(email => <option key={email} value={email} />) : null}
          </datalist> */}
        </label>
        <input type="submit" value="Request Swap" />
      </div>
    </form>
  );
};
