import { useRef, useState } from "react";
import { analyzeText } from "../lib/analyze.js";
import { extractPdfText } from "../lib/pdf.js";
import { MOCK_RESUME } from "../data/skills.js";

const MAX_BYTES = 5 * 1024 * 1024;

export default function UploadPanel({ file, setFile, error, setError, status, setStatus, setReport }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const working = status === "working";

  function accept(candidate) {
    setError("");

    if (candidate.size > MAX_BYTES) {
      reject("That file is over 5 MB. Try a smaller version.");
      return;
    }
    if (!/\.(pdf|txt|md)$/i.test(candidate.name)) {
      reject("Only PDF, TXT or MD files are supported.");
      return;
    }

    setFile(candidate);
  }

  function reject(message) {
    setFile(null);
    setError(message);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) accept(dropped);
  }

  async function analyze() {
    if (!file) return;

    const isPdf = /\.pdf$/i.test(file.name);
    setStatus("working");

    let text;
    let simulated = false;
    let simulatedReason = "";

    if (isPdf) {
      // A scanned PDF is only an image of text: it parses without error and
      // yields nothing, so catch that rather than scoring a blank page.
      text = await extractPdfText(file).catch(() => "");
      if (text.replace(/\s/g, "").length < 50) {
        text = MOCK_RESUME;
        simulated = true;
        simulatedReason =
          "this PDF had no readable text layer (a scan is just an image of text), so the report is based on a sample resume.";
      }
    } else {
      text = await file.text();
    }

    setReport({ ...analyzeText(text), simulated, simulatedReason });
    setStatus("idle");
  }

  return (
    <section className="panel" id="upload">
      <h2>1. Upload your resume</h2>

      <div
        className={`dropzone${dragging ? " is-dragging" : ""}${file ? " is-filled" : ""}`}
        tabIndex={0}
        role="button"
        aria-label="Upload a resume file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={onDrop}
      >
        <svg className="dropzone__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <p className="dropzone__title">Drag &amp; drop your resume here</p>
        <p className="dropzone__hint">
          or <span className="dropzone__link">browse files</span> — PDF, TXT or MD, up to 5 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md"
          hidden
          onChange={(e) => {
            if (e.target.files[0]) accept(e.target.files[0]);
          }}
        />
      </div>

      {file && (
        <p className="filemeta">
          Selected: {file.name} ({formatSize(file.size)})
        </p>
      )}
      {error && <p className="error">{error}</p>}

      <button type="button" className="btn btn--full" disabled={!file || working} onClick={analyze}>
        {working ? "Reading PDF…" : "Analyze resume"}
      </button>
    </section>
  );
}

function formatSize(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
