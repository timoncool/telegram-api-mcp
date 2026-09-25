import { uploadSchema } from "./upload-schema.js";

interface TypeDef { fields: Record<string, string>; variants: string[] }
const schema = uploadSchema as { methods: Record<string, Record<string, string>>; types: Record<string, TypeDef> };

export interface FileReference {
  value: string;
  path: (string | number)[];
  set: (value: string) => void;
}

/** Walk only fields declared as uploads by Telegram, including recursive rich blocks. */
export function collectFileReferences(method: string, params: Record<string, unknown>): FileReference[] {
  const found: FileReference[] = [];
  const paths = new Set<string>();
  const visited = new WeakMap<object, Set<string>>();

  function visit(value: unknown, type: string, path: (string | number)[], set: (value: string) => void): void {
    if (type === "file") {
      const key = JSON.stringify(path);
      if (typeof value === "string" && !paths.has(key)) {
        paths.add(key); found.push({ value, path, set });
      }
      return;
    }
    if (!value || typeof value !== "object") return;
    const seen = visited.get(value) ?? new Set<string>();
    if (seen.has(type)) return;
    seen.add(type); visited.set(value, seen);
    if (Array.isArray(value)) {
      value.forEach((entry, i) => visit(entry, type.replace(/^Array of /, ""), [...path, i], (v) => { value[i] = v; }));
      return;
    }
    for (const name of type.match(/[A-Z][A-Za-z0-9]+/g) ?? []) {
      const def = schema.types[name];
      if (!def) continue;
      const object = value as Record<string, unknown>;
      for (const [field, childType] of Object.entries(def.fields)) {
        visit(object[field], childType, [...path, field], (v) => { object[field] = v; });
      }
      for (const variant of def.variants) visit(value, variant, path, set);
    }
  }

  for (const [field, type] of Object.entries(schema.methods[method] ?? {})) {
    // MCP clients may supply complex Telegram values as JSON strings.
    const value = params[field];
    if (type !== "file" && typeof value === "string" && /^[\s]*[\[{]/.test(value)) {
      try { params[field] = JSON.parse(value); } catch { /* Telegram reports malformed JSON. */ }
    }
    visit(params[field], type, [field], (v) => { params[field] = v; });
  }
  return found;
}
