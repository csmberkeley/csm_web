import React from "react";
import { fireEvent, render } from "@testing-library/react";
import Modal, { ModalCloser } from "../components/Modal";
import { act } from "react-dom/test-utils";

/**
 * Returns a test Modal component.
 */
const getTestModal = (handleCloseModal: React.MouseEventHandler<Element>, className = ""): React.ReactElement => {
  if (className === "") {
    return (
      <Modal closeModal={handleCloseModal}>
        <div>Hello World</div>
      </Modal>
    );
  } else {
    return (
      <Modal closeModal={handleCloseModal} className={className}>
        <div>Hello World</div>
      </Modal>
    );
  }
};

describe("Modal", () => {
  it("should render correctly", () => {
    const handleCloseModal = jest.fn();
    const component = render(getTestModal(handleCloseModal));
    expect(component.asFragment()).toMatchSnapshot();
  });

  it("should render correctly with className", () => {
    const handleCloseModal = jest.fn();
    const component = render(getTestModal(handleCloseModal, "test-modal"));
    expect(component.asFragment()).toMatchSnapshot();
  });

  describe("should close correctly", () => {
    test("when the close button is clicked", () => {
      const handleCloseModal = jest.fn();
      const component = render(getTestModal(handleCloseModal));

      // find and click the close button
      const closeButton = component.getByRole("button", { name: /close/i });
      act(() => {
        fireEvent.click(closeButton);
      });

      expect(handleCloseModal).toHaveBeenCalled();
    });

    test("when the overlay is clicked", () => {
      const handleCloseModal = jest.fn();
      const component = render(getTestModal(handleCloseModal));

      // find and click the overlay
      const overlay = component.container.querySelector(".modal-overlay")!;
      act(() => {
        fireEvent.click(overlay);
      });

      expect(handleCloseModal).toHaveBeenCalled();
    });

    test("when an external modal closer is clicked", () => {
      // create a modal
      const handleCloseModal = jest.fn();
      const component = render(
        <Modal closeModal={handleCloseModal} className="test-modal">
          <div>Hello World</div>
          <ModalCloser>Close</ModalCloser>
        </Modal>
      );
      expect(component.asFragment()).toMatchSnapshot();

      // find and click the external modal closer
      const closer = component.container.querySelector(".modal-close")!;
      act(() => {
        fireEvent.click(closer);
      });

      expect(handleCloseModal).toHaveBeenCalled();
    });
  });
});
