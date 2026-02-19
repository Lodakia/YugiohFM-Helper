/**
 * Parses Yugipedia HTML for Yu-Gi-Oh! Forbidden Memories fusions
 * and updates data.json with the extracted fusion pairs.
 *
 * Format: Each fusion is Material 1 + Material 2 = Result
 * We add to each Material 1 card: [material2_id, result_id]
 *
 * Usage: node scripts/parse-yugipedia-fusions.js [--dry-run]
 *        node scripts/parse-yugipedia-fusions.js [path/to/html] [--dry-run]
 *
 * By default reads: yugipedia-fusions-combined.html (project root)
 * Run scripts/combine-yugipedia-fusions.js first to generate it from the
 * individual Yugipedia HTML files.
 *
 * Use --dry-run to preview without writing to data.json.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const DATA_JSON = path.join(PROJECT_ROOT, 'public', 'data.json');
const DATA_MIN_JSON = path.join(PROJECT_ROOT, 'public', 'data.min.json');
const FUSION_COMBINED = path.join(PROJECT_ROOT, 'yugipedia-fusions-combined.html');

/** Normalize id to match data.json format (strip leading zeros). */
function normalizeId(id) {
    const n = String(id).replace(/^0+/, '');
    return n === '' ? '0' : n;
}

function extractIdsFromHtml(htmlFragment) {
    // Match #264: "Name" or #264 pattern - extract the number (avoid matching #2 in #264)
    const matches = htmlFragment.matchAll(/#(\d+):/g);
    const ids = [...matches].map(m => m[1]);
    if (ids.length === 0) {
        // Fallback: any # followed by digits (e.g. in links)
        const fallback = htmlFragment.matchAll(/#(\d+)/g);
        return [...new Set([...fallback].map(m => m[1]))];
    }
    return [...new Set(ids)];
}

function parseTableRows(tableHtml) {
    const pairs = [];
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        const rowHtml = rowMatch[1];
        if (rowHtml.includes('<th')) continue;
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const tds = [...rowHtml.matchAll(tdRegex)].map(m => m[1]);
        if (tds.length >= 2) {
            const mat1Ids = extractIdsFromHtml(tds[0]);
            const mat2Ids = extractIdsFromHtml(tds[1]);
            for (const m1 of mat1Ids) {
                for (const m2 of mat2Ids) {
                    if (m1 !== m2) pairs.push({ mat1: m1, mat2: m2 });
                }
            }
        }
    }
    return pairs;
}

function parseYugipediaHtml(html) {
    const fusionsToAdd = []; // { mat1, mat2, result }
    
    // Section: h2 (with result ID) followed by content until next h2
    // Format: id="002:_&quot;Mystical_Elf&quot;" (digits then : or _)
    const sectionRegex = /<h2[^>]*>[\s\S]*?id="(\d+)[:_][^"]*"[\s\S]*?<\/h2>([\s\S]*?)(?=<h2|$)/gi;
    let match;
    while ((match = sectionRegex.exec(html)) !== null) {
        const resultId = match[1].replace(/^0+/, '') || match[1];
        const sectionContent = match[2];
        // Find all wikitable tables in this section (main + glitch)
        const tableRegex = /<table class="wikitable">([\s\S]*?)<\/table>/gi;
        let tableMatch;
        while ((tableMatch = tableRegex.exec(sectionContent)) !== null) {
            const pairs = parseTableRows(tableMatch[1]);
            for (const { mat1, mat2 } of pairs) {
                const m1 = normalizeId(mat1);
                const m2 = normalizeId(mat2);
                if (resultId === m1 || resultId === m2) continue; // result cannot equal a material
                fusionsToAdd.push({ mat1: m1, mat2: m2, result: resultId });
            }
        }
    }
    
    return fusionsToAdd;
}

function createMinimalCard(id) {
    return {
        id: String(id),
        name: `Unknown (#${id})`,
        description: '',
        guardian_1: '0',
        guardian_2: '0',
        level: 0,
        type: '0',
        attack: 0,
        defense: 0,
        cost: 0,
        code: '',
        fusions: []
    };
}

function ensureCardExists(data, cardsById, id, stats) {
    if (cardsById[id]) return cardsById[id];
    const card = createMinimalCard(id);
    data.cards.push(card);
    cardsById[id] = card;
    stats.cardsCreated++;
    return card;
}

