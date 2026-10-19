import { useEffect, useRef, useState } from "react";
import { scoreColour, verdict, tipsFor } from "../lib/analyze.js";
// Skills are analysed in ../lib/analyze.js; the list lives in ../data/skills.js.

const RING_LENGTH = 2 * Math.PI * 52; // matches r="52" in the SVG

export default function Report({ report, onReset }) {
  const { score, found, missing, sectionHits, simulated, simulatedReason } = report;
  const { label, note } = verdict(report);
  const tips = tipsFor(report);

  return (
    <section className="panel results" id="score">
      <h2>2. Your report</h2>

      <div className="report">
        <ScoreRing score={score} />
        <div className="report__summary">
          <h3>{label}</h3>
          <p>{note}</p>
          <p className="disclaimer">
            {simulated
              ? `Demo mode: ${simulatedReason}`
              : "Scored from the text layer of the file you uploaded."}
          </p>
        </div>
      </div>

      <div className="skills">
        <div className="skills__col">
          <h4>
            Skills found <span className="count">{found.length}</span>
          </h4>
          <Chips skills={found} variant="found" />
        </div>
        <div className="skills__col">
          <h4>
            Skills missing <span className="count count--warn">{missing.length}</span>
          </h4>
          <Chips skills={missing} variant="missing" />
        </div>
      </div>

      <ul className="tips">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>

      <button type="button" className="btn btn--ghost" onClick={onReset}>
        Check another resume
      </button>
    </section>
  );
}

/* The ring's dash offset animates once the component is on screen, so the
   transition has a settled frame to run from. */
function ScoreRing({ score }) {
  const [offset, setOffset] = useState(RING_LENGTH);
  const [shown, setShown] = useState(0);
  const frame = useRef();

  useEffect(() => {
    frame.current = requestAnimationFrame(() => setOffset(RING_LENGTH * (1 - score / 100)));
    return () => cancelAnimationFrame(frame.current);
  }, [score]);

  // Count the number up alongside the ring, easing out so it decelerates.
  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    let raf;
    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setShown(Math.round(score * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div className="score">
      <svg viewBox="0 0 120 120" className="score__ring" aria-hidden="true">
        <circle className="score__track" cx="60" cy="60" r="52" />
        <circle
          className="score__bar"
          cx="60"
          cy="60"
          r="52"
          style={{
            strokeDasharray: RING_LENGTH,
            strokeDashoffset: offset,
            stroke: scoreColour(score),
          }}
        />
      </svg>
      <div className="score__value">
        <strong>{shown}</strong>
        <span>/ 100</span>
      </div>
    </div>
  );
}

function Chips({ skills, variant }) {
  if (skills.length === 0) {
    return (
      <ul className="chips">
        <li className="skill--missing">None — nice.</li>
      </ul>
    );
  }

  return (
    <ul className="chips">
      {skills.map((skill) => (
        <li
          key={skill.name}
          className={`skill--${variant}`}
          title={
            variant === "found"
              ? `${skill.name} — mentioned ${skill.mentions}× (${skill.group})`
              : `${skill.name} — would add ${skill.weight} points (${skill.group})`
          }
        >
          {skill.name}
        </li>
      ))}
    </ul>
  );
}

// (skill list lives in src/data/skills.js)

