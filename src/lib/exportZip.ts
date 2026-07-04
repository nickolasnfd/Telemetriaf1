import { strToU8, zipSync } from 'fflate';

// Builds a .zip (as bytes) from named JSON-serializable payloads — pure,
// no DOM/browser APIs, so it's fully unit-testable.
export function buildExportZip(files: Record<string, unknown>): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [name, data] of Object.entries(files)) {
    entries[`${name}.json`] = strToU8(JSON.stringify(data, null, 2));
  }
  return zipSync(entries);
}

export function downloadZip(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
