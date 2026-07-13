const { tokenize } = require("./miscue");

function wordCount(text) {
  return tokenize(text).length;
}

function wpm(words, secs) {
  if (!secs) return 0;
  return Math.round((words / secs) * 60);
}

function totalMiscues(m) {
  return Object.values(m || {}).reduce((a, b) => a + (b || 0), 0);
}

function wordScore(words, miscues) {
  if (!words) return 0;
  return Math.round(((words - miscues) / words) * 1000) / 10;
}

function levelOf(score) {
  return score >= 97 ? "Independent" : score >= 90 ? "Instructional" : "Frustration";
}

function compLevelOf(pct) {
  return pct >= 80 ? "Independent" : pct >= 59 ? "Instructional" : "Frustration";
}

function profileOf(wordLevel, compLevel) {
  const rank = { Independent: 0, Instructional: 1, Frustration: 2 };
  const worse = Math.max(rank[wordLevel], rank[compLevel]);
  return ["Independent", "Instructional", "Frustration"][worse];
}

function metricsFor({ words, miscues, seconds, correct, items }) {
  const tm = totalMiscues(miscues);
  const score = wordScore(words, tm);
  const acc = items ? Math.round((correct / items) * 100) : 0;
  const level = levelOf(score);
  const compLevel = compLevelOf(acc);
  return {
    words, tm, score, items, correct, acc,
    wpm: wpm(words, seconds),
    level, compLevel,
    profile: profileOf(level, compLevel)
  };
}

module.exports = { wordCount, wpm, totalMiscues, wordScore, levelOf, compLevelOf, profileOf, metricsFor };
