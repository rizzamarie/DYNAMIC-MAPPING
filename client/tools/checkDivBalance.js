import fs from 'node:fs';

const source = fs.readFileSync('src/MapEditor2.jsx', 'utf8');

const openRegex = /<div\b/gi;
const closeRegex = /<\/div>/gi;

// Collect opening <div> positions, skipping self-closing "<div ... />"
const openPositions = [];
let m;
while ((m = openRegex.exec(source)) !== null) {
  const start = m.index;
  const end = source.indexOf('>', start);
  if (end === -1) continue;
  const tagText = source.slice(start, end + 1);
  if (tagText.includes('/>')) {
    continue;
  }
  openPositions.push(start);
}

// Collect closing </div> positions
const closePositions = [];
while ((m = closeRegex.exec(source)) !== null) {
  closePositions.push(m.index);
}

console.log('non-self-closing <div> tags:', openPositions.length);
console.log('close </div> tags:', closePositions.length);

// Simple stack-based matching to find unmatched opening <div>
const stack = [];
const events = [];

for (const index of openPositions) {
  events.push({ index, type: 'open' });
}
for (const index of closePositions) {
  events.push({ index, type: 'close' });
}

events.sort((a, b) => a.index - b.index);

for (const e of events) {
  if (e.type === 'open') {
    stack.push(e.index);
  } else if (stack.length) {
    stack.pop();
  }
}

if (stack.length) {
  console.log('Unmatched opening <div> positions (line:column):');
  for (const idx of stack) {
    const upTo = source.slice(0, idx);
    const line = upTo.split('\n').length;
    const col = idx - upTo.lastIndexOf('\n');
    console.log(`  at ${line}:${col}`);
  }
} else {
  console.log('All <div> tags are balanced.');
}
