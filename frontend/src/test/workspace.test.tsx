import { fireEvent, render, screen } from "@testing-library/react";
import { Workspace } from "../components/workspace/Workspace";
import { ToastProvider } from "../components/Toast";
import type { ChallengeDetail, Submission } from "../lib/api";

vi.mock("@monaco-editor/react", () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="Code editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const challenge: ChallengeDetail = {
  id: "c1", slug: "sum", title: "Sum", description_md: "d", difficulty: "easy", time_limit_ms: 2000, memory_limit_kb: 128000,
  languages: [{ key: "python3", display_name: "Python 3", starter_code: "# start" }], visible_tests: [], hidden_test_count: 1,
};
const base: Submission = {
  id: "s1", challenge_id: "c1", language: "python3", status: "queued", is_run_only: false, created_at: new Date().toISOString(),
  source_code: "# start", results: [], passed: 0, total: 0, correctness_ratio: null, compile_error: null, error_message: null,
  custom_input: null, custom_status: null, custom_output: null,
};
const done: Submission = {
  ...base, status: "completed", passed: 1, total: 2, correctness_ratio: 0.5,
  results: [
    { label: "Sample 1", is_hidden: false, status: "wrong_answer", runtime_ms: 12, memory_kb: 2048, input_data: "1 2", expected_output: "3", output_excerpt: "4" },
    { label: "Hidden 1", is_hidden: true, status: "accepted", runtime_ms: 9, memory_kb: 2048, input_data: null, expected_output: null, output_excerpt: null },
  ],
};

function stubFetch(calls: { url: string; body?: string }[], posted: Submission = base) {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body as string | undefined });
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
    if (init?.method === "POST") return json(posted, 202);
    if (url.includes("/submissions/s1")) return json(done);
    return json({ items: [], total: 0, page: 1, page_size: 10 });
  }));
}
afterEach(() => vi.unstubAllGlobals());
const renderWs = () => render(<ToastProvider><Workspace challenge={challenge} pollMs={5} /></ToastProvider>);

test("submit asks for confirmation, then polls and shows results without hidden details", async () => {
  const calls: { url: string; body?: string }[] = [];
  stubFetch(calls);
  renderWs();
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  expect(screen.getByRole("dialog")).toHaveTextContent("hidden ones");
  expect(calls.some((c) => c.url.endsWith("/submissions") && c.body)).toBe(false); // nothing sent before confirming
  fireEvent.click(screen.getByRole("button", { name: "Submit solution" }));
  expect(await screen.findByText(/1 of 2 tests passed/, {}, { timeout: 3000 })).toBeInTheDocument();
  expect(screen.getByText("Hidden 1")).toBeInTheDocument();
  expect(screen.getByText("Wrong answer")).toBeInTheDocument();
  expect(screen.getByText("Your output")).toBeInTheDocument(); // visible failing sample shows detail
  expect(screen.getAllByText("Input")).toHaveLength(1);          // hidden test shows none
});

test("run with custom input sends custom_input and never uses the submissions endpoint", async () => {
  const calls: { url: string; body?: string }[] = [];
  stubFetch(calls, { ...base, is_run_only: true, custom_input: "7 8" });
  renderWs();
  fireEvent.click(screen.getByLabelText("Run with custom input"));
  fireEvent.change(screen.getByLabelText("Custom input"), { target: { value: "7 8" } });
  fireEvent.click(screen.getByRole("button", { name: "Run" }));
  await screen.findByText(/Waiting for the code runner|Running your code/);
  const post = calls.find((c) => c.body)!;
  expect(post.url).toMatch(/\/challenges\/c1\/run$/);
  expect(JSON.parse(post.body!).custom_input).toBe("7 8");
});

test("shows an error toast when the server refuses the request", async () => {
  vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: RequestInit) =>
    init?.method === "POST"
      ? new Response(JSON.stringify({ error: { message: "You have several runs in progress. Wait for one to finish." } }), { status: 429 })
      : new Response(JSON.stringify({ items: [], total: 0, page: 1, page_size: 10 }), { status: 200 })));
  renderWs();
  fireEvent.click(screen.getByRole("button", { name: "Run" }));
  expect(await screen.findByText(/runs in progress/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Run" })).toBeEnabled();
});
