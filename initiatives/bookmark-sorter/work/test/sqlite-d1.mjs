import {DatabaseSync} from 'node:sqlite';
import {readFile, readdir} from 'node:fs/promises';

export async function sqliteStoreDatabase() {
  const database = new DatabaseSync(':memory:');
  const directory = new URL('../drizzle/', import.meta.url);
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
    database.exec(await readFile(new URL(name, directory), 'utf8'));
  }
  const queries = [];
  function prepare(sql, values = []) {
    function execute(method) {
      const result = database.prepare(sql)[method](...values);
      queries.push({sql, values, rows: method === 'all' ? result.length : 0});
      return result;
    }
    return {
      bind(...args) {
        if (args.length > 100) throw new Error('Too many D1 bound parameters');
        return prepare(sql, args);
      },
      async first() { return execute('get') ?? null; },
      async all() { return {results: execute('all')}; },
      async run() { return execute('run'); },
    };
  }
  const d1 = {prepare, async batch(statements) {
    database.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.all());
      database.exec('COMMIT');
      return results;
    } catch (error) { database.exec('ROLLBACK'); throw error; }
  }};
  return {database, d1, queries};
}
