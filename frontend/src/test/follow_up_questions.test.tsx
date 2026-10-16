import { fireEvent, render, screen } from "@testing-library/react";
import { FollowUpQuestions } from "../components/workspace/FollowUpQuestions";
import { ToastProvider } from "../components/Toast";
import type { StudentQuestion, StudentAnswer } from "../lib/api";

const mockQuestions: StudentQuestion[] = [
  {
    id: "q1",
    submission_id: "s1",
    category: "explain_algorithm",
    prompt: "In your own words, describe the algorithm your solution uses step by step.",
    position: 0,
  },
  {
    id: "q2",
    submission_id: "s1",
    category: "complexity",
    prompt: "What is the time complexity of your solution in Big-O notation, and why?",
    position: 1,
  },
];

afterEach(() => vi.unstubAllGlobals());

const renderFollowUp = (submissionId = "s1") =>
  render(
    <ToastProvider>
      <FollowUpQuestions submissionId={submissionId} />
    </ToastProvider>,
  );

test("renders loading state then displays follow-up questions", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/submissions/s1/questions")) {
        return new Response(JSON.stringify(mockQuestions), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    }),
  );

  renderFollowUp();
  expect(screen.getByText("Loading follow-up questions…")).toBeInTheDocument();

  expect(await screen.findByText("Follow-up questions")).toBeInTheDocument();
  expect(screen.getByText("Explain the algorithm")).toBeInTheDocument();
  expect(screen.getByText("Complexity")).toBeInTheDocument();
  expect(screen.getByText(mockQuestions[0].prompt)).toBeInTheDocument();
  expect(screen.getByText(mockQuestions[1].prompt)).toBeInTheDocument();

  // Ensure evaluation-only details are not present
  expect(screen.queryByText(/expected_points/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/grading guide/i)).not.toBeInTheDocument();
});

test("handles empty questions state", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })),
  );

  renderFollowUp();
  expect(
    await screen.findByText("No follow-up questions have been generated for this submission yet."),
  ).toBeInTheDocument();
});

test("handles fetch error state and allows retry", async () => {
  let failFirst = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (failFirst) {
        failFirst = false;
        return new Response(
          JSON.stringify({ error: { message: "Server error", code: "internal_error" } }),
          { status: 500 },
        );
      }
      return new Response(JSON.stringify(mockQuestions), { status: 200 });
    }),
  );

  renderFollowUp();
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Couldn't load the follow-up questions.");

  const retryButton = screen.getByRole("button", { name: "Try again" });
  fireEvent.click(retryButton);

  expect(await screen.findByText("Follow-up questions")).toBeInTheDocument();
});

test("submitting an answer handles empty validation, saves successfully, and allows replacing", async () => {
  const answerResponse: StudentAnswer = {
    id: "ans-1",
    question_id: "q1",
    answer_text: "My linear time solution.",
    score: null,
    feedback: null,
    submitted_at: new Date().toISOString(),
  };

  const requests: { url: string; body?: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      requests.push({ url, body: init?.body as string | undefined });
      if (init?.method === "POST" && url.includes("/questions/q1/answers")) {
        return new Response(JSON.stringify(answerResponse), { status: 201 });
      }
      if (url.includes("/submissions/s1/questions")) {
        return new Response(JSON.stringify(mockQuestions), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    }),
  );

  renderFollowUp();
  await screen.findByText("Follow-up questions");

  // Try submitting without text
  const submitButtons = screen.getAllByRole("button", { name: "Submit answer" });
  fireEvent.click(submitButtons[0]);
  expect(await screen.findByText("Write an answer before submitting.")).toBeInTheDocument();

  // Enter answer text in the first textarea
  const textareas = screen.getAllByRole("textbox");
  fireEvent.change(textareas[0], { target: { value: "My linear time solution." } });
  fireEvent.click(submitButtons[0]);

  // Answer is saved
  expect(await screen.findByText("Answer saved.")).toBeInTheDocument();
  expect(screen.getByText("Saved")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Replace answer" })).toBeInTheDocument();

  const postReq = requests.find((r) => r.url.endsWith("/questions/q1/answers"));
  expect(postReq).toBeDefined();
  expect(JSON.parse(postReq!.body!)).toEqual({ answer_text: "My linear time solution." });
});
