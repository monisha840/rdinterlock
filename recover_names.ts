import fs from 'fs';

function main() {
  const content = fs.readFileSync('backend/tmp/cash_result.txt', 'utf16le');
  
  const headers = content.match(/--- .* CASH ENTRIES ---/g);
  console.log('--- Found Headers ---');
  headers?.forEach(h => console.log(h));

  // Try to find IDs near headers
  const segments = content.split(/--- .* CASH ENTRIES ---/);
  if (headers && segments.length > 1) {
    for (let i = 0; i < headers.length; i++) {
      const name = headers[i].replace(/--- (.*) CASH ENTRIES ---/, '$1');
      const segment = segments[i+1];
      const match = segment.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
      if (match) {
        console.log(`ID: ${match[0]} -> Name: ${name}`);
      }
    }
  }
}

main();
