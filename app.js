/* ResumeIQ — mock resume parser.
   Front end only. TXT/MD files are read for real, and PDFs are read for real
   too via pdf.js (its text layer, in the browser). Nothing is uploaded. */

/* The skills we score against, with a weight (how much it counts towards 100)
   and a group so we can tell the learner what to work on. */
const TARGET_SKILLS = [
  { name: "HTML", weight: 6, group: "core" },
  { name: "CSS", weight: 6, group: "core" },
  { name: "JavaScript", weight: 10, group: "core", aliases: ["js", "es6"] },
  { name: "React", weight: 9, group: "frontend" },
  { name: "TypeScript", weight: 7, group: "frontend", aliases: ["ts"] },
  { name: "Git", weight: 6, group: "tooling", aliases: ["github", "gitlab"] },
  { name: "REST APIs", weight: 6, group: "backend", aliases: ["rest", "api"] },
  { name: "Node.js", weight: 7, group: "backend", aliases: ["node"] },
  { name: "SQL", weight: 6, group: "backend", aliases: ["mysql", "postgres", "postgresql"] },
  { name: "Testing", weight: 6, group: "quality", aliases: ["jest", "vitest", "unit test"] },
  { name: "Accessibility", weight: 5, group: "quality", aliases: ["a11y", "wcag"] },
  { name: "Docker", weight: 5, group: "devops" },
  { name: "CI/CD", weight: 5, group: "devops", aliases: ["github actions", "pipeline"] },
  { name: "System design", weight: 6, group: "senior", aliases: ["architecture", "scalability"] },
  { name: "Communication", weight: 5, group: "soft", aliases: ["mentored", "presented", "led"] },
];

/* The sections a parser looks for before it can score structure. */
const SECTIONS = [
  { label: "contact details", test: (t) => /@[\w.-]+\.\w{2,}/.test(t) },
  { label: "a summary or objective", test: (t) => /(summary|objective|profile)\b/i.test(t) },
  { label: "work experience", test: (t) => /(experience|employment|internship)\b/i.test(t) },
  { label: "education", test: (t) => /(education|b\.?tech|bachelor|degree|university)\b/i.test(t) },
  { label: "projects", test: (t) => /\bprojects?\b/i.test(t) },
];

/* Stand-in used when a PDF has no text layer (a scan is just a picture of
   text) or when pdf.js itself fails to load from the CDN. The report says so. */
const MOCK_RESUME = `Sabari Murugan
sabari@example.com | github.com/Sabari-015 | Chennai, India

Summary
Front-end focused developer building accessible, responsive interfaces.

Experience
Junior Developer, The Dev Labs — 2024 to present
Built a component library in React and TypeScript, wrote Jest unit tests.
Shipped REST APIs with Node.js and documented them for the team.
Used Git and GitHub Actions for review and deployment.

Projects
Portfolio site — semantic HTML, CSS grid, keyboard-navigable navigation.
Task tracker — CRUD app with Express and MySQL.

Education
B.Tech Computer Science, 2023`;

// ---------------------------------------------------------------- elements
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const filemeta = document.getElementById("filemeta");
const errorEl = document.getElementById("error");
const analyzeBtn = document.getElementById("analyzeBtn");
const results = document.getElementById("results");
const resetBtn = document.getElementById("resetBtn");
const scoreBar = document.getElementById("scoreBar");
const scoreValue = document.getElementById("scoreValue");
const scoreLabel = document.getElementById("scoreLabel");
const scoreNote = document.getElementById("scoreNote");
const parseNote = document.getElementById("parseNote");
const foundList = document.getElementById("foundList");
const missingList = document.getElementById("missingList");
const foundCount = document.getElementById("foundCount");
const missingCount = document.getElementById("missingCount");
const tipsEl = document.getElementById("tips");

const MAX_BYTES = 5 * 1024 * 1024;
const RING_LENGTH = 2 * Math.PI * 52; // matches r="52" in the SVG
const PDFJS_VERSION = "3.11.174";

let selectedFile = null;

// ---------------------------------------------------------------- upload UI
["dragenter", "dragover"].forEach((type) =>
  dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    dropzone.classList.add("is-dragging");
  })
);

["dragleave", "drop"].forEach((type) =>
  dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    dropzone.classList.remove("is-dragging");
  })
);

dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) selectFile(file);
});

// Clicking anywhere on the box, or pressing Enter/Space, opens the picker.
dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) selectFile(fileInput.files[0]);
});

