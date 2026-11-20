import { useState, useEffect, useRef } from "react";
import { HistoryFileViewer } from "./HistoryFileViewer";

const STORAGE_KEY = "customer-conversation-manager-v5";
const SEPARATOR = "\n========================================\n";
const HEADINGS = [
    "Conversation so far",
    "Customer messages not yet answered",
    "Latest customer message",
];



const SAMPLE_QUERY = `### Conversation so far
Customer: Hi!
Agent: Hi! Welcome to JBL support. How can I help you today?

### Customer messages not yet answered
Customer: My speaker won't connect.

### Latest customer message
My speaker won't connect.`;

const EMPTY_DATA = {
  started: false,
  conversation: "",
  unanswered: [], // array of customer messages (without "Customer: " prefix)
  latest: "",
  history: [], // one formatted snapshot per step, from initial query to last update
};

/* ---------- Parsing & formatting ---------- */

export function getSection(text, heading, allHeadings) {
  const start = text.toLowerCase().indexOf(`### ${heading.toLowerCase()}`);
  if (start === -1) return null;

  const bodyStart = text.indexOf("\n", start);
  if (bodyStart === -1) return "";

  // Section ends at the next known heading (or end of text)
  let end = text.length;
  for (const other of allHeadings) {
    if (other === heading) continue;
    const idx = text.toLowerCase().indexOf(`### ${other.toLowerCase()}`, bodyStart);
    if (idx !== -1 && idx < end) end = idx;
  }

  return text.slice(bodyStart + 1, end).trim();
}

function parseInitialQuery(raw) {
  const text = raw.replace(/\r\n/g, "\n").trim();

  const conversation = getSection(text, HEADINGS[0], HEADINGS);
  const unansweredRaw = getSection(text, HEADINGS[1], HEADINGS);
  const latestRaw = getSection(text, HEADINGS[2], HEADINGS);

  if (conversation === null || unansweredRaw === null || latestRaw === null) {
    throw new Error(
      'The query must contain all three sections: "### Conversation so far", "### Customer messages not yet answered" and "### Latest customer message".'
    );
  }

  // Each unanswered message starts with "Customer:". Lines without the prefix
  // are treated as a continuation of the previous message.
  const unanswered = [];
  unansweredRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      if (/^Customer:/i.test(line)) {
        unanswered.push(line.replace(/^Customer:\s*/i, ""));
      } else if (unanswered.length) {
        unanswered[unanswered.length - 1] += ` ${line}`;
      } else {
        unanswered.push(line);
      }
    });

  const latest = latestRaw || unanswered[unanswered.length - 1] || "";

  return { conversation, unanswered, latest };
}

function formatSnapshot({ conversation, unanswered, latest }) {
  return `### Conversation so far
${conversation}

### Customer messages not yet answered
${unanswered.map((m) => `Customer: ${m}`).join("\n")}

### Latest customer message
${latest}`;
}

/* ---------- Storage ---------- */

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...EMPTY_DATA, ...JSON.parse(saved) };
  } catch (error) {
    console.error("Loading failed:", error);
  }
  return EMPTY_DATA;
}

