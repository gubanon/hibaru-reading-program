const en = {
  tasksSub: "Your reading tasks",
  due: "Due", wordsLbl: "words",
  ctaStart: "Start task →", ctaRetry: "Try again",
  attempts: "attempts", submitted: "Submitted ✓", assigned: "Assigned", inProgress: "In progress",
  step1: "STEP 1 OF 3 · VOCABULARY WARM-UP", step1Title: "Practice these words first",
  step1Sub: "Tap each word, say it aloud, and it unlocks.",
  tapSay: "🔊 Tap & say it", unlocked: "✓ Unlocked", listening: "🎙 Listening…",
  startReading: "Start reading →", unlockFirst: "Unlock all {n} words first",
  step2: "STEP 2 OF 3 · READ ALOUD", timeLbl: "TIME", limitLbl: "limit:",
  camOn: "CAMERA · MIC ON", finished: "✓ I finished reading",
  step3: "STEP 3 OF 3 · COMPREHENSION CHECK", step3Title: "Answer the questions",
  step3Sub: "Answer the questions about what you read.",
  submitBtn: "Submit answers ✓", answerAll: "Answer all questions",
  doneTitle: "Task submitted!", doneSub: "Great job. Here's how you did:",
  backDash: "← Back to dashboard",
  readingRate: "READING RATE", wordScore: "WORD SCORE", readingLevel: "READING LEVEL", comprehension: "COMPREHENSION",
  readingTime: "reading time", miscuesDetected: "miscues detected", wordReadingLevel: "word reading level",
  myResults: "My Results", noResults: "No submitted tasks yet — finish a reading task to see your results here.",
  myProfile: "My Profile", saveProfile: "Save / Update", profileSaved: "✓ Profile updated.",
  surname: "SURNAME", givenName: "GIVEN NAME", mi: "M.I.", sexLbl: "SEX", male: "Male", female: "Female",
  gradeSection: "GRADE & SECTION", emailLbl: "DEPED EMAIL"
};

const fil = {
  tasksSub: "Mga gawain mo sa pagbasa",
  due: "Hanggang", wordsLbl: "salita",
  ctaStart: "Simulan ang gawain →", ctaRetry: "Subukang muli",
  attempts: "pagkakataon", submitted: "Naipasa ✓", assigned: "Nakatakda", inProgress: "Isinasagawa",
  step1: "HAKBANG 1 NG 3 · PAGSASANAY SA TALASALITAAN", step1Title: "Sanayin muna ang mga salitang ito",
  step1Sub: "Pindutin ang bawat salita, sabihin nang malakas, at mabubuksan ito.",
  tapSay: "🔊 Pindutin at sabihin", unlocked: "✓ Nabuksan", listening: "🎙 Nakikinig…",
  startReading: "Simulan ang pagbasa →", unlockFirst: "Buksan muna ang lahat ng {n} salita",
  step2: "HAKBANG 2 NG 3 · BASAHIN NANG MALAKAS", timeLbl: "ORAS", limitLbl: "takda:",
  camOn: "KAMERA · MIKROPONO BUKAS", finished: "✓ Tapos na akong magbasa",
  step3: "HAKBANG 3 NG 3 · PAGSUSULIT SA PAG-UNAWA", step3Title: "Sagutin ang mga tanong",
  step3Sub: "Sagutin ang mga tanong tungkol sa binasa.",
  submitBtn: "Ipasa ang mga sagot ✓", answerAll: "Sagutin ang lahat ng tanong",
  doneTitle: "Naipasa na ang gawain!", doneSub: "Mahusay! Narito ang iyong resulta:",
  backDash: "← Bumalik sa dashboard",
  readingRate: "BILIS NG PAGBASA", wordScore: "ISKOR SA SALITA", readingLevel: "ANTAS NG PAGBASA", comprehension: "PAG-UNAWA",
  readingTime: "oras ng pagbasa", miscuesDetected: "mga mali na natukoy", wordReadingLevel: "antas ng pagbasa ng salita",
  myResults: "Aking mga Resulta", noResults: "Wala pang naipasang gawain — tapusin ang isang gawain upang makita ang resulta dito.",
  myProfile: "Aking Profile", saveProfile: "I-save / I-update", profileSaved: "✓ Na-update ang profile.",
  surname: "APELYIDO", givenName: "PANGALAN", mi: "M.I.", sexLbl: "KASARIAN", male: "Lalaki", female: "Babae",
  gradeSection: "BAITANG & SEKSYON", emailLbl: "DEPED EMAIL"
};

export function strings(lang) {
  return lang === "fil" ? fil : en;
}
