
import { useState, useEffect } from "react";

const INITIAL_CONVERSATION = `Customer: Hi!
Agent: Hi! Welcome to JBL support. How can I help you today?
Customer: I'm doing good, thanks. How are you?
Agent: I'm doing great, thank you for asking! What can I help you with today?
Customer: That's good to hear. I just wanted to ask something about my speaker.
Agent: Of course! I'll be happy to help. Could you tell me what's happening?
Customer: I've been trying to connect my speaker to my phone, but it's not connecting anymore. It was working perfectly fine a few days ago.
Customer: My phone can detect the speaker, but whenever I tap on it to connect, the connection fails.
Agent: I can help with that. What's the exact model of your JBL speaker?
Customer: I couldn't find the model earlier, so I had to check the speaker again.
Agent: No problem. If you find the model name later, feel free to reach out again and I'll help you.
Customer: Hey, I'm back. I checked the bottom of the speaker properly, and it's a JBL Flip 7.
Customer: I still have the same Bluetooth issue. My phone shows the speaker, but it just won't connect.
Agent: Let’s first check the Bluetooth light on your JBL Flip 7, since that tells us what state it’s in. What’s the Bluetooth indicator doing right now: solid, blinking, or off?
Customer: It's actually solid. It's been staying solid even when I try connecting from my phone.
Agent: Since the light’s solid, your JBL Flip 7 is connected to another device. Please turn off Bluetooth on any phone, tablet, or computer it may have used before, then try connecting from your phone again in the Bluetooth settings. Was your phone able to connect after that?`;

const INITIAL_UNANSWERED =
  "No, it still won't connect. I turned off Bluetooth on my old phone and tablet, but my current phone still can't connect.";

const STORAGE_KEY = "customer-conversation-manager-v4";

function getInitialData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.error("Loading failed:", error);
  }

  return {
    conversation: INITIAL_CONVERSATION,
    unanswered: INITIAL_UNANSWERED,
    latest: INITIAL_UNANSWERED,
  };
}

export default function App() {
  const [data, setData] = useState(getInitialData);

  const [agentInput, setAgentInput] = useState("");
  const [customerInput, setCustomerInput] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);


  function updateConversation(e) {
    e.preventDefault();

    const agentMessage = agentInput.trim();
    const customerMessage = customerInput.trim();

    if (!agentMessage && !customerMessage) return;

    setData((prev) => {
      let conversation = prev.conversation.trim();

      // 1. Append existing unanswered customer message
      // to Conversation so far, only when an agent responds
      if (agentMessage && prev.unanswered.trim()) {
        conversation += `\nCustomer: ${prev.unanswered.trim()}`;
      }

      // 2. Append new agent response
      if (agentMessage) {
        conversation += `\nAgent: ${agentMessage}`;
      }

      // 3. Keep new customer message outside conversation history
      return {
        conversation,
        unanswered: customerMessage || prev.unanswered,
        latest: customerMessage || prev.latest,
      };
    });

    setAgentInput("");
    setCustomerInput("");
  }


  // Generate output in requested format
  function generateOutput() {
    return `### Conversation so far
${data.conversation}

### Customer messages not yet answered
${data.unanswered ? `Customer: ${data.unanswered}` : ""}

### Latest customer message
${data.latest}`;
  }

  // Export complete output
  function exportConversation() {
    const content = generateOutput();

    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8",
    });

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

  // Copy output
  async function copyConversation() {
    try {
      await navigator.clipboard.writeText(generateOutput());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Unable to copy conversation.");
    }
  }

  // Reset conversation
  function resetConversation() {
    if (!window.confirm("Reset conversation?")) return;

    setData({
      conversation: INITIAL_CONVERSATION,
      unanswered: INITIAL_UNANSWERED,
      latest: INITIAL_UNANSWERED,
    });

    setAgentInput("");
    setCustomerInput("");
  }

  const fullOutput = generateOutput();

  const messages = data.conversation
    .split("\n")
    .filter((line) => /^(Customer|Agent):/.test(line));

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Customer Conversation Manager
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage customer and agent messages
            </p>
          </div>

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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Input section */}
          <section className="bg-white border rounded-xl p-6 shadow-sm">

            <h2 className="text-lg font-bold mb-1">
              Update conversation
            </h2>

            <p className="text-sm text-slate-500 mb-6">
              Enter the agent response and latest customer message.
            </p>

            <form onSubmit={updateConversation}>

              {/* Agent input */}
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

              {/* Customer input */}
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

              <div className="mt-4">

                <button
                  type="submit"
                  disabled={!agentInput.trim() && !customerInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg text-sm font-semibold"
                >
                  Update conversation →
                </button>
              </div>
            </form>

          </section>

          {/* Output */}
          <section className="bg-white border rounded-xl p-6 shadow-sm">

            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-lg font-bold">
                  Generated conversation
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Live updated output
                </p>
              </div>

              <button
                onClick={copyConversation}
                className="border rounded-lg px-3 py-2 text-sm hover:bg-slate-100"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <div className="bg-slate-950 rounded-lg p-5 overflow-auto max-h-[850px] min-h-[550px]">
              <pre className="text-xs sm:text-sm leading-6 text-slate-100 whitespace-pre-wrap break-words font-mono">
                {fullOutput}
              </pre>
            </div>

            <p className="text-xs text-slate-400 mt-4">
              Automatically saved in browser local storage.
            </p>

          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
