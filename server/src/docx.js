const {
  Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  AlignmentType, BorderStyle, VerticalAlign, Packer, HeadingLevel, PageOrientation
} = require("docx");

const MISCUE_TYPES = [
  { key: "mis", label: "Mispronunciation", fil: "(Maling Bigkas)" },
  { key: "om", label: "Omission", fil: "(Pagkakaltas)" },
  { key: "sub", label: "Substitution", fil: "(Pagpapalit)" },
  { key: "ins", label: "Insertion", fil: "(Pagsisingit)" },
  { key: "rep", label: "Repetition", fil: "(Pag-uulit)" },
  { key: "tra", label: "Transposition", fil: "(Pagpapalit ng lugar)" },
  { key: "rev", label: "Reversal", fil: "(Paglilipat)" }
];

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

function cell(text, opts = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    columnSpan: opts.span,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.shade ? { fill: opts.shade } : undefined,
    borders: opts.noBorder ? undefined : cellBorders,
    children: [new Paragraph({
      alignment: opts.left ? AlignmentType.LEFT : AlignmentType.CENTER,
      children: [new TextRun({ text: String(text ?? ""), bold: !!opts.b, italics: !!opts.i, size: opts.sz || 18 })]
    })]
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
    spacing: { after: opts.after ?? 120 },
    children: [new TextRun({ text: String(text ?? ""), bold: !!opts.b, italics: !!opts.i, size: opts.sz || 22 })]
  });
}

async function toBuffer(doc) {
  return Packer.toBuffer(doc);
}

// ---- Assignment sheet (title, passage, questions) ----
function buildAssignmentDoc(a, classroomName) {
  const qParas = [];
  a.questions.forEach((q, i) => {
    qParas.push(para(`${i + 1}. ${q.text}`, { b: true, after: 60 }));
    q.options.forEach((o, oi) => {
      qParas.push(para(`     ${["A", "B", "C", "D"][oi]}. ${o}`, { after: 40, sz: 20 }));
    });
  });
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        para("Project HIBARU · Remedial Reading Assignment", { b: true, sz: 28, center: true, after: 40 }),
        para("Taft National High School (303529) · Division of Eastern Samar · Region VIII", { center: true, sz: 18 }),
        para(""),
        para(`Title: ${a.title}`, { b: true, sz: 24 }),
        para(`Class/Section: ${classroomName || ""}   ·   Genre: ${a.genre}   ·   Deadline: ${a.deadline}`),
        para(`Attempts: ${a.attempts}   ·   Time Limit: ${a.timeLimit}   ·   Pronunciation Sensitivity: ${a.sensitivity}`),
        para(`Instructions: ${a.instructions}`, { i: true }),
        para(""),
        para(`Reading Passage (${a.wordCount} words):`, { b: true, after: 60 }),
        para(a.passage),
        para(""),
        para("Comprehension Questions:", { b: true }),
        ...qParas
      ]
    }]
  });
  return toBuffer(doc);
}

