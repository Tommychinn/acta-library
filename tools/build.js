#!/usr/bin/env node
// Rebuild the position-dependent parts of the visualisation page from positions.json,
// so every variant block and every fill-in comes from one verified transcription.
const fs = require('fs');

const P = JSON.parse(fs.readFileSync('positions.json', 'utf8'));
let s = fs.readFileSync('new-viz.html', 'utf8');

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Source uses " - " as an aside dash and **bold** in the Directions line.
const typo = (t) => esc(t).replace(/ - /g, ' — ');
const bold = (t) => typo(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

function slice(startAnchor, endAnchor) {
  const i = s.indexOf(startAnchor);
  const j = s.indexOf(endAnchor, i);
  if (i === -1 || j === -1) throw new Error('anchor not found: ' + startAnchor.slice(0, 50));
  if (s.indexOf(startAnchor, i + 1) !== -1) throw new Error('anchor not unique: ' + startAnchor.slice(0, 50));
  return { i, j };
}
function replaceBetween(startAnchor, endAnchor, body) {
  const { i, j } = slice(startAnchor, endAnchor);
  s = s.slice(0, i + startAnchor.length) + body + s.slice(j);
}

const v = (p, inner, extraClass) =>
  `\n          <div class="variant${extraClass || ''}" data-var="${p.key}"${p.key === 'mid' ? '' : ' hidden'}>${inner}\n          </div>`;

// ---- tabs ----
replaceBetween(
  '<div class="postabs" role="tablist" aria-labelledby="poslabel">',
  '\n      </div>\n      <div class="playerbar">',
  P.map((p) =>
    `\n        <button class="postab" role="tab" type="button" data-pos="${p.key}" aria-selected="${p.key === 'mid'}">${esc(p.label)}</button>`
  ).join('')
);

// ---- scene beats ----
replaceBetween(
  '<p class="slothd">Scene <span style="font-weight:600;text-transform:none;letter-spacing:0">— swaps with position. One beat at a time, check in between.</span></p>',
  '\n        </div>\n      </li>\n\n      <li>\n        <span class="steplabel">Check in',
  P.map((p) => {
    const beats = p.scene
      .map((b) => `\n              <li>${typo(b)}</li>`)
      .join('\n              <li><p class="checkcue">check in</p></li>');
    return v(p, `\n            <ul class="beats">${beats}\n            </ul>`);
  }).join('')
);

// ---- option 1 ----
replaceBetween(
  `<p class="slothd">Option 1 <span style="font-weight:600;text-transform:none;letter-spacing:0">— swaps with position. Let them predict the defender's reaction.</span></p>`,
  '\n        </div>\n\n        <ul>\n          <li><strong class="ctx">If they stall',
  P.map((p) =>
    v(p, `\n            <ul>\n              <li>${typo(p.option1)}</li>\n              <li class="ctx-block">${typo(p.expect1)}</li>\n            </ul>`)
  ).join('')
);

// ---- option 2 ----
replaceBetween(
  '<p class="slothd">Option 2 <span style="font-weight:600;text-transform:none;letter-spacing:0">— swaps with position. Let them predict what the defender does differently.</span></p>',
  '\n        </div>\n\n        <ul>\n          <li class="ctx-block">Optional',
  P.map((p) =>
    v(p, `\n            <ul>\n              <li>${typo(p.option2)}</li>\n              <li class="ctx-block">${typo(p.expect2)}</li>\n            </ul>`)
  ).join('')
);

// ---- goalkeeper-only principle line ----
{
  const gk = P.find((p) => p.key === 'gk');
  replaceBetween(
    '<div class="slot variant" data-var="gk" hidden>\n          <p class="slothd">Position-specific extra</p>',
    '\n        </div>\n      </li>\n    </ol>',
    `\n          <ul><li>${typo(gk.extra)}</li></ul>`
  );
}

// ---- directions panel ----
replaceBetween(
  '<div class="dirs" id="directions">',
  '\n    </div>\n\n    <h2 id="step-by-step">',
  '\n      <p class="dirshd">Directions</p>' +
    P.map((p) =>
      `\n      <p class="variant dirsline" data-var="${p.key}"${p.key === 'mid' ? '' : ' hidden'}>${bold(p.directions)}</p>`
    ).join('')
);

// ---- fill-in table used by the resolver ----
{
  const pad = (t, n) => t + ' '.repeat(Math.max(0, n - t.length));
  const rows = P.map((p) => {
    const f = p.fills;
    return `    ${pad(p.key + ':', 10)}{ position:${pad(JSON.stringify(f.position) + ',', 22)}` +
      `passthrow:${pad(JSON.stringify(f.passthrow) + ',', 11)}` +
      `showedthem:${pad(JSON.stringify(f.showedthem) + ',', 44)}` +
      `spaceopens:${JSON.stringify(f.spaceopens)} }`;
  }).join(',\n');
  replaceBetween('  var FILLS = {', '\n  };\n  var BLANK', '\n' + rows);
  s = s.replace(
    "  var POSITIONS = ['mid','cb','winger','striker','fb','gk'];",
    '  var POSITIONS = [' + P.map((p) => `'${p.key}'`).join(',') + '];'
  );
}

fs.writeFileSync('new-viz.html', s);
console.log('rebuilt for ' + P.length + ' positions');
