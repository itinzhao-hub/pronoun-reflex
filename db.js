const DB = (() => {
  const cfg = window.APP_CONFIG;
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(cfg.dbName, cfg.dbVersion);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("trials")) {
          const s = db.createObjectStore("trials", { keyPath: "trial_id", autoIncrement: true });
          s.createIndex("by_time", "timestamp");
          s.createIndex("by_stimulus", "stimulus_id");
          s.createIndex("by_module", "module");
          s.createIndex("by_correct", "correct");
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function addTrial(trial) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("trials", "readwrite");
      tx.objectStore("trials").add(trial);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getTrials() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("trials", "readonly");
      const req = tx.objectStore("trials").getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function setSetting(key, value) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("settings", "readwrite");
      tx.objectStore("settings").put({key, value});
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getSetting(key, fallback=null) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("settings", "readonly");
      const req = tx.objectStore("settings").get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : fallback);
      req.onerror = () => reject(req.error);
    });
  }

  return { open, addTrial, getTrials, setSetting, getSetting };
})();
