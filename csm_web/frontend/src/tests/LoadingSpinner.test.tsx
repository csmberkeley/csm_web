import React from "react";
import renderer from "react-test-renderer";
import LoadingSpinner from "../components/LoadingSpinner";

describe("LoadingSpinner", () => {
  it("should render correctly", () => {
    const component = renderer.create(<LoadingSpinner />);
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
});
