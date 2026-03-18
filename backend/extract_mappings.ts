import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const cashResultPath = path.join(__dirname, 'tmp', 'cash_result.txt');
    if (!fs.existsSync(cashResultPath)) {
        console.log('File not found');
        return;
    }

    let content = '';
    try {
        content = fs.readFileSync(cashResultPath, 'utf16le');
    } catch (e) {
        content = fs.readFileSync(cashResultPath, 'utf8');
    }

    const segments = content.split(/--- (.*) CASH ENTRIES ---/);
    const mappings: any[] = [];
    for (let i = 1; i < segments.length; i += 2) {
        const name = segments[i].trim();
        const segmentText = segments[i + 1];
        const uuidMatches = segmentText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g);
        if (uuidMatches) {
            mappings.push({
                name,
                ids: Array.from(new Set(uuidMatches))
            });
        }
    }
    console.log(JSON.stringify(mappings, null, 2));
}

main();
