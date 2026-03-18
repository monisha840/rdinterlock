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
    const names = new Set<string>();
    for (let i = 1; i < segments.length; i += 2) {
        names.add(segments[i].trim());
    }
    console.log('Unique names in cash_result.txt:', names.size);
    console.log('Names:', Array.from(names));
}

main();
