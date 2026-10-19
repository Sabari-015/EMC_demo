export default function HowItWorks() {
  const cards = [
    {
      title: "Skill coverage",
      body: "Each skill on the target list your resume mentions adds points. The list is weighted — the deeper into the stack, the more it counts.",
    },
    {
      title: "Keyword context",
      body: "A skill named once in a list scores less than one described inside a project bullet. Context is what recruiters actually read.",
    },
    {
      title: "Structure",
      body: "Contact block, summary, experience, education. A parser has to find your sections before a human can skim them.",
    },
  ];

  return (
    <section className="panel" id="how">
      <h2>How the score is built</h2>
      <div className="cards">
        {cards.map((card) => (
          <article className="card" key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
