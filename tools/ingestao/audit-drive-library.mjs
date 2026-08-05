import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { listPublicDriveFolder } from "./drive-folder.mjs";

const [rootFolderId, outputArg = "drive-library-manifest.json", extraThemesArg] = process.argv.slice(2);
if (!rootFolderId) {
  console.error("uso: node audit-drive-library.mjs <pasta-raiz-drive> [manifesto.json]");
  process.exit(1);
}

const normalize = (value = "") => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

async function mapLimit(values, concurrency, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await mapper(values[index], index);
    }
  }));
  return results;
}

async function findFolder(parentId, expectedName) {
  const items = await listPublicDriveFolder(parentId);
  return items.find((item) => item.isFolder && normalize(item.name) === normalize(expectedName));
}

const firstPageThemes = (await listPublicDriveFolder(rootFolderId)).filter((item) => item.isFolder);
const extraThemes = extraThemesArg
  ? JSON.parse(readFileSync(resolve(extraThemesArg), "utf8")).map((theme) => ({ ...theme, isFolder: true }))
  : [];
const themes = [...new Map([...firstPageThemes, ...extraThemes].map((theme) => [theme.id, theme])).values()];
const manifest = await mapLimit(themes, 8, async (theme) => {
  try {
    const molds = await findFolder(theme.id, "Moldes");
    const studio = molds ? await findFolder(molds.id, "Studio") : null;
    const studioFiles = studio
      ? (await listPublicDriveFolder(studio.id)).filter((item) => /\.studio3$/i.test(item.name))
      : [];
    return {
      slug: normalize(theme.name),
      name: theme.name,
      themeFolderId: theme.id,
      moldsFolderId: molds?.id ?? null,
      studioFolderId: studio?.id ?? null,
      studioFiles: studioFiles.map(({ id, name, mime }) => ({ id, name, mime })),
    };
  } catch (error) {
    return { slug: normalize(theme.name), name: theme.name, themeFolderId: theme.id, error: String(error) };
  }
});

const output = resolve(outputArg);
writeFileSync(output, `${JSON.stringify({ rootFolderId, generatedAt: new Date().toISOString(), themes: manifest }, null, 2)}\n`);
console.log(JSON.stringify({
  output,
  themes: manifest.length,
  withStudio: manifest.filter((theme) => theme.studioFiles?.length).length,
  studioFiles: manifest.reduce((sum, theme) => sum + (theme.studioFiles?.length ?? 0), 0),
  errors: manifest.filter((theme) => theme.error),
}, null, 2));
