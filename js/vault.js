// The Vault: articles saved to the device (IndexedDB) so they can be read with no connection.

const DB = 'rexx-vault';
const STORE = 'articles';
let dbp;

function db() {
  dbp ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore(STORE, { keyPath: 'id' });
      s.createIndex('savedAt', 'savedAt');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out instanceof IDBRequest ? out.result : out);
    t.onerror = () => reject(t.error);
  });
}

export const idFor = (lang, title) => `${lang}:${title}`;

export const put = (item) => tx('readwrite', (s) => s.put({ ...item, savedAt: item.savedAt || Date.now() }));
export const get = (id) => tx('readonly', (s) => s.get(id));
export const remove = (id) => tx('readwrite', (s) => s.delete(id));
export const all = async () => (await tx('readonly', (s) => s.getAll())).sort((a, b) => b.savedAt - a.savedAt);
export const count = () => tx('readonly', (s) => s.count());
export const clear = () => tx('readwrite', (s) => s.clear());

/** Rough bytes used by the vault (text + embedded thumbnails). */
export async function size() {
  const items = await all();
  return items.reduce((n, i) => n + JSON.stringify(i).length, 0);
}

/** Download an image and keep it inline as a data URL so it survives offline. */
export async function inlineImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
  } catch { return null; }
}
