import fs from 'fs';
import { parse } from '@babel/parser';

const code = fs.readFileSync('src/MapEditor2.jsx', 'utf8');
const toolButtonIndex = code.indexOf('const ToolButton');
const prefix = toolButtonIndex !== -1 ? code.slice(0, toolButtonIndex) : code;

try {
  const ast = parse(prefix, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log('Babel parse: OK, program body length:', ast.program.body.length);
} catch (e) {
  console.error('Babel parse error:');
  console.error('Message:', e.message);
  console.error('Loc:', e.loc);
  const { line, column } = e.loc || {};
  if (line != null) {
    const lines = code.split('\n');
    const ctx = lines.slice(Math.max(0, line - 3), line + 2);
    console.log('Context:');
    ctx.forEach((l, idx) => {
      const ln = line - 2 + idx;
      console.log(String(ln).padStart(4, ' '), '│', l);
    });
  }
}
