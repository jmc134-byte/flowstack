import { Hono } from "hono";
import type { Env } from "../env";
import type { AuthVars } from "../auth";

export const MANUAL_KINDS = ["whatsapp_members", "ig_live_peak", "ig_live_end", "note"] as const;

export const manualRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

manualRoutes.get("/:launchId", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, kind, ref, value, text, measured_at, entered_at FROM manual_entries WHERE launch_id=?1 ORDER BY measured_at DESC LIMIT 200`,
  ).bind(c.req.param("launchId")).all();
  return c.json({ ok: true, entradas: results });
});

manualRoutes.post("/:launchId", async (c) => {
  const launchId = c.req.param("launchId");
  const b = await c.req.json<{ kind?: string; ref?: string; value?: number; text?: string; measured_at?: string }>();
  const errors: string[] = [];
  if (!MANUAL_KINDS.includes(b.kind as any)) errors.push("tipo inválido");
  if (b.kind === "note" ? !b.text?.trim() : !(typeof b.value === "number" && Number.isFinite(b.value) && b.value >= 0)) errors.push(b.kind === "note" ? "la nota está vacía" : "valor numérico ≥ 0 requerido");
  const measured = b.measured_at ? new Date(b.measured_at) : new Date();
  if (Number.isNaN(measured.getTime())) errors.push("fecha inválida");
  const exists = await c.env.DB.prepare(`SELECT 1 FROM launches WHERE id=?1`).bind(launchId).first();
  if (!exists) errors.push("lanzamiento no existe");
  if (errors.length) return c.json({ ok: false, errores: errors }, 422);
  await c.env.DB.prepare(
    `INSERT INTO manual_entries (launch_id, kind, ref, value, text, measured_at, entered_at) VALUES (?1,?2,?3,?4,?5,?6,?7)`,
  ).bind(launchId, b.kind, b.ref?.slice(0, 120) ?? null, b.kind === "note" ? null : b.value, b.kind === "note" ? b.text!.slice(0, 2000) : null, measured.toISOString(), new Date().toISOString()).run();
  return c.json({ ok: true });
});

manualRoutes.delete("/:launchId/:entryId", async (c) => {
  await c.env.DB.prepare(`DELETE FROM manual_entries WHERE launch_id=?1 AND id=?2`).bind(c.req.param("launchId"), Number(c.req.param("entryId"))).run();
  return c.json({ ok: true });
});
