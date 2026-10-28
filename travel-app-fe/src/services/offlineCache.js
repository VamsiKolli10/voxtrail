const DB_NAME = "smart-travel-companion";
const DB_VERSION = 1;
const STORES = {
  emergency: "emergency_contacts",
  phrases: "saved_phrases",
};

let dbPromise = null;

const hasIndexedDB = () =>
  typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

function openDatabase() {
  if (!hasIndexedDB()) {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "id" });
        }
      });
    };
    request.onsuccess = () => resolve(request.result);
  }).catch((error) => {
    console.warn("IndexedDB unavailable", error);
    return null;
  });
  return dbPromise;
}

async function writeAll(storeName, items = []) {
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    store.clear();
    items.forEach((item) => {
      store.put(item);
    });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  }).catch((error) => {
    console.warn(`Failed to cache ${storeName}`, error);
    return false;
  });
}

async function readAll(storeName) {
  const db = await openDatabase();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  }).catch((error) => {
    console.warn(`Failed to read ${storeName} cache`, error);
    return [];
  });
}

export async function cacheEmergencyContacts(items) {
  return writeAll(STORES.emergency, items);
}

export async function readEmergencyContacts() {
  return readAll(STORES.emergency);
}

export async function cacheSavedPhrases(items, userId) {
  if (!userId) return false;
  const db = await openDatabase();
  if (!db) return false;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.phrases, "readwrite");
    // One account-scoped snapshot. Legacy unscoped phrase records are ignored.
    tx.objectStore(STORES.phrases).put({ id: `user:${userId}`, items });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  }).catch(() => false);
}

export async function readSavedPhrases(userId) {
  if (!userId) return [];
  const db = await openDatabase();
  if (!db) return [];
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORES.phrases, "readonly")
      .objectStore(STORES.phrases).get(`user:${userId}`);
    request.onsuccess = () => resolve(request.result?.items || []);
    request.onerror = () => reject(request.error);
  }).catch(() => []);
}
