import React from "react";
import renderer from "react-test-renderer";
import Modal, { ModalCloser } from "../components/Modal";

/**
 * Returns a test Modal component.
 */
const getTestModal = (handleCloseModal: React.MouseEventHandler<Element>): React.ReactElement => {
  return (
    <Modal closeModal={handleCloseModal} className="test-modal">
      <div>Hello World</div>
    </Modal>
  );
};

describe("Modal", () => {
  it("should render correctly", () => {
    const handleCloseModal = jest.fn();
    const component = renderer.create(getTestModal(handleCloseModal));
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });

  describe("should close correctly", () => {
    test("when the close button is clicked", () => {
      const handleCloseModal = jest.fn();
      const component = renderer.create(getTestModal(handleCloseModal));
      const root = component.root;

      // find and click the close button
      const closeButton = root.findByProps({ className: "modal-close-x" }).findByType("button");
      closeButton.props.onClick();

      expect(handleCloseModal).toHaveBeenCalled();
    });

    test("when the overlay is clicked", () => {
      const handleCloseModal = jest.fn();
      const component = renderer.create(getTestModal(handleCloseModal));
      const root = component.root;

      // find and click the overlay
      const overlay = root.findByProps({ className: "modal-overlay" });
      overlay.props.onClick();

      expect(handleCloseModal).toHaveBeenCalled();
    });

    test("when an external modal closer is clicked", () => {
      // create a modal
      const handleCloseModal = jest.fn();
      const component = renderer.create(
        <Modal closeModal={handleCloseModal} className="test-modal">
          <div>Hello World</div>
          <ModalCloser>Close</ModalCloser>
        </Modal>
      );
      const tree = component.toJSON();
      expect(tree).toMatchSnapshot();

      // find and click the external modal closer
      const root = component.root;
      const closer = root.findByProps({ className: "modal-close" });
      closer.props.onClick();

      expect(handleCloseModal).toHaveBeenCalled();
    });
  });
});
