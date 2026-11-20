import { useState, useEffect, useRef } from "react";
import { getSection } from "./App";


// Splits an exported history .txt file into steps. Steps are separated by a
// line made only of "=" characters (the SEPARATOR used by the export).

const SEPARATOR = "\n========================================\n";
const HEADINGS = [
    "Conversation so far",
    "Customer messages not yet answered",
    "Latest customer message",
];


function parseHistoryFile(raw) {
    const text = raw.replace(/\r\n/g, "\n");

    return text
        .split(/^\s*={10,}\s*$/m)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map((snapshot, index) => {
            const sections = HEADINGS.map((title) => ({
                title,
                body: getSection(snapshot, title, HEADINGS),
            }));
            return {
                step: index + 1,
                raw: snapshot,
                sections,
                hasSections: sections.some((s) => s.body !== null),
            };
        });
}

export function HistoryFileViewer() {
    const [fileName, setFileName] = useState("");
    const [steps, setSteps] = useState([]);
    const [error, setError] = useState("");
    const [copiedKey, setCopiedKey] = useState(null);
    const inputRef = useRef(null);

    function handleFile(e) {
        const file = e.target.files?.[0];
        e.target.value = ""; // lets the same file be uploaded again
        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".txt")) {
            setError("Choose a .txt file exported from this app.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const parsed = parseHistoryFile(String(reader.result || ""));
            setFileName(file.name);
            if (!parsed.length) {
                setSteps([]);
                setError("This file is empty. Choose an exported conversation file.");
            } else {
                setSteps(parsed);
                setError("");
            }
        };
        reader.onerror = () => setError("The file could not be read. Try again.");
        reader.readAsText(file);
    }

    async function copyText(text, key) {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
        } catch {
            alert("Unable to copy text.");
        }
    }

    function clearFile() {
        setSteps([]);
        setFileName("");
        setError("");
    }

    const allText = steps.map((s) => s.raw).join(SEPARATOR);

    return (
        <section className="bg-white border rounded-xl p-6 shadow-sm mt-6">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
                <div>
                    <h2 className="text-lg font-bold mb-1">View a history file</h2>
                    <p className="text-sm text-slate-500">
                        Upload an exported .txt file to see every step and copy any part of it.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".txt,text/plain"
                        onChange={handleFile}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                    >
                        {fileName ? "Upload another file" : "Upload .txt file"}
                    </button>
                    {steps.length > 0 && (
                        <>
                            <button
                                type="button"
                                onClick={() => copyText(allText, "all")}
                                className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-100"
                            >
                                {copiedKey === "all" ? "Copied!" : "Copy all"}
                            </button>
                            <button
                                type="button"
                                onClick={clearFile}
                                className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-100"
                            >
                                Clear
                            </button>
                        </>
                    )}
                </div>
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            {fileName && steps.length > 0 && (
                <p className="text-sm text-slate-500 mb-4">
                    {fileName} — {steps.length} step{steps.length === 1 ? "" : "s"}
                </p>
            )}

            {steps.length > 0 && (
                <div className="space-y-4 max-h-[900px] overflow-auto pr-1">
                    {steps.map((s) => (
                        <article key={s.step} className="border rounded-lg overflow-hidden">
                            <div className="flex justify-between items-center bg-slate-100 px-4 py-2">
                                <h3 className="text-sm font-semibold">Step {s.step}</h3>
                                <button
                                    type="button"
                                    onClick={() => copyText(s.raw, `step-${s.step}`)}
                                    className="border bg-white rounded-md px-3 py-1 text-xs hover:bg-slate-50"
                                >
                                    {copiedKey === `step-${s.step}` ? "Copied!" : "Copy step"}
                                </button>
                            </div>

                            {s.hasSections ? (
                                <div className="divide-y">
                                    {s.sections
                                        .filter((sec) => sec.body !== null)
                                        .map((sec) => {
                                            const key = `step-${s.step}-${sec.title}`;
                                            const sectionText = `### ${sec.title}\n${sec.body}`;
                                            return (
                                                <div key={sec.title} className="p-4">
                                                    <div className="flex justify-between items-center mb-2 gap-3">
                                                        <h4 className="text-xs font-semibold text-slate-600">
                                                            {sec.title}
                                                        </h4>
                                                        <div className="flex gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => copyText(sec.body, `${key}-body`)}
                                                                className="border rounded-md px-2 py-1 text-xs hover:bg-slate-100"
                                                                title="Copy the text only"
                                                            >
                                                                {copiedKey === `${key}-body` ? "Copied!" : "Copy text"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => copyText(sectionText, `${key}-full`)}
                                                                className="border rounded-md px-2 py-1 text-xs hover:bg-slate-100"
                                                                title="Copy with the ### heading"
                                                            >
                                                                {copiedKey === `${key}-full` ? "Copied!" : "Copy with heading"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <pre className="bg-slate-950 text-slate-100 rounded-md p-3 text-xs sm:text-sm leading-6 whitespace-pre-wrap break-words font-mono">
                                                        {sec.body || "(empty)"}
                                                    </pre>
                                                </div>
                                            );
                                        })}
                                </div>
                            ) : (
                                <pre className="bg-slate-950 text-slate-100 p-4 text-xs sm:text-sm leading-6 whitespace-pre-wrap break-words font-mono">
                                    {s.raw}
                                </pre>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}