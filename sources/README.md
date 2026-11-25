# Ketvoice source catalogue

`sources/catalogue.json` lists the source manifests Ketvoice offers to install in one click (Windows 2.0 and later:
Settings › Sources › Catalogue). The app fetches it from
`https://ketvoice-web.vercel.app/sources/catalogue.json`, so this file must stay at that path.

The catalogue only points to manifests. What a source serves, and how, is described by its own manifest
(see `docs/manifest.md` in the app repository). Installing an entry is the same as pasting its manifest address in
« Ajouter une source »: the app fetches the manifest, runs a test search, then adds it.

## Schema, version 1

```json
{
  "schema": "ketvoice-source-catalogue",
  "version": 1,
  "updated": "2026-11-25",
  "sources": [
    {
      "id": "ketvoice-lossless",
      "name": "Ketvoice Lossless",
      "manifest": "https://ketvoice-lossless.onrender.com/manifest.json",
      "description": { "fr": "…", "en": "…" },
      "provides": ["search", "stream"],
      "quality": "lossless",
      "official": true,
      "homepage": "https://example.com"
    }
  ]
}
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `schema` | string | no (recommended) | Always `ketvoice-source-catalogue`. Any other value is refused. |
| `version` | integer | yes | Schema major version. The app reads version 1 and refuses a higher one rather than misread it. |
| `updated` | string | no | Date of the last edit, `YYYY-MM-DD`. Shown for information only. |
| `sources` | array | yes | The entries, in the order they are shown. At most 200 are read. |
| `sources[].id` | string | no | A stable short id (≤ 64 characters). Defaults to the first 12 hex digits of the manifest address's SHA-1. |
| `sources[].name` | string | yes | Display name (≤ 80 characters). |
| `sources[].manifest` | string | yes | The manifest address: `https://`, ending in `.json`, ≤ 500 characters. Entries that repeat an address are skipped. |
| `sources[].description` | object or string | no | Text by language code (`fr`, `en`, …), ≤ 400 characters each; a plain string counts as French. The app shows the listener's language, then French, then English. |
| `sources[].provides` | array of strings | no | What the manifest serves, among `search`, `stream`, `download`, `lyrics`, `canvas`, `cover`. Other words are ignored. |
| `sources[].quality` | string | no | Best quality offered: `lossless`, `high` or `low`. Shown as a badge. |
| `sources[].official` | boolean | no | `true` for sources run by Ketvoice. |
| `sources[].homepage` | string | no | An `https://` page about the source. |

An entry that breaks a rule above is skipped; the rest of the catalogue is still read. Adding fields is allowed
within version 1 (older apps ignore them); changing the meaning of a field needs `version: 2`.

## Rules for listing a source

- Only manifests whose search, stream and other endpoints answer over `https://`.
- Never a manifest that asks the listener for a key, token or password: the app never sends secrets to a source
  and the account sync carries only manifest addresses, on/off switches and order.
- Start: the existing Ketvoice Lossless manifest only.
