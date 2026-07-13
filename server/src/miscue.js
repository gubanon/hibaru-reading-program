// Speech-to-text miscue analysis.
//
// Browser ASR (Web Speech API) returns standard-spelled words even when a
// student mispronounces them, so true phoneme-level mispronunciation/letter
// reversal detection isn't possible from a transcript alone. This module does
// a word-level alignment (Wagner–Fischer edit distance + backtrace) between
// the expected passage and what the student actually said, then classifies
// each discrepancy into the closest Phil-IRI miscue category:
//   - omission / insertion: word missing from / added to the transcript
//   - repetition: an inserted word that repeats the word just read
//   - transposition: two adjacent words read in swapped order
//   - substitution: a different word read in place of the expected one
//   - mispronunciation: a "substitution" whose transcript word is spelled
//     close enough to the expected word (edit distance) that it's more
//     likely a garbled pronunciation than a different word choice
//   - reversal: transcript word is the letter-reverse of the expected word
// This is a best-effort approximation, not a clinical measurement.

function normWord(w) {
  return (w || "").toLowerCase().replace(/[^a-z']/g, "");
}

function tokenize(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean);
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function reverseStr(s) {
  return s.split("").reverse().join("");
}

/**
 * @param {string} passageText
 * @param {string} transcriptText
 * @returns {{ miscues: Record<string, number>, marked: Array<{word:string, type:string|null}> }}
 */
function analyze(passageText, transcriptText) {
  const passage = tokenize(passageText);
  const transcript = tokenize(transcriptText);
  const A = passage.map(normWord);
  const B = transcript.map(normWord);
  const m = A.length, n = B.length;

  // Wagner–Fischer edit distance DP with backtrace, ops: match/sub/del(omission)/ins.
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (A[i - 1] === B[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const ops = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && A[i - 1] === B[j - 1]) {
      ops.push({ type: "match", ai: i - 1, bi: j - 1 });
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.push({ type: "sub", ai: i - 1, bi: j - 1 });
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push({ type: "del", ai: i - 1, bi: null }); // omission
      i--;
    } else {
      ops.push({ type: "ins", ai: null, bi: j - 1 }); // insertion
      j--;
    }
  }
  ops.reverse();

  const miscues = { mis: 0, om: 0, sub: 0, ins: 0, rep: 0, tra: 0, rev: 0 };
  const markType = new Array(m).fill(null);
  let lastReadWord = null;

  for (let k = 0; k < ops.length; k++) {
    const op = ops[k];
    if (op.type === "match") {
      lastReadWord = A[op.ai];
      continue;
    }
    if (op.type === "del") {
      miscues.om++;
      markType[op.ai] = "om";
      continue;
    }
    if (op.type === "ins") {
      if (lastReadWord && B[op.bi] === lastReadWord) {
        miscues.rep++; // repeated the word just read
      } else {
        miscues.ins++;
      }
      continue;
    }
    if (op.type === "sub") {
      // transposition: this sub and the next sub are a swapped adjacent pair
      const next = ops[k + 1];
      if (next && next.type === "sub" && A[op.ai] === B[next.bi] && A[next.ai] === B[op.bi]) {
        miscues.tra++;
        markType[op.ai] = "tra";
        markType[next.ai] = "tra";
        k++; // consume the paired op
        lastReadWord = B[next.bi];
        continue;
      }
      if (A[op.ai].length > 2 && B[op.bi] === reverseStr(A[op.ai])) {
        miscues.rev++;
        markType[op.ai] = "rev";
      } else {
        const dist = levenshtein(A[op.ai], B[op.bi]);
        const closeEnough = dist <= Math.max(1, Math.ceil(A[op.ai].length / 3));
        if (closeEnough) {
          miscues.mis++;
          markType[op.ai] = "mis";
        } else {
          miscues.sub++;
          markType[op.ai] = "sub";
        }
      }
      lastReadWord = B[op.bi];
    }
  }

  const marked = passage.map((w, idx) => ({ word: w, type: markType[idx] }));
  return { miscues, marked };
}

module.exports = { analyze, tokenize };
