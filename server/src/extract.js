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

function parseQuestionsFromText(text) {
  return text.split("\n")
    .map(l => l.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(l => l.length > 8 && l.includes("?"));
}

module.exports = { extractTextFromBuffer, parseQuestionsFromText };