function updateDataJson(fusionsToAdd) {
    const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
    const cardsById = {};
    data.cards.forEach(c => { cardsById[c.id] = c; });
    const stats = { added: 0, duplicates: 0, cardsCreated: 0, removed: 0 };

    // Remove invalid fusions (result equals a material - impossible in game)
    for (const card of data.cards) {
        if (!card.fusions) continue;
        const before = card.fusions.length;
        card.fusions = card.fusions.filter(f => f[1] !== card.id && f[1] !== f[0]);
        stats.removed += before - card.fusions.length;
    }
    
    function addFusionIfNew(card, otherMat, result) {
        if (!card.fusions) card.fusions = [];
        const pair = [otherMat, result];
        const exists = card.fusions.some(
            f => f[0] === pair[0] && f[1] === pair[1]
        );
        if (!exists) {
            card.fusions.push(pair);
            return true;
        }
        return false;
    }

    for (const { mat1, mat2, result } of fusionsToAdd) {
        // Ensure mat1, mat2, and result exist (add minimal card if missing)
        const card1 = ensureCardExists(data, cardsById, mat1, stats);
        const card2 = ensureCardExists(data, cardsById, mat2, stats);
        ensureCardExists(data, cardsById, result, stats);
        
        // Add to Material 1: mat1 + mat2 -> result
        if (addFusionIfNew(card1, mat2, result)) stats.added++;
        else stats.duplicates++;
        // Add to Material 2: mat2 + mat1 -> result (same fusion, other perspective)
        if (addFusionIfNew(card2, mat1, result)) stats.added++;
        else stats.duplicates++;
    }
    
    // Keep cards sorted by id for consistent output
    data.cards.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
    return { data, added: stats.added, duplicates: stats.duplicates, cardsCreated: stats.cardsCreated, removed: stats.removed };
}

function main() {
    const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
    const dryRun = process.argv.includes('--dry-run');
    const htmlPath = args[0] ? path.resolve(args[0]) : FUSION_COMBINED;
    
    if (!fs.existsSync(htmlPath)) {
        console.error(`HTML file not found: ${htmlPath}`);
        console.error('');
        console.error('To use this script:');
        console.error('  1. Run: node scripts/combine-yugipedia-fusions.js');
        console.error('     (generates yugipedia-fusions-combined.html from the 4 source files)');
        console.error('  2. Run: node scripts/parse-yugipedia-fusions.js');
        console.error('');
        console.error('Or: node scripts/parse-yugipedia-fusions.js path/to/yugipedia-fusions-combined.html');
        console.error('Add --dry-run to preview without updating data.json');
        process.exit(1);
    }
    
    console.log('Reading HTML from:', htmlPath);
    const html = fs.readFileSync(htmlPath, 'utf8');
    
    console.log('Parsing fusion data...');
    const fusionsToAdd = parseYugipediaHtml(html);
    console.log(`Found ${fusionsToAdd.length} fusion pairs to add`);
    
    if (fusionsToAdd.length === 0) {
        console.error('No fusions extracted. Check HTML format - ensure it is the raw HTML source.');
        process.exit(1);
    }
    
    if (dryRun) {
        console.log('\nSample extractions (first 10):');
        fusionsToAdd.slice(0, 10).forEach(({ mat1, mat2, result }, i) => {
            console.log(`  ${i + 1}. Card #${mat1} + #${mat2} -> #${result}`);
        });
        console.log('\nDry run - no changes written. Remove --dry-run to update data.json.');
        return;
    }
    
    console.log('Updating data.json...');
    const { data, added, duplicates, cardsCreated, removed } = updateDataJson(fusionsToAdd);
    
    fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 4), 'utf8');
    fs.writeFileSync(DATA_MIN_JSON, JSON.stringify(data), 'utf8');
    
    let msg = `Done. Added ${added} new fusions, ${duplicates} already existed.`;
    if (removed > 0) {
        msg += ` Removed ${removed} invalid fusion(s) (result = material).`;
    }
    if (cardsCreated > 0) {
        msg += ` Created ${cardsCreated} missing card(s) with placeholder data.`;
    }
    console.log(msg);
}

main();
