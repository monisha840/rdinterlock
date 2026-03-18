const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('prisma/dev.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('Tables in SQLite:', tables.map(t => t.name));
  
  tables.forEach(table => {
    db.all(`SELECT count(*) as count FROM "${table.name}"`, (err, rows) => {
      if (!err) {
        console.log(`Table ${table.name} count:`, rows[0].count);
      }
    });
  });
});