// ---- Consolidated classroom report (landscape table, all learners) ----
function buildConsolidatedDoc(classroomName, assignment, males, females) {
  const NCOLS = 13;
  const headerRow1 = new TableRow({
    children: [
      cell("#", { b: true }), cell("LEARNER'S NAME", { b: true }),
      cell("PART A", { b: true, span: 6 }), cell("PART B", { b: true, span: 4 }),
      cell("Learner's Reading Profile", { b: true })
    ]
  });
  const headerRow2 = new TableRow({
    children: [
      cell(""), cell(""),
      cell("Total Time", { b: true, span: 2 }), cell("Reading Rate", { b: true }), cell("Score", { b: true }), cell("%", { b: true }), cell("Comp. Level", { b: true }),
      cell("Total Miscues", { b: true }), cell("Words in Passage", { b: true }), cell("Reading Score", { b: true }), cell("Reading Level", { b: true }),
      cell("")
    ]
  });
  const headerRow3 = new TableRow({
    children: [
      cell(""), cell(""),
      cell("Minutes", { i: true }), cell("Seconds", { i: true }), cell(""), cell(""), cell(""), cell(""),
      cell(""), cell(""), cell(""), cell(""),
      cell("")
    ]
  });
  const titleRow = new TableRow({
    children: [cell("Consolidated Learner's Record", { b: true, span: NCOLS, shade: "FFFF00", sz: 22 })]
  });

  function learnerRow(n, stu) {
    if (!stu) {
      return new TableRow({ children: [cell(n), cell("", { left: true }), cell(""), cell(""), cell(""), cell("", { shade: "EDEDED" }), cell(""), cell(""), cell("", { shade: "EDEDED" }), cell("", { shade: "EDEDED" }), cell(""), cell(""), cell("")] });
    }
    if (!stu.metrics) {
      const status = stu.status === "in-progress" ? "In progress" : "Not started";
      return new TableRow({
        children: [cell(n), cell(stu.name, { left: true }), cell("—"), cell("—"), cell("—"), cell("—", { shade: "EDEDED" }), cell("—"), cell("—"), cell("—", { shade: "EDEDED" }), cell("—", { shade: "EDEDED" }), cell("—"), cell("—"), cell(status)]
      });
    }
    const m = stu.metrics;
    const mins = Math.floor(stu.seconds / 60) + ":" + String(stu.seconds % 60).padStart(2, "0");
    return new TableRow({
      children: [
        cell(n), cell(stu.name, { left: true }),
        cell(mins), cell(String(stu.seconds)), cell(m.wpm + " wpm"), cell(`${m.correct}/${m.items}`, { shade: "EDEDED" }), cell(m.acc + "%"), cell(m.compLevel),
        cell(String(m.tm), { shade: "EDEDED" }), cell(String(m.words), { shade: "EDEDED" }), cell(m.score + "%"), cell(m.level),
        cell(m.profile)
      ]
    });
  }

  function sexBlock(label, list) {
    const rows = [new TableRow({ children: [cell(label + ":", { b: true, span: NCOLS, left: true })] })];
    const n = Math.max(10, list.length);
    for (let i = 0; i < n; i++) rows.push(learnerRow(i + 1, list[i]));
    return rows;
  }

  const rows = [
    titleRow, headerRow1, headerRow2, headerRow3,
    ...sexBlock("MALE", males), ...sexBlock("FEMALE", females),
    new TableRow({ children: [cell("Prepared by:", { b: true, span: 6, left: true }), cell("Reviewed by:", { b: true, span: 7, left: true })] }),
    new TableRow({ children: [cell("_________________________", { span: 6, left: true }), cell("PEARL C. MACALALAD", { b: true, span: 7, left: true })] }),
    new TableRow({ children: [cell("Teacher", { i: true, span: 6, left: true }), cell("HT-VI / Eng. & Fil. Department", { i: true, span: 7, left: true })] })
  ];

  const table = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });

  const doc = new Document({
    sections: [{
      properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
      children: [
        para("Phil-IRI for JHS Form 3", { b: true, sz: 20, right: true }),
        para(`Class / Section: ${classroomName}   ·   Reading Selection: ${assignment.title} (${assignment.wordCount} words)   ·   ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, { sz: 18 }),
        para(""),
        table
      ]
    }]
  });
  return toBuffer(doc);
}

// ---- Phil-IRI Form 3 Learner's Record (single or bulk, one section per record) ----
function form3Section(rec) {
  const responsesLeft = [];
  const responsesRight = [];
  rec.responses.forEach((rr, i) => {
    const row = new TableRow({
      children: [
        cell(`${rr.n}.`, { left: true, noBorder: true }),
        cell(`${rr.letter} ${rr.mark}`, { b: true, noBorder: true })
      ]
    });
    if (i < 5) responsesLeft.push(row); else responsesRight.push(row);
  });
  const responseTable = new Table({
    width: { size: 60, type: WidthType.PERCENTAGE },
    rows: rec.responses.map(rr => new TableRow({
      children: [
        cell(`${rr.n}.`, { left: true, noBorder: true, sz: 20 }),
        cell(`${rr.letter} ${rr.mark}`, { b: true, noBorder: true, sz: 20 })
      ]
    }))
  });

  const miscueRows = rec.miscueRows.map(mr => new TableRow({
    children: [
      cell(mr.n, { b: true }),
      cell(`${mr.label} ${mr.fil}`, { left: true }),
      cell(mr.count)
    ]
  }));
  const miscueTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell("", { b: true }), cell("Types of Miscues", { b: true }), cell("Number of Miscues", { b: true })] }),
      ...miscueRows,
      new TableRow({ children: [cell("Total Miscues", { b: true, span: 2, left: true }), cell(rec.tm, { b: true })] }),
      new TableRow({ children: [cell("Number of Words in the Passage", { b: true, span: 2, left: true }), cell(rec.words)] }),
      new TableRow({ children: [cell("Word Reading Score", { b: true, span: 2, left: true }), cell(rec.score + "%", { b: true })] })
    ]
  });

  return [
    para("LEARNER'S RECORD", { b: true, sz: 24, after: 200 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [cell("Student's Name", { b: true, left: true, noBorder: true }), cell(rec.name, { left: true, noBorder: true })] }),
        new TableRow({ children: [cell("Grade & Section", { b: true, left: true, noBorder: true }), cell(rec.grade, { left: true, noBorder: true })] }),
        new TableRow({ children: [cell("School", { b: true, left: true, noBorder: true }), cell(rec.school, { left: true, noBorder: true })] }),
        new TableRow({ children: [cell("Division", { b: true, left: true, noBorder: true }), cell(rec.division, { left: true, noBorder: true })] }),
        new TableRow({ children: [cell("Region", { b: true, left: true, noBorder: true }), cell(rec.region, { left: true, noBorder: true })] }),
        new TableRow({ children: [cell("Reading Selection", { b: true, left: true, noBorder: true }), cell(rec.selection, { left: true, noBorder: true })] })
      ]
    }),
    para(""),
    para(`PART A — Comprehension Level: ${rec.compLevel}`, { b: true, after: 100 }),
    para(`Total time in Reading the Text: ${rec.minutes} minutes (= ${rec.seconds} seconds)`),
    para(`Reading Rate: ${rec.wpm} words per minute`),
    para(`Responses to Questions: Score ${rec.correct} / ${rec.items} = ${rec.acc}%`, { after: 100 }),
    responseTable,
    para(""),
    para(`PART B — Word Reading Level: ${rec.level}`, { b: true, after: 100 }),
    miscueTable,
    para(""),
    para(`PART C — Reading Profile: ${rec.profile}`, { b: true, after: 300 })
  ];
}

function buildForm3BulkDoc(records) {
  const children = [];
  records.forEach((rec, i) => {
    if (i > 0) children.push(new Paragraph({ children: [], pageBreakBefore: true }));
    children.push(...form3Section(rec));
  });
  const doc = new Document({ sections: [{ properties: {}, children }] });
  return toBuffer(doc);
}

module.exports = { buildAssignmentDoc, buildConsolidatedDoc, buildForm3BulkDoc, MISCUE_TYPES };
