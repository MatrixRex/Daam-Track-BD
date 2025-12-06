import { useState, useEffect, useCallback } from 'react';
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
          // We load the last 10 years of data (+1 for range coverage)
          const currentYear = new Date().getFullYear();
          const startYear = currentYear - 10; 
          
          console.log(`🦆 Fetching Parquet files from ${startYear} to ${currentYear}...`);
          
          const years = [];
          for (let y = startYear; y <= currentYear; y++) {
            years.push(y);
          }

          // Parallel fetch for all years
          await Promise.all(years.map(async (year) => {
            const parquetUrl = `/data/prices/year=${year}/data.parquet`;
            try {
              const response = await fetch(parquetUrl);
              if (response.ok) {
                const buffer = await response.arrayBuffer();
                // We register each file into a virtual path pattern DuckDB can glob
                // e.g., "years/2023.parquet" or just keep the structure "data/prices/year=2023/data.parquet"
                // To make the glob easy, let's mirror the structure.
                // DuckDB WASM supports recursive directory creation? maybe not easily with registerFileBuffer
                // It's easier to register them as flat files with unique names and use a list in the query
                // OR register nicely.
                // Let's simplfy: register as "prices/year_{year}.parquet"
                await newDb.registerFileBuffer(`prices/year_${year}.parquet`, new Uint8Array(buffer));
              } else {
                 // console.warn(`Skipping missing year: ${year}`);
              }
            } catch (err) {
              console.warn(`Failed to load data for year ${year}`, err);
            }
          }));

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
  const runQuery = useCallback(async (query) => {
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
  }, [db]);

  return { db, loading, error, runQuery };
};