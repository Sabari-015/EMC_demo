const PDFJS_VERSION = "3.11.174";
const CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

/* The script tag in index.html loads pdf.js up front. If that failed (offline,
   blocked CDN) we try once more, and reject so the caller can fall back. */
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${CDN}/pdf.min.js`;
    script.onload = () => (window.pdfjsLib ? resolve() : reject(new Error("pdf.js unavailable")));
    script.onerror = () => reject(new Error("pdf.js unavailable"));
    document.head.append(script);
  });
}

/* Pull the text layer out of a PDF, in the browser, with pdf.js.
   The worker is the heavy half of pdf.js and runs off the main thread, so a
   40-page PDF does not freeze the page while it is parsed. */
export async function extractPdfText(file) {
  await loadPdfJs();

  window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${CDN}/pdf.worker.min.js`;

  const buffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;

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
