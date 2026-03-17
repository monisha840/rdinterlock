import fs from 'fs';

function main() {
  const content = fs.readFileSync('backend/tmp/cash_result.txt', 'utf16le');
  
  const headers = content.match(/--- .* CASH ENTRIES ---/g);
  console.log('--- All Found Headers ---');
  headers?.forEach(h => console.log(h));

  const results: Record<string, string> = {};

  // Try to find IDs in each segment
  const segments = content.split(/--- .* CASH ENTRIES ---/);
  if (headers && segments.length > 1) {
    for (let i = 0; i < headers.length; i++) {
      const name = headers[i].replace(/--- (.*) CASH ENTRIES ---/, '$1');
      const segment = segments[i+1];
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
      let match;
      while ((match = uuidRegex.exec(segment)) !== null) {
        if (!results[match[0]]) {
          results[match[0]] = name;
        }
      }
    }
  }

  console.log('--- Final Mapping ---');
  console.log(JSON.stringify(results, null, 2));
}

main();
