/**
 * Combines Yugipedia fusion HTML files into one stripped-down file.
 * Removes meta tags, scripts, ads, navigation, footer, etc.
 *
 * Usage: node scripts/combine-yugipedia-fusions.js
 * Reads: yugipedia-fusions-001-200.html, 201-400, 401-600, 601-722
 * Writes: yugipedia-fusions-combined.html
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

const FUSION_FILES = [
    'yugipedia-fusions-001-200.html',
    'yugipedia-fusions-201-400.html',
    'yugipedia-fusions-401-600.html',
    'yugipedia-fusions-601-722.html'
];

function stripEditSections(html) {
    return html.replace(/<span class="mw-editsection">[\s\S]*?<\/span>/gi, '');
}

function stripLinkTags(html) {
    return html.replace(/<link rel="mw-deduplicated-inline-style"[^>]*\/?>/gi, '');
}

function extractContentSection(html) {
    // Extract from mw-parser-output to before NewPP/cache comments
    const startMatch = html.match(/<div class="mw-parser-output"><style[^>]*>[^<]*<\/style>([\s\S]*?)(?=<h2|$)/);
    if (!startMatch) return null;

    // Get everything from first div.mw-parser-output until <!-- NewPP or <!-- Saved
    const contentMatch = html.match(/<div class="mw-parser-output">([\s\S]*?)(?=<!--\s*(?:NewPP limit report|Saved in parser cache)|<\/div>\s*<div class="printfooter")/);
    if (!contentMatch) return null;

    let content = contentMatch[1];

    // For first file: keep nav + intro + first paragraph, skip TOC
    // We'll handle this per-file below
    return content;
}

function extractFusionSections(html) {
    // Each fusion is: h2 + optional hatnote + optional p + table(s)
    // Capture full block from h2 until next h2 (or end)
    const sections = [];
    const sectionRegex = /<h2[^>]*>[\s\S]*?<\/h2>[\s\S]*?(?=<h2|<!--\s*NewPP|$)/gi;
    let match;
    while ((match = sectionRegex.exec(html)) !== null) {
        let block = match[0].trim();
        // Must contain at least one wikitable
        if (!block.includes('<table class="wikitable">')) continue;
        block = stripEditSections(block);
        block = stripLinkTags(block);
        sections.push(block);
    }
    return sections;
}

function extractIntro(file1Html) {
    // From mw-parser-output: nav div + intro paragraph (before toc)
    const introMatch = file1Html.match(/<div class="mw-parser-output"><style[^>]*>[^<]*<\/style>\s*(<div class="fmr-fusions-nav[\s\S]*?<\/div>)\s*(<p>[\s\S]*?<\/p>)/);
    if (introMatch) {
        return introMatch[1] + '\n' + introMatch[2];
    }
    return '<p>The following monsters can be Fusion Summoned in the video game, <i>Yu-Gi-Oh! Forbidden Memories</i>.</p>';
}

function main() {
    const navStyle = `<style>.fmr-fusions-nav{text-align:center;border:1px solid #a2a9b1;background-color:#f8f9fa;padding:5px;font-size:95%}.hatnote{font-style:italic}.hatnote div{padding-left:1.6em;margin-bottom:0.5em}.wikitable{border-collapse:collapse;border:1px solid #a2a9b1}.wikitable th,.wikitable td{border:1px solid #a2a9b1;padding:0.2em 0.4em}.wikitable th{background-color:#eaecf0}</style>`;

    const head = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Yu-Gi-Oh! Forbidden Memories Fusions (001–722)</title>
${navStyle}
</head>
<body>
<h1>List of <i>Yu-Gi-Oh! Forbidden Memories</i> Fusions (001–722)</h1>
`;

    let allSections = [];

    for (let i = 0; i < FUSION_FILES.length; i++) {
        const filePath = path.join(PROJECT_ROOT, FUSION_FILES[i]);
        if (!fs.existsSync(filePath)) {
            console.warn(`Skipping ${FUSION_FILES[i]} (not found)`);
            continue;
        }

        const html = fs.readFileSync(filePath, 'utf8');
        const sections = extractFusionSections(html);

        if (i === 0) {
            const intro = extractIntro(html);
            allSections.push(intro);
        }

        allSections = allSections.concat(sections);
        console.log(`${FUSION_FILES[i]}: ${sections.length} fusion entries`);
    }

    const footer = `
<p><small>Combined from Yugipedia. Content available under <a href="https://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution Share Alike</a>.</small></p>
</body>
</html>`;

    const output = head + '\n' + allSections.join('\n\n') + footer;
    const outPath = path.join(PROJECT_ROOT, 'yugipedia-fusions-combined.html');
    fs.writeFileSync(outPath, output, 'utf8');

    console.log(`\nWritten to ${outPath}`);
}

main();
