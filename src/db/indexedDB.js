import { openDB } from 'idb';

export const DB_NAME = 'celebrareGalleryDB';
export const IMAGE_STORE = 'images';

const DB_VERSION = 1;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(IMAGE_STORE)) {
      db.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
    }
  },
});

export async function getCachedImages() {
  const db = await dbPromise;
  return db.getAll(IMAGE_STORE);
}

export async function saveImages(images) {
  const db = await dbPromise;
  const tx = db.transaction(IMAGE_STORE, 'readwrite');

  await Promise.all([
    ...images.map((image) => tx.store.put(image)),
    tx.done,
  ]);
}
