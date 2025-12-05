import { useState, useEffect } from 'react';
import * as duckdb from '@duckdb/duckdb-wasm';

// GLOBAL VARIABLES (Singleton Pattern)
// These live outside the component lifecycle so they persist
let dbInstance = null;
let initPromise = null;

export const useDuckDB = () => {
  const [db, setDb] = useState(dbInstance);
  const [loading, setLoading] = useState(dbInstance === null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      // 1. If DB is already ready, just use it
      if (dbInstance) {
        setDb(dbInstance);
        setLoading(false);
        return;
      }

      // 2. If initialization is already running, wait for it
      if (initPromise) {
        try {
          const readyDb = await initPromise;
          setDb(readyDb);
        } catch (err) {
          setError(err);
        } finally {
          setLoading(false);
        }
        return;
      }

      // 3. Start Initialization (Runs only once per app load)
      initPromise = (async () => {
        try {
          console.log("🦆 Starting DuckDB Engine...");
          
          const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
          const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
          
          // Create Worker
          const worker = await duckdb.createWorker(bundle.mainWorker);
          const logger = new duckdb.ConsoleLogger();
          const newDb = new duckdb.AsyncDuckDB(logger, worker);
          
          await newDb.instantiate(bundle.mainModule, bundle.pthreadWorker);

          // Register the Parquet file (Virtual File System)
          const currentYear = new Date().getFullYear();
          const parquetUrl = `/data/prices/year=${currentYear}/data.parquet`;
          
          console.log("🦆 Fetching Parquet from:", parquetUrl);
          
          // Fetch the parquet file as a blob and register it directly
          // This is more reliable than HTTP protocol registration
          const response = await fetch(parquetUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch parquet file: ${response.status} ${response.statusText}`);
          }
          const buffer = await response.arrayBuffer();
          await newDb.registerFileBuffer('data.parquet', new Uint8Array(buffer));

          // Warm up connection
          const conn = await newDb.connect();
          await conn.close();

          console.log("🦆 DuckDB Ready!");
          dbInstance = newDb;
          return newDb;

        } catch (err) {
          console.error("DuckDB Init Failed:", err);
          throw err;
        }
      })();

      // Wait for the promise to resolve
      try {
        const readyDb = await initPromise;
        setDb(readyDb);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Helper to run SQL queries easily
  const runQuery = async (query) => {
    if (!db) return [];
    const conn = await db.connect();
    try {
      const result = await conn.query(query);
      // Convert Apache Arrow format to simple JSON array
      return result.toArray().map(r => r.toJSON());
    } catch (e) {
      console.error("Query Error:", e);
      return [];
    } finally {
      await conn.close();
    }
  };

  return { db, loading, error, runQuery };
};