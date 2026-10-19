import { TARGET_SKILLS, SECTIONS } from "../data/skills.js";

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* \b only works next to word characters, so for names like "C++" or "Node.js"
   we fall back to a plain substring check. */
function containsWord(text, needle) {
  if (!/^\w+$/.test(needle)) return text.includes(needle);
  return new RegExp(`\\b${escapeRegExp(needle)}\\b`).test(text);
}

function countWord(text, needle) {
  if (!/^\w+$/.test(needle)) return text.split(needle).length - 1;
  return (text.match(new RegExp(`\\b${escapeRegExp(needle)}\\b`, "g")) || []).length;
}

/* The actual "parser": lowercase the text once, then look for each skill name
   and its aliases as whole words. */
export function analyzeText(rawText) {
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

export function scoreColour(score) {
  if (score >= 75) return "var(--good)";
  if (score >= 45) return "var(--warn)";
  return "var(--bad)";
}

export function verdict({ score, found, missing, sectionHits }) {
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
    note:
      sectionHits.length < 3
        ? "The parser could barely find your sections — start by giving the resume a clear summary, experience and education structure."
        : "Very little of the target skill set appears. This is a useful starting checklist rather than a rejection.",
  };
}

/* Tips as data, so the component only has to render them. */
export function tipsFor({ missing, found, sectionHits }) {
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

  return tips;
}