function selectFile(file) {
  hideError();

  if (file.size > MAX_BYTES) {
    rejectFile("That file is over 5 MB. Try a smaller version.");
    return;
  }
  if (!/\.(pdf|txt|md)$/i.test(file.name)) {
    rejectFile("Only PDF, TXT or MD files are supported.");
    return;
  }

  selectedFile = file;
  dropzone.classList.add("is-filled");
  filemeta.hidden = false;
  filemeta.textContent = `Selected: ${file.name} (${formatSize(file.size)})`;
  analyzeBtn.disabled = false;
}

function rejectFile(message) {
  selectedFile = null;
  fileInput.value = "";
  dropzone.classList.remove("is-filled");
  filemeta.hidden = true;
  analyzeBtn.disabled = true;
  errorEl.hidden = false;
  errorEl.textContent = message;
}

function hideError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

function formatSize(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------- analyze
analyzeBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  const isPdf = /\.pdf$/i.test(selectedFile.name);

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = isPdf ? "Reading PDF…" : "Analyzing…";

  let text;
  let simulated = false;
  let simulatedReason = "";

  if (isPdf) {
    text = await extractPdfText(selectedFile).catch(() => "");
    // A scanned PDF is only an image of text: it parses without error and
    // yields nothing, so catch that rather than scoring a blank page.
    if (text.replace(/\s/g, "").length < 50) {
      text = MOCK_RESUME;
      simulated = true;
      simulatedReason = "this PDF had no readable text layer (a scan is just an image of text), so the report is based on a sample resume.";
    }
  } else {
    text = await selectedFile.text();
  }

  // A short pause so the "Reading PDF…" state is visible. Real work is already
  // done by this point; this is the mock's theatre, and it also lets the ring
  // animation start from a settled frame.
  await new Promise((r) => setTimeout(r, 400));

  renderReport(analyzeText(text), simulated, simulatedReason);

  analyzeBtn.textContent = "Analyze resume";
  analyzeBtn.disabled = false;
});

/* Pull the text layer out of a PDF, in the browser, with pdf.js.
   The worker is the heavy half of pdf.js and runs off the main thread, so a
   40-page PDF does not freeze the page while it is parsed. */
async function extractPdfText(file) {
  await loadPdfJs();

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();

    // Each item is a run of text with its own position on the page. hasEOL
    // marks where the PDF itself ended a line; without it every line would run
    // together and "Experience" could merge into the word before it.
    let line = "";
    const lines = [];
    for (const item of content.items) {
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = "";
      }
    }
    if (line) lines.push(line);

    pages.push(lines.join("\n"));
  }

  return pages.join("\n\n");
}

/* The script tag in index.html loads pdf.js up front. If that failed (offline,
   blocked CDN) we try once more, and throw so the caller falls back. */
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
    script.onload = () => (window.pdfjsLib ? resolve() : reject(new Error("pdf.js unavailable")));
    script.onerror = () => reject(new Error("pdf.js unavailable"));
    document.head.append(script);
  });
}

/* The actual "parser": lowercase the text once, then look for each skill name
   and its aliases as whole words. */
