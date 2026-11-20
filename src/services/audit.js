import { read, update } from "./store";
import { SEED_AUDIT } from "./seed";

let actor = null;
export const setActor = (u) => { actor = u; };

export function logAudit(type, action, detail = "", actorOverride) {
  update("audit", SEED_AUDIT, (list) => [
    { id: crypto.randomUUID?.() || String(Date.now() + Math.random()), at: new Date().toISOString(), actor: actorOverride || actor?.name || "System", type, action, detail },
    ...list
  ].slice(0, 300));
}
export const getAudit = () => read("audit", SEED_AUDIT);
