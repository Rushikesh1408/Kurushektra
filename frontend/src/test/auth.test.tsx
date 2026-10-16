import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AuthProvider } from "../lib/auth";
import AuthForm from "../pages/AuthForm";

const student = { id: "1", email: "s@example.com", full_name: "Sam", role: "student", is_active: true };

function mockFetch(handler: (url: string) => { status: number; body?: unknown }) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const { status, body } = handler(url);
    return new Response(status === 204 ? null : JSON.stringify(body ?? {}), { status });
  }));
}
afterEach(() => vi.unstubAllGlobals());

test("signed-out visitors are redirected to sign in", async () => {
  mockFetch(() => ({ status: 401, body: { error: { message: "no" } } }));
  render(
    <MemoryRouter initialEntries={["/secret"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/secret" element={<ProtectedRoute><p>secret</p></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByText("login page")).toBeInTheDocument();
});

test("students are blocked from teacher-only pages", async () => {
  mockFetch(() => ({ status: 200, body: { access_token: "t", user: student } }));
  render(
    <MemoryRouter initialEntries={["/new"]}>
      <AuthProvider>
        <Routes><Route path="/new" element={<ProtectedRoute roles={["teacher"]}><p>form</p></ProtectedRoute>} /></Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/don't have access/i)).toBeInTheDocument();
  expect(screen.queryByText("form")).not.toBeInTheDocument();
});

test("login shows the server's error message", async () => {
  mockFetch((url) => url.endsWith("/auth/refresh")
    ? { status: 401, body: { error: { message: "x" } } }
    : { status: 401, body: { error: { message: "Email or password is incorrect." } } });
  render(<MemoryRouter><AuthProvider><AuthForm mode="login" /></AuthProvider></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "whatever-1234" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Email or password is incorrect."));
});
