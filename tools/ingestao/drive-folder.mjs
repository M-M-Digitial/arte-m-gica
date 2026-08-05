const MIME_FOLDER = "application/vnd.google-apps.folder";

function decodeEscapedDrivePayload(html) {
  return html
    .replace(/\\x([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\\//g, "/");
}

function decodeJsonString(value) {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`);
  } catch {
    return value;
  }
}

export function parsePublicDriveFolder(html, parentId) {
  const decoded = decodeEscapedDrivePayload(html);
  const itemPattern = /\["([A-Za-z0-9_-]{20,64})",\["([A-Za-z0-9_-]{20,64})"\],"((?:\\.|[^"])*)","([^"]+)"/g;
  const items = new Map();
  let match;

  while ((match = itemPattern.exec(decoded))) {
    const [, id, parent, encodedName, mime] = match;
    if (parent !== parentId || items.has(id)) continue;
    items.set(id, { id, name: decodeJsonString(encodedName), mime, isFolder: mime === MIME_FOLDER });
  }

  return [...items.values()];
}

export async function listPublicDriveFolder(folderId, fetchImpl = fetch) {
  const response = await fetchImpl(`https://drive.google.com/drive/folders/${folderId}`, { redirect: "follow" });
  if (!response.ok) throw new Error(`Drive ${folderId}: HTTP ${response.status}`);
  return parsePublicDriveFolder(await response.text(), folderId);
}