export default function App() {
  const [data, setData] = useState(loadData);

  const [initialInput, setInitialInput] = useState("");
  const [initialError, setInitialError] = useState("");
  const [agentInput, setAgentInput] = useState("");
  const [customerInput, setCustomerInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState("current"); // "current" | "history"

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Saving failed:", error);
    }
  }, [data]);

  // Load the initial query pasted by the user
  function startConversation() {
    try {
      const parsed = parseInitialQuery(initialInput);
      setData({
        started: true,
        ...parsed,
        history: [formatSnapshot(parsed)],
      });
      setInitialError("");
      setInitialInput("");
    } catch (error) {
      setInitialError(error.message);
    }
  }

  function updateConversation(e) {
    e.preventDefault();

    const agentMessage = agentInput.trim();
    const customerMessage = customerInput.trim();
    if (!agentMessage && !customerMessage) return;

    setData((prev) => {
      let conversation = prev.conversation.trim();
      let unanswered = [...prev.unanswered];

      // When the agent replies, all pending customer messages move into
      // the conversation, followed by the agent's reply.
      if (agentMessage) {
        unanswered.forEach((m) => {
          conversation += `\nCustomer: ${m}`;
        });
        conversation += `\nAgent: ${agentMessage}`;
        unanswered = [];
      }

      // New customer message waits in "not yet answered"
      if (customerMessage) {
        unanswered.push(customerMessage);
      }

      const next = {
        conversation,
        unanswered,
        latest: customerMessage || prev.latest,
      };

      return {
        ...prev,
        ...next,
        history: [...prev.history, formatSnapshot(next)],
      };
    });

    setAgentInput("");
    setCustomerInput("");
  }

  // Every snapshot from the initial query to the latest update
  function generateFullHistory() {
    return data.history.join(SEPARATOR);
  }

  function exportConversation() {
    const content = generateFullHistory();
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `customer-conversation-${new Date()
      .toISOString()
      .slice(0, 10)}.txt`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function copyOutput() {
    try {
      const text =
        view === "history" ? generateFullHistory() : formatSnapshot(data);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Unable to copy conversation.");
    }
  }

  function resetConversation() {
    if (!window.confirm("Reset and start with a new initial query?")) return;
    setData(EMPTY_DATA);
    setAgentInput("");
    setCustomerInput("");
    setView("current");
  }

  const displayedOutput = data.started
    ? view === "history"
      ? generateFullHistory()
      : formatSnapshot(data)
    : "";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Customer Conversation Manager</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage customer and agent messages
            </p>
          </div>

          {data.started && (
            <div className="flex gap-2">
              <button
                onClick={resetConversation}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-100"
              >
                Reset
              </button>
              <button
                onClick={exportConversation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
              >
                ↓ Export conversation
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!data.started ? (
          /* ---------- Initial query step ---------- */
          <section className="bg-white border rounded-xl p-6 shadow-sm max-w-4xl mx-auto">
            <h2 className="text-lg font-bold mb-1">Initial query</h2>
            <p className="text-sm text-slate-500 mb-4">
              Paste the starting conversation. It must include the three
              sections shown in the placeholder.
            </p>

            <textarea
              value={initialInput}
              onChange={(e) => {
                setInitialInput(e.target.value);
                if (initialError) setInitialError("");
              }}
              placeholder={SAMPLE_QUERY}
              rows={18}
              className="w-full border rounded-lg p-4 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
            />

            {initialError && (
              <p className="text-sm text-red-600 mt-3">{initialError}</p>
            )}

            <button
              onClick={startConversation}
              disabled={!initialInput.trim()}
              className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg text-sm font-semibold"
            >
              Start conversation
            </button>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ---------- Input section ---------- */}
            <section className="bg-white border rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-1">Update conversation</h2>
              <p className="text-sm text-slate-500 mb-6">
                Enter the agent response and the next customer message.
              </p>

              <form onSubmit={updateConversation}>
                <label className="block text-sm font-semibold mb-2">
                  Agent response
                </label>
                <textarea
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.target.value)}
                  placeholder="Enter agent response..."
                  rows={5}
                  className="w-full border rounded-lg p-4 text-sm mb-6 focus:ring-2 focus:ring-green-500 outline-none"
                />

                <label className="block text-sm font-semibold mb-2">
                  New customer message
                </label>
                <textarea
                  value={customerInput}
                  onChange={(e) => setCustomerInput(e.target.value)}
                  placeholder="Enter new customer message..."
                  rows={5}
                  className="w-full border rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />

                <div className="mt-4 flex items-center justify-between gap-4">
                  <button
                    type="submit"
                    disabled={!agentInput.trim() && !customerInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg text-sm font-semibold"
                  >
                    Update conversation
                  </button>
                  <span className="text-sm text-slate-500">
                    {data.history.length} step
                    {data.history.length === 1 ? "" : "s"} saved
                  </span>
                </div>
              </form>
            </section>

            {/* ---------- Output section ---------- */}
            <section className="bg-white border rounded-xl p-6 shadow-sm">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
                <div className="flex rounded-lg border overflow-hidden text-sm">
                  <button
                    onClick={() => setView("current")}
                    className={`px-3 py-2 ${
                      view === "current"
                        ? "bg-slate-900 text-white"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    Current step
                  </button>
                  <button
                    onClick={() => setView("history")}
                    className={`px-3 py-2 border-l ${
                      view === "history"
                        ? "bg-slate-900 text-white"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    Full history (export)
                  </button>
                </div>

                <button
                  onClick={copyOutput}
                  className="border rounded-lg px-3 py-2 text-sm hover:bg-slate-100"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <div className="bg-slate-950 rounded-lg p-5 overflow-auto max-h-[850px] min-h-[550px]">
                <pre className="text-xs sm:text-sm leading-6 text-slate-100 whitespace-pre-wrap break-words font-mono">
                  {displayedOutput}
                </pre>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                Automatically saved in browser local storage.
              </p>
            </section>
          </div>
        )}

        {/* ---------- History file viewer (always available) ---------- */}
        <HistoryFileViewer />
      </main>
    </div>
  );
}