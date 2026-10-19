import { useState } from "react";

const QUESTIONS = [
  {
    q: "Is my resume uploaded anywhere?",
    a: "No. This is a front-end mock — the file is read in your browser and nothing is sent to a server.",
  },
  {
    q: "How is my PDF read?",
    a: (
      <>
        With <code>pdf.js</code>, which runs in your browser and reads the PDF's text layer — the
        file is never uploaded. A scanned PDF is only an image of text, so it has no text layer and
        falls back to a sample resume.
      </>
    ),
  },
  {
    q: "Can I change the target skill list?",
    a: (
      <>
        Yes — edit <code>TARGET_SKILLS</code> in <code>src/data/skills.js</code> to match the roles
        you are applying for.
      </>
    ),
  },
];

export default function Faq() {
  // A single open index keeps this a controlled component rather than relying
  // on <details>, which React would not re-render predictably.
  const [open, setOpen] = useState(null);

  return (
    <section className="panel" id="faq">
      <h2>FAQ</h2>
      {QUESTIONS.map((item, i) => (
        <div className="faq__item" key={item.q}>
          <button
            type="button"
            className="faq__q"
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
          >
            {item.q}
          </button>
          {open === i && <p className="faq__a">{item.a}</p>}
        </div>
      ))}
    </section>
  );
}
