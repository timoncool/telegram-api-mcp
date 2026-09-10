/** Parse the official HTML without borrowing tables from the next section. */
export const plainText = (value) => value.replace(/<[^>]+>/g, "")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export function parseBotApi(html) {
  const methods = {}, types = {};
  for (const section of html.split(/<h[34][^>]*>/).slice(1)) {
    const end = section.indexOf("</h4>");
    if (end < 0) continue;
    const name = plainText(section.slice(0, end));
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) continue;
    const body = section.slice(end + 5);
    const table = /<table\b[^>]*>([\s\S]*?)<\/table>/.exec(body);
    const rows = table ? [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)]
      .map((row) => [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => plainText(cell[1])))
      .filter((cells) => cells.length >= 3) : [];
    const description = plainText(/<p>([\s\S]*?)<\/p>/.exec(body)?.[1] ?? "");
    if (/^[a-z]/.test(name)) {
      methods[name] = { description, params: rows.map(([name, type, required, description]) =>
        ({ name, type, required: required === "Yes", description: description ?? "" })) };
    } else {
      const list = !table && /<ul>([\s\S]*?)<\/ul>/.exec(body);
      types[name] = { description, fields: rows.map(([name, type, description]) => ({ name, type, description })),
        variants: list ? [...list[1].matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map((link) => plainText(link[1])) : [] };
    }
  }
  if (!methods.getMe || !methods.sendMessage || !types.InputMedia || Object.keys(methods).length < 100) {
    throw new Error("Official Bot API HTML could not be parsed; refusing to replace the specification.");
  }
  return { methods, types };
}

/** Keep a small graph of only file-bearing fields and their containing types. */
export function buildUploadSchema({ methods, types }) {
  const refs = (type) => (type.match(/[A-Z][A-Za-z0-9]+/g) ?? []).filter((name) => types[name]);
  const file = (field) => /\bInputFile\b/.test(field.type) || field.description.includes("attach://");
  const reachable = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, type] of Object.entries(types)) {
      if (!reachable.has(name) && (type.fields.some((f) => file(f) || refs(f.type).some((r) => reachable.has(r))) ||
          type.variants.some((v) => reachable.has(v)))) {
        reachable.add(name); changed = true;
      }
    }
  }
  const fields = (items) => Object.fromEntries(items
    .filter((f) => file(f) || refs(f.type).some((r) => reachable.has(r)))
    .map((f) => [f.name, file(f) ? "file" : f.type]));
  return {
    methods: Object.fromEntries(Object.entries(methods).map(([name, m]) => [name, fields(m.params)]).filter(([, f]) => Object.keys(f).length)),
    types: Object.fromEntries([...reachable].sort().map((name) => [name, {
      fields: fields(types[name].fields), variants: types[name].variants.filter((v) => reachable.has(v)),
    }])),
  };
}

export function uploadSchemaSource(spec) {
  return '// Generated from the official Bot API by scripts/refresh-docs.mjs. Do not edit.\n' +
    `export const uploadSchema = ${JSON.stringify(buildUploadSchema(spec), null, 2)};\n`;
}
