// D1 mínimo sobre node:sqlite para probar el despachador con las migraciones reales.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function createFakeD1(): D1Database {
  const db = new DatabaseSync(":memory:");
  const dir = join(process.cwd(), "migrations");
  for (const f of readdirSync(dir).sort()) db.exec(readFileSync(join(dir, f), "utf8"));
  const norm = (sql: string) => sql.replace(/\?(\d+)/g, "?"); // ?N → ? (los usamos en orden)
  const expand = (sql: string, args: unknown[]) => {
    // Reordena argumentos según ?N, permitiendo reutilizar el mismo índice.
    const idx = [...sql.matchAll(/\?(\d+)/g)].map((m) => Number(m[1]) - 1);
    return idx.length ? idx.map((i) => args[i] ?? null) : args;
  };
  const make = (sql: string, args: unknown[] = []): any => ({
    bind: (...a: unknown[]) => make(sql, a),
    async run() {
      const r = db.prepare(norm(sql)).run(...(expand(sql, args) as any[]));
      return { success: true, meta: { changes: Number(r.changes) } };
    },
    async all() {
      return { success: true, results: db.prepare(norm(sql)).all(...(expand(sql, args) as any[])) };
    },
    async first() {
      return db.prepare(norm(sql)).get(...(expand(sql, args) as any[])) ?? null;
    },
  });
  return {
    prepare: (sql: string) => make(sql),
    batch: async (stmts: any[]) => Promise.all(stmts.map((s) => s.run())),
    exec: async (sql: string) => db.exec(sql),
    __raw: db,
  } as unknown as D1Database;
}
