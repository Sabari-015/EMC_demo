/* The skills we score against, with a weight (how much it counts towards 100)
   and a group so we can tell the learner what to work on. */
export const TARGET_SKILLS = [
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
export const SECTIONS = [
  { label: "contact details", test: (t) => /@[\w.-]+\.\w{2,}/.test(t) },
  { label: "a summary or objective", test: (t) => /(summary|objective|profile)\b/i.test(t) },
  { label: "work experience", test: (t) => /(experience|employment|internship)\b/i.test(t) },
  { label: "education", test: (t) => /(education|b\.?tech|bachelor|degree|university)\b/i.test(t) },
  { label: "projects", test: (t) => /\bprojects?\b/i.test(t) },
];

/* Stand-in used when a PDF has no text layer (a scan is just a picture of
   text) or when pdf.js itself fails to load from the CDN. The report says so. */
export const MOCK_RESUME = `Sabari Murugan
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
