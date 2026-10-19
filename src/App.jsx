import { useState } from "react";
import UploadPanel from "./components/UploadPanel.jsx";
import Report from "./components/Report.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import Faq from "./components/Faq.jsx";

export default function App() {
  // The whole app is driven by three pieces of state: the chosen file, whether
  // a parse is in flight, and the finished report. No DOM manipulation.
  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | working
  const [error, setError] = useState("");

  function reset() {
    setFile(null);
    setReport(null);
    setStatus("idle");
    setError("");
  }

  return (
    <>
      <Header onCheck={() => scrollTo("upload")} />
      <main>
        <Hero onUpload={() => scrollTo("upload")} />
        <UploadPanel
          file={file}
          setFile={setFile}
          error={error}
          setError={setError}
          status={status}
          setStatus={setStatus}
          setReport={setReport}
        />
        {report && <Report report={report} onReset={reset} />}
        <HowItWorks />
        <Faq />
      </main>
      <Footer />
    </>
  );
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Header({ onCheck }) {
  return (
    <header className="nav">
      <div className="nav__brand">
        <span className="nav__mark">R</span>
        ResumeIQ
      </div>
      <nav className="nav__links">
        <a href="#how">How it works</a>
        <a href="#score">Scoring</a>
        <a href="#faq">FAQ</a>
      </nav>
      <button type="button" className="btn btn--small" onClick={onCheck}>
        Check my resume
      </button>
    </header>
  );
}

function Hero({ onUpload }) {
  return (
    <section className="hero">
      <p className="pill">Mock demo — your file never leaves this page</p>
      <h1>
        Score your resume
        <br />
        before a recruiter does.
      </h1>
      <p className="hero__sub">
        Upload a resume and get an instant match score, the skills you already show, and the ones
        the job market keeps asking for that are missing.
      </p>
      <button type="button" className="btn" onClick={onUpload}>
        Upload resume
      </button>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <p>ResumeIQ — a front-end mock built with React, HTML and CSS.</p>
    </footer>
  );
}
