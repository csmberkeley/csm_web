import { render } from "@testing-library/react";
import React from "react";
import LoadingSpinner from "../components/LoadingSpinner";

describe("LoadingSpinner", () => {
  it("should render correctly", () => {
    const component = render(<LoadingSpinner />);
    expect(component.asFragment()).toMatchSnapshot();
  });
});
