import "@testing-library/jest-dom";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import React from "react";
import StudentDropper from "../../components/section/StudentDropper";
import * as api from "../../utils/api";

// mock modal
jest.mock("../../components/Modal", () => {
  return {
    __esModule: true,
    default: function Modal(props: { closeModal: React.MouseEventHandler<Element>; children: React.ReactNode }) {
      return (
        <div className="_mock-modal">
          <button onClick={props.closeModal}>Close</button>
          {props.children}
        </div>
      );
    }
  };
});

describe("StudentDropper", () => {
  it("should render correctly without interaction", () => {
    const reloadSection = jest.fn();
    const component = render(<StudentDropper id={1} name="John Doe" reloadSection={reloadSection} />);
    expect(component.asFragment()).toMatchSnapshot();
  });

  it("should render modal correctly after clicking x", () => {
    const reloadSection = jest.fn();
    const component = render(<StudentDropper id={1} name="Test Student" reloadSection={reloadSection} />);

    act(() => {
      // click drop button to bring up modal
      fireEvent.click(component.getByTitle("Drop student from section"));
    });

    expect(component.asFragment()).toMatchSnapshot();
  });

  it("should close modal correctly", () => {
    const reloadSection = jest.fn();
    const component = render(<StudentDropper id={1} name="Test Student" reloadSection={reloadSection} />);

    act(() => {
      // click drop button to bring up modal
      fireEvent.click(component.getByTitle("Drop student from section"));
    });

    act(() => {
      // click close button to close modal
      fireEvent.click(component.getByRole("button", { name: /close/i }));
    });

    expect(component.asFragment()).toMatchSnapshot();
  });

  it("should drop student after confirming", async () => {
    // mock fetchWithMethod, checking call arguments
    const spyFetchWithMethod = jest.spyOn(api, "fetchWithMethod");
    spyFetchWithMethod.mockImplementation(async (endpoint: string, method: string, body: any) => {
      // have leeway when checking endpoint
      const normalizedEndpoint = api.normalizeEndpoint(endpoint);
      expect(normalizedEndpoint).toBe("/api/students/1/drop/");
      expect(method).toBe(api.HTTP_METHODS.PATCH);
      expect(body).toEqual({ banned: false });

      return null as any;
    });

    const reloadSection = jest.fn();
    const component = render(<StudentDropper id={1} name="Test Student" reloadSection={reloadSection} />);

    // click drop button to bring up modal
    act(() => {
      fireEvent.click(component.getByTitle("Drop student from section"));
    });

    // submit button should be disabled
    const confirmButton = component.getByText("Submit");
    expect(confirmButton).toBeDisabled();
    // ban button should be disabled
    const banCheckbox = component.getByRole("checkbox", { name: /ban/i });
    expect(banCheckbox).toBeDisabled();
    // drop checkbox should be unchecked
    const dropCheckbox = component.getByRole("checkbox", { name: /drop/i });
    expect(dropCheckbox).not.toBeChecked();

    // check drop checkbox
    act(() => {
      fireEvent.click(dropCheckbox);
    });

    // drop checkbox should now be checked
    expect(dropCheckbox).toBeChecked();
    // submit button should be enabled
    expect(confirmButton).toBeEnabled();
    // ban button should be enabled
    expect(banCheckbox).toBeEnabled();
    // ban button should be unchecked
    expect(banCheckbox).not.toBeChecked();

    // click confirm button to drop student
    act(() => {
      fireEvent.click(confirmButton);
    });

    // wait for fetch to finish
    waitFor(() => {
      expect(spyFetchWithMethod).toHaveBeenCalled();
      expect(reloadSection).toHaveBeenCalled();
    });
  });

  it("should drop and ban student after confirming", async () => {
    // mock fetchWithMethod, checking call arguments
    const spyFetchWithMethod = jest.spyOn(api, "fetchWithMethod");
    spyFetchWithMethod.mockImplementation(async (endpoint: string, method: string, body: any) => {
      // have leeway when checking endpoint
      const normalizedEndpoint = api.normalizeEndpoint(endpoint);
      expect(normalizedEndpoint).toBe("/api/students/1/drop/");
      expect(method).toBe(api.HTTP_METHODS.PATCH);
      expect(body).toEqual({ banned: true });

      return null as any;
    });

    const reloadSection = jest.fn();
    const component = render(<StudentDropper id={1} name="Test Student" reloadSection={reloadSection} />);

    // click drop button to bring up modal
    act(() => {
      fireEvent.click(component.getByTitle("Drop student from section"));
    });

    // submit button should be disabled
    const confirmButton = component.getByText("Submit");
    expect(confirmButton).toBeDisabled();
    // ban button should be disabled
    const banCheckbox = component.getByRole("checkbox", { name: /ban/i });
    expect(banCheckbox).toBeDisabled();
    // drop checkbox should be unchecked
    const dropCheckbox = component.getByRole("checkbox", { name: /drop/i });
    expect(dropCheckbox).not.toBeChecked();

    // check drop checkbox
    act(() => {
      fireEvent.click(dropCheckbox);
    });

    // drop checkbox should now be checked
    expect(dropCheckbox).toBeChecked();
    // submit button should be enabled
    expect(confirmButton).toBeEnabled();
    // ban button should be enabled
    expect(banCheckbox).toBeEnabled();
    // ban button should be unchecked
    expect(banCheckbox).not.toBeChecked();

    // check ban checkbox
    act(() => {
      fireEvent.click(banCheckbox);
    });

    // drop checkbox should now be checked
    expect(dropCheckbox).toBeChecked();
    // submit button should be enabled
    expect(confirmButton).toBeEnabled();
    // ban button should be enabled
    expect(banCheckbox).toBeEnabled();
    // ban button should be checked
    expect(banCheckbox).toBeChecked();

    // click confirm button to drop student
    act(() => {
      fireEvent.click(confirmButton);
    });

    // wait for fetch to finish
    waitFor(() => {
      expect(spyFetchWithMethod).toHaveBeenCalled();
      expect(reloadSection).toHaveBeenCalled();
    });
  });
});
