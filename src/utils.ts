export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function nowISO() {
  return new Date().toISOString();
}

export function normalizeTag(tag: string) {
  return tag.trim().replace(/\s+/g, " ");
}

export function splitTags(input: string) {
  return input
    .split(",")
    .map(normalizeTag)
    .filter(Boolean);
}

export function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("FileReader error"));
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  // data:[mime];base64,xxxx
  const [meta, b64] = dataUrl.split(",");
  const mimeMatch = /data:(.*?);base64/.exec(meta);
  const mime = mimeMatch?.[1] ?? "application/octet-stream";
  const binStr = atob(b64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function requestPersistentStorage(): Promise<boolean> {
  // MDN: navigator.storage.persist()
  // returns true if granted
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav: any = navigator;
  if (!nav.storage?.persist) return false;
  return await nav.storage.persist();
}

export async function isStoragePersisted(): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav: any = navigator;
  if (!nav.storage?.persisted) return false;
  return await nav.storage.persisted();
}
