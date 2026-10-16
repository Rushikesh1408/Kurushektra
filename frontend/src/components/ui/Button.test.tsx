import { fireEvent, render, screen } from "@testing-library/react";
import { Button } from "./Button";

test("calls onClick when enabled", () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Submit code</Button>);
  fireEvent.click(screen.getByRole("button", { name: "Submit code" }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("is disabled and marked busy while loading", () => {
  const onClick = vi.fn();
  render(
    <Button loading onClick={onClick}>
      Submit code
    </Button>,
  );
  const btn = screen.getByRole("button", { name: "Submit code" });
  expect(btn).toBeDisabled();
  expect(btn).toHaveAttribute("aria-busy", "true");
  fireEvent.click(btn);
  expect(onClick).not.toHaveBeenCalled();
});
