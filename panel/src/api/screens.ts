import { Hono } from "hono";
import type { Env } from "../env";
import type { AuthVars } from "../auth";
import { loadDataset } from "../metrics/load";
import { antes, despues, durante, resumen } from "../metrics/screens";

export const screenRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

const screens = { resumen, antes, durante, despues } as const;

screenRoutes.get("/:launchId/:screen", async (c) => {
  const fn = screens[c.req.param("screen") as keyof typeof screens];
  if (!fn) return c.json({ ok: false, error: "pantalla desconocida" }, 404);
  const d = await loadDataset(c.env.DB, c.req.param("launchId"));
  if (!d) return c.json({ ok: false, error: "lanzamiento no existe" }, 404);
  c.header("Cache-Control", "no-store");
  return c.json({ ok: true, generado: new Date(d.now).toISOString(), datos: fn(d) });
});

export const connectionRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

connectionRoutes.get("/", async (c) => {
  const [conn, jobs] = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT id, source, status, last_data_at, last_error_at, last_error FROM connections ORDER BY id`),
    c.env.DB.prepare(`SELECT job, next_run_at, last_ok_at, last_error, attempts FROM sync_state ORDER BY job`),
  ]);
  return c.json({ ok: true, ahora: new Date().toISOString(), conexiones: conn!.results, trabajos: jobs!.results });
});
