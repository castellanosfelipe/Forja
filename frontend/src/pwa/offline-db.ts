const DATABASE_NAME = 'forja-pwa';
const STORE_NAME = 'key-value';
const VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    let abandoned = false;
    request.onblocked = () => {
      abandoned = true;
      reject(new Error('Cierra las otras pestañas de FORJA y vuelve a intentarlo para actualizar tus datos guardados.'));
    };
    request.onsuccess = () => {
      if (abandoned) request.result.close();
      else resolve(request.result);
    };
    request.onerror = () => reject(new Error('No pudimos abrir los datos guardados en este dispositivo.'));
  });
}

export async function readOfflineValue<T>(key: string): Promise<T | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);
    const fail = () => { database.close(); reject(new Error('No pudimos leer los datos guardados en este dispositivo.')); };
    request.onerror = fail;
    transaction.onerror = fail;
    transaction.onabort = fail;
    transaction.oncomplete = () => { database.close(); resolve((request.result as T | undefined) ?? null); };
  });
}

/** Commit related snapshots together: a draft must never outlive its matching base. */
export async function changeOfflineValues(
  entries: ReadonlyArray<readonly [string, unknown]>,
  deletes: readonly string[] = [],
): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    const fail = () => { database.close(); reject(new Error('No pudimos guardar tus cambios en este dispositivo.')); };
    transaction.onerror = fail;
    transaction.onabort = fail;
    try {
      for (const [key, value] of entries) store.put(value, key);
      for (const key of deletes) store.delete(key);
    } catch {
      transaction.abort();
      fail();
    }
  });
}

export function writeOfflineValue<T>(key: string, value: T): Promise<void> {
  return changeOfflineValues([[key, value]]);
}

export function deleteOfflineValue(key: string): Promise<void> {
  return changeOfflineValues([], [key]);
}
