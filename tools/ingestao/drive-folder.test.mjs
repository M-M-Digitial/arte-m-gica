import assert from "node:assert/strict";
import test from "node:test";
import { parsePublicDriveFolder } from "./drive-folder.mjs";

test("le nome e tipo dos itens no payload publico do Drive", () => {
  const parent = "1R0HnA5CDmvue_SJoCP-PGV37C0wBmY9Z";
  const html = String.raw`[\x221s_n5qFwV0N3vqCJ2R9t2zS-Ae9xgu__2\x22,[\x221R0HnA5CDmvue_SJoCP-PGV37C0wBmY9Z\x22],\x22A Era do Gelo\x22,\x22application\/vnd.google-apps.folder\x22]`;

  assert.deepEqual(parsePublicDriveFolder(html, parent), [{
    id: "1s_n5qFwV0N3vqCJ2R9t2zS-Ae9xgu__2",
    name: "A Era do Gelo",
    mime: "application/vnd.google-apps.folder",
    isFolder: true,
  }]);
});