function analyzeText(rawText) {
  const text = rawText.toLowerCase();

  const found = [];
  const missing = [];

  for (const skill of TARGET_SKILLS) {
    const needles = [skill.name, ...(skill.aliases || [])];
    const hit = needles.some((needle) => containsWord(text, needle));

    if (hit) {
      // Mentions beyond the first add a little bonus, capped, so a resume that
      // describes a skill in context beats one that lists it once.
      const mentions = needles.reduce((n, needle) => n + countWord(text, needle), 0);
      found.push({ ...skill, mentions });
    } else {
      missing.push(skill);
    }
  }

  const totalWeight = TARGET_SKILLS.reduce((sum, s) => sum + s.weight, 0);
  const foundWeight = found.reduce(
    (sum, s) => sum + s.weight * Math.min(1.25, 0.85 + (s.mentions - 1) * 0.1),
    0
  );

  const sectionHits = SECTIONS.filter((s) => s.test(text));
  const sectionScore = sectionHits.length / SECTIONS.length;

  // 75% of the score comes from skills, 25% from structure.
  const skillScore = foundWeight / totalWeight;
  const score = Math.round((skillScore * 0.75 + sectionScore * 0.25) * 100);

  return { score, found, missing, sectionHits };
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWord(text, needle) {
  // \b only works next to word characters, so for names like "C++" or
  // "Node.js" we fall back to a plain substring check.
  if (!/^\w+$/.test(needle)) return text.includes(needle);
  return new RegExp(`\\b${escapeRegExp(needle)}\\b`).test(text);
}

function countWord(text, needle) {
  if (!/^\w+$/.test(needle)) return text.split(needle).length - 1;
  return (text.match(new RegExp(`\\b${escapeRegExp(needle)}\\b`, "g")) || []).length;
}

// ---------------------------------------------------------------- render
function renderReport(report, simulated, simulatedReason) {
  results.hidden = false;

  // Ring: stroke-dashoffset animates from full length down to the gap.
  scoreBar.style.strokeDasharray = RING_LENGTH;
  scoreBar.style.strokeDashoffset = RING_LENGTH;
  requestAnimationFrame(() => {
    scoreBar.style.strokeDashoffset = RING_LENGTH * (1 - report.score / 100);
  });

  countUp(scoreValue, report.score);
  scoreBar.style.stroke = scoreColour(report.score);

  const { label, note } = verdict(report);
  scoreLabel.textContent = label;
  scoreNote.textContent = note;
  parseNote.textContent = simulated
    ? `Demo mode: ${simulatedReason}`
    : "Scored from the text layer of the file you uploaded.";

  renderChips(foundList, report.found, "found");
  renderChips(missingList, report.missing, "missing");
  foundCount.textContent = report.found.length;
  missingCount.textContent = report.missing.length;

  renderTips(report);

  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scoreColour(score) {
  if (score >= 75) return "var(--good)";
  if (score >= 45) return "var(--warn)";
  return "var(--bad)";
}

function verdict({ score, found, missing, sectionHits }) {
  if (score >= 80) {
    return {
      label: "Strong match",
      note: "This resume covers most of what the target roles ask for. Tighten the wording of your bullets and apply.",
    };
  }
  if (score >= 55) {
    return {
      label: "Promising — a few gaps",
      note: `You already show ${found.length} of ${TARGET_SKILLS.length} target skills. Closing ${Math.min(3, missing.length)} of the missing ones would move this into strong-match territory.`,
    };
  }
  if (score >= 30) {
    return {
      label: "Early stage",
      note: "The core is there but the resume leaves out a lot of what is being asked for. Add the missing skills once you have actually used them.",
    };
  }
  return {
    label: "Needs work",
    note: sectionHits.length < 3
      ? "The parser could barely find your sections — start by giving the resume a clear summary, experience and education structure."
      : "Very little of the target skill set appears. This is a useful starting checklist rather than a rejection.",
  };
}

function renderChips(listEl, skills, variant) {
  listEl.innerHTML = "";
  if (skills.length === 0) {
    if (variant === "missing") {
      const li = document.createElement("li");
      li.className = "skill--missing";
      li.textContent = "None — nice.";
      listEl.append(li);
    }
    return;
  }
  for (const skill of skills) {
    const li = document.createElement("li");
    li.className = `skill--${variant}`;
    li.title =
      variant === "found"
        ? `${skill.name} — mentioned ${skill.mentions}× (${skill.group})`
        : `${skill.name} — would add ${skill.weight} points (${skill.group})`;
    li.textContent = skill.name;
    listEl.append(li);
  }
}

function renderTips({ missing, found, sectionHits }) {
  const tips = [];

  const missingSections = SECTIONS.filter((s) => !sectionHits.includes(s)).map((s) => s.label);
  if (missingSections.length) {
    tips.push(`Add the sections a parser expects: ${missingSections.join(", ")}.`);
  }

  // Suggest the heaviest missing skills first — best return for the effort.
  const topMissing = [...missing].sort((a, b) => b.weight - a.weight).slice(0, 3);
  if (topMissing.length) {
    tips.push(
      `Biggest point gains: ${topMissing.map((s) => `${s.name} (+${s.weight})`).join(", ")}. Only add them once you have used them in a project.`
    );
  }

  const thinSkills = found.filter((s) => s.mentions === 1);
  if (thinSkills.length) {
    tips.push(
      `Mentioned only once, so scored lightly: ${thinSkills.slice(0, 4).map((s) => s.name).join(", ")}. Describe them inside a project bullet for more weight.`
    );
  }

  tips.push("Keep bullets to one line, start with an action verb, and end with a measurable result.");

  tipsEl.innerHTML = "";
  for (const tip of tips) {
    const li = document.createElement("li");
    li.textContent = tip;
    tipsEl.append(li);
  }
}

function countUp(el, target) {
  const start = performance.now();
  const duration = 900;
  function frame(now) {
    const progress = Math.min(1, (now - start) / duration);
    // ease-out so the number decelerates instead of ticking linearly
    el.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3)));
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- reset
resetBtn.addEventListener("click", () => {
  selectedFile = null;
  fileInput.value = "";
  dropzone.classList.remove("is-filled");
  filemeta.hidden = true;
  analyzeBtn.disabled = true;
  results.hidden = true;
  hideError();
  document.getElementById("upload").scrollIntoView({ behavior: "smooth", block: "start" });
});
