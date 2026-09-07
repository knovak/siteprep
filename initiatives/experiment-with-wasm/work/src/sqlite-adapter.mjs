// Preserve the original prepared-statement contract, executing all SQL in WASM.
export class SqliteBinding {
  constructor(database) { this.database = database; this.statements = 0; this.savepoint = 0; }
  prepare(sql) {
    const binding = this;
    let values = [];
    const execute = () => {
      const statement = binding.database.prepare(sql);
      binding.statements += 1;
      try {
        statement.bind(values.map(value => value === undefined ? null : value));
        const results = [];
        while (statement.step()) results.push(statement.getAsObject());
        return {success: true, results, meta: {changes: binding.database.getRowsModified()}};
      } finally { statement.free(); }
    };
    return {
      bind(...args) { values = args; return this; },
      async all() { return execute(); },
      async run() { return execute(); },
      async first(column) { const row = execute().results[0] ?? null; return column ? row?.[column] ?? null : row; },
      execute,
    };
  }
  async batch(statements) {
    const name = `batch_${++this.savepoint}`;
    this.database.run(`SAVEPOINT ${name}`);
    try {
      const results = statements.map(statement => statement.execute());
      this.database.run(`RELEASE ${name}`);
      return results;
    } catch (error) {
      this.database.run(`ROLLBACK TO ${name}; RELEASE ${name}`);
      throw error;
    }
  }
  snapshot() {
    const bytes = this.database.export();
    // sql.js reopens the connection when exporting, resetting connection pragmas.
    this.database.run('PRAGMA foreign_keys = ON');
    return bytes;
  }
}
