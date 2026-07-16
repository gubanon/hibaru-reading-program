const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

async function extractTextFromBuffer(buffer, filename) {
  const name = (filename || "").toLowerCase();
  if (name.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  if (name.endsWith(".pdf")) {
    const data = await pdfParse(buffer);
    return data.text;
  }
  return buffer.toString("utf8");
}

// Recognizes a documented convention so teachers get a fully-formed
// multiple-choice question with zero typing, e.g.:
//   1. What is the capital of the Philippines?
//   A. Cebu
//   B. Davao
//   C. Manila
//   D. Baguio
//   Answer: C
// Anything that doesn't fully match (missing options and/or an answer line)
// still comes through as a question with whatever options WERE found, but
// `correct` is left at -1 (not 0) so an unfilled/undetected answer can never
// silently pass as "option A is correct" — the teacher has to pick one.
const QUESTION_RE = /^\s*(?:\d+[.)]\s*)?(.+\?)\s*$/;
const OPTION_RE = /^\s*\(?([A-Da-d])[.):]\s*(.+?)\s*$/;
const ANSWER_RE = /^\s*(?:correct\s*answer|answer|correct)\s*[:\-]?\s*\(?([A-Da-d])\)?\.?\s*$/i;
const LETTERS = ["A", "B", "C", "D"];

function parseQuestionsFromText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const blocks = [];
  let current = null;
  const pushCurrent = () => { if (current) blocks.push(current); current = null; };

  for (const line of lines) {
    const ansMatch = line.match(ANSWER_RE);
    if (ansMatch && current) { current.correctLetter = ansMatch[1].toUpperCase(); continue; }

    const optMatch = line.match(OPTION_RE);
    if (optMatch && current && current.options.length < 4) { current.options.push(optMatch[2].trim()); continue; }

    const qMatch = !optMatch && line.match(QUESTION_RE);
    if (qMatch) { pushCurrent(); current = { text: qMatch[1].trim(), options: [], correctLetter: null }; continue; }
    // any other stray line (blank instructions, decorative text) is ignored
  }
  pushCurrent();

  return blocks
    .filter(b => b.text.length > 8)
    .map(b => {
      const options = [0, 1, 2, 3].map(i => b.options[i] || "");
      const correctIdx = b.correctLetter ? LETTERS.indexOf(b.correctLetter) : -1;
      return { text: b.text, options, correct: correctIdx };
    });
}

module.exports = { extractTextFromBuffer, parseQuestionsFromText };
