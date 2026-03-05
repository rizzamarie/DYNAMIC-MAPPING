import fs from 'fs';

const filePath = 'src/MapEditor2.jsx';
const s = fs.readFileSync(filePath, 'utf8');

const divStack = [];
let depth = 0;
let firstExtraClosing = -1;
let inString = null;
const braceStack = [];

for (let i = 0; i < s.length; i++) {
  const ch = s[i];

  if (inString) {
    if (ch === inString) inString = null;
    continue;
  }

  if (ch === '"' || ch === "'") {
    inString = ch;
    continue;
  }

  if (ch === '{') {
    depth++;
    braceStack.push(i);
  } else if (ch === '}') {
    depth--;
    if (depth < 0 && firstExtraClosing === -1) {
      firstExtraClosing = i;
    }
    braceStack.pop();
  }

  if (s.startsWith('<div', i) && depth === 0 && !inString) {
    let j = i + 4;
    let localDepth = 0;
    let localInString = null;
    for (; j < s.length; j++) {
      const cj = s[j];
      if (localInString) {
        if (cj === localInString) localInString = null;
        continue;
      }
      if (cj === '"' || cj === "'") {
        localInString = cj;
        continue;
      }
      if (cj === '{') {
        localDepth++;
        continue;
      }
      if (cj === '}') {
        localDepth = Math.max(0, localDepth - 1);
        continue;
      }
      if (cj === '>' && localDepth === 0) {
        let k = j - 1;
        while (k > i && /\s/.test(s[k])) k--;
        const selfClosing = s[k] === '/';
        if (!selfClosing) divStack.push(i);
        i = j;
        break;
      }
    }
  } else if (s.startsWith('</div', i) && depth === 0 && !inString) {
    if (divStack.length > 0) divStack.pop();
  }
}

console.log('File:', filePath);
console.log('Final depth (open { minus }):', depth);
if (firstExtraClosing !== -1) {
  console.log('First extra closing } at char index:', firstExtraClosing);
}
if (depth > 0) {
  console.log('Unmatched "{" positions (up to 10):');
  const lines = s.split('\n');
  const lineStartIdx = [];
  let acc = 0;
  for (let i = 0; i < lines.length; i++) {
    lineStartIdx.push(acc);
    acc += lines[i].length + 1;
  }
  const idxToLineCol = (idx) => {
    let line = 0;
    while (line + 1 < lineStartIdx.length && lineStartIdx[line + 1] <= idx) line++;
    const col = idx - lineStartIdx[line];
    return { line: line + 1, col };
  };
  braceStack.slice(-10).forEach((idx, n) => {
    const { line, col } = idxToLineCol(idx);
    console.log(`#${n + 1} at index`, idx, 'line', line, 'col', col);
    const ctxStart = Math.max(1, line - 2);
    const ctxEnd = Math.min(lines.length, line + 2);
    for (let ln = ctxStart; ln <= ctxEnd; ln++) {
      console.log(String(ln).padStart(4, ' '), '│', lines[ln - 1]);
    }
  });
}

console.log('Unmatched <div> openings:', divStack.length);
if (divStack.length > 0) {
  divStack.forEach((idx, n) => {
    console.log(`Unmatched #${n + 1} around index`, idx);
    console.log(s.slice(idx - 80, idx + 80));
  });
}
