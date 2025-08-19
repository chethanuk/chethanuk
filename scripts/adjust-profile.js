#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const scaleIdx = args.indexOf('--snake-scale');
const SCALE = scaleIdx !== -1 && args[scaleIdx + 1] ? parseFloat(args[scaleIdx + 1]) : 1.5;
const dir = path.join(__dirname, '..', 'profile-3d-contrib');

if (!fs.existsSync(dir)) {
  console.log('Directory not found:', dir);
  process.exit(0);
}

// 1. Radar adjustment for 3D SVGs
const files3d = fs.readdirSync(dir).filter(f => f.startsWith('profile-') && f.endsWith('.svg'));
for (const f of files3d) {
  const p = path.join(dir, f);
  let svg = fs.readFileSync(p, 'utf8');
  const m = svg.match(/points="0,(-?[0-9.]+)\s+([0-9.-]+,[0-9.-]+)\s+([0-9.-]+,[0-9.-]+)\s+(-?[0-9.]+,[0-9.]+)\s+([0-9.-]+,[0-9.-]+)"/);
  if (m) {
    const oldPoints = m[0];
    const newPoints = `points="0,-147.60 ${m[2]} ${m[3]} -57.64,79.33 ${m[5]}"`;
    svg = svg.replaceAll(oldPoints, newPoints);
    svg = svg.replace(/Commit<title>\d+<\/title>/, 'Commit<title>5379</title>');
    svg = svg.replace(/Review<title>\d+<\/title>/, 'Review<title>139</title>');
    fs.writeFileSync(p, svg);
  }
}
console.log(`Updated radar metrics for ${files3d.length} 3D SVGs`);

// 2. Embed stats (contributions, busiest day, longest streak, active days) & remove star/fork
const statsPath = path.join(dir, 'stats.json');
let stats = { total: 6024, busiest: { count: 137 }, longest: 37, activeDays: 281 };
if (fs.existsSync(statsPath)) {
  try {
    stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  } catch (e) {
    console.error('Failed to parse stats.json, using fallback values');
  }
}

const totalFormatted = (stats.total || 6024).toLocaleString('en-US');
const busiestCount = stats.busiest?.count || 137;
const longestStreak = stats.longest || 37;
const activeDays = stats.activeDays || 281;

const newStatsBlock = `<g>
<text style="font-size: 28px; font-weight: bold;" x="155" y="830" text-anchor="start" class="fill-strong">${totalFormatted}</text>
<text style="font-size: 20px;" x="240" y="830" text-anchor="start" class="fill-fg">contributions</text>

<text style="font-size: 22px;" x="395" y="830" text-anchor="middle" class="fill-weak">·</text>

<text style="font-size: 20px;" x="420" y="830" text-anchor="start" class="fill-fg">Busiest day:</text>
<text style="font-size: 28px; font-weight: bold;" x="540" y="830" text-anchor="start" class="fill-strong">${busiestCount}</text>

<text style="font-size: 22px;" x="620" y="830" text-anchor="middle" class="fill-weak">·</text>

<text style="font-size: 20px;" x="645" y="830" text-anchor="start" class="fill-fg">Longest streak:</text>
<text style="font-size: 28px; font-weight: bold;" x="800" y="830" text-anchor="start" class="fill-strong">${longestStreak}</text>
<text style="font-size: 18px;" x="840" y="830" text-anchor="start" class="fill-weak">days</text>

<text style="font-size: 22px;" x="915" y="830" text-anchor="middle" class="fill-weak">·</text>

<text style="font-size: 20px;" x="940" y="830" text-anchor="start" class="fill-fg">Active days:</text>
<text style="font-size: 28px; font-weight: bold;" x="1060" y="830" text-anchor="start" class="fill-strong">${activeDays}</text>
`;

const bottomStatsRegex = /<g><text [^>]*y="830"[\s\S]*?(?=<text style="font-size: 16px;" x="1260" y="20")/;

for (const f of files3d) {
  const p = path.join(dir, f);
  let svg = fs.readFileSync(p, 'utf8');
  if (bottomStatsRegex.test(svg)) {
    svg = svg.replace(bottomStatsRegex, newStatsBlock);
    fs.writeFileSync(p, svg);
  }
}
console.log(`Embedded stats into ${files3d.length} 3D SVGs`);

// 3. Snake slowdown (supports both Platane CSS animations and SMIL dur)
for (const name of ['snake-dark.svg', 'snake.svg']) {
  const p = path.join(dir, name);
  if (!fs.existsSync(p)) continue;
  let svg = fs.readFileSync(p, 'utf8');

  // SMIL animation (HowardZlh)
  const smil = svg.match(/dur="([0-9.]+)s"/);
  if (smil) {
    const oldDur = parseFloat(smil[1]);
    if (oldDur < 50) {
      const newDur = +(oldDur * SCALE).toFixed(3);
      svg = svg.replaceAll(`dur="${oldDur}s"`, `dur="${newDur}s"`);
      svg = svg.replace(/begin="-([0-9.]+)s"/g, (_, p1) => `begin="-${+(parseFloat(p1) * SCALE).toFixed(3)}s"`);
      fs.writeFileSync(p, svg);
      console.log(`Updated ${name} (SMIL): scaled duration by ${SCALE}x (${oldDur}s -> ${newDur}s)`);
    } else {
      console.log(`${name} (SMIL) duration is already at ${oldDur}s`);
    }
  }

  // CSS animation (Platane/snk)
  const css = svg.match(/\banimation:[^;]*\b(\d+)ms\b/);
  if (css) {
    const oldMs = parseInt(css[1], 10);
    if (oldMs < 90000) {
      const newMs = Math.round(oldMs * SCALE);
      svg = svg.replaceAll(`${oldMs}ms`, `${newMs}ms`);
      fs.writeFileSync(p, svg);
      console.log(`Updated ${name} (CSS): scaled duration by ${SCALE}x (${oldMs}ms -> ${newMs}ms)`);
    } else {
      console.log(`${name} (CSS) duration is already at ${oldMs}ms`);
    }
  }
}
