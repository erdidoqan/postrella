/**
 * D1 Veritabanı REST API İstemcisi
 * POSTRELLA veritabanına erişim için yardımcı fonksiyonlar
 */

const D1_API_BASE = 'https://d1-secret-rest.digitexa.workers.dev/db/POSTRELLA';
const D1_API_TOKEN = 'promptil-dbc5fb3a6db6781f0dc9f36823';

interface QueryResponse<T = any> {
  success: boolean;
  meta: {
    served_by: string;
    served_by_region: string;
    served_by_colo: string;
    served_by_primary: boolean;
    timings: {
      sql_duration_ms: number;
    };
    duration: number;
    changes: number;
    last_row_id: number;
    changed_db: boolean;
    size_after: number;
    rows_read: number;
    rows_written: number;
    total_attempts: number;
  };
  results: T[];
}

interface RestResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  results?: T[];
  meta?: QueryResponse['meta'];
}

/**
 * SQL sorgusu çalıştırır
 */
export async function executeQuery<T = any>(
  query: string
): Promise<QueryResponse<T>> {
  const response = await fetch(`${D1_API_BASE}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${D1_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`D1 Query failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Tablo oluşturur
 */
export async function createTable(
  tableName: string,
  schema: string
): Promise<QueryResponse> {
  const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`;
  return executeQuery(query);
}

/**
 * REST API üzerinden tablodaki tüm kayıtları getirir
 */
export async function getTableData<T = any>(
  tableName: string
): Promise<RestResponse<T>> {
  const response = await fetch(`${D1_API_BASE}/rest/${tableName}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${D1_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`D1 REST GET failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * REST API üzerinden tabloya yeni kayıt ekler
 */
export async function insertTableData<T = any>(
  tableName: string,
  data: Record<string, any>
): Promise<RestResponse<T>> {
  const response = await fetch(`${D1_API_BASE}/rest/${tableName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${D1_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`D1 REST POST failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Veritabanındaki tüm tabloları listeler
 */
export async function listTables(): Promise<string[]> {
  const response = await executeQuery<{ name: string }>(
    'SELECT name FROM sqlite_master WHERE type="table" AND name NOT LIKE "_cf_%" AND name NOT LIKE "sqlite_%"'
  );
  return response.results.map((row) => row.name);
}

/**
 * Tablonun şemasını getirir
 */
export async function getTableSchema(tableName: string): Promise<any[]> {
  const response = await executeQuery(
    `PRAGMA table_info(${tableName})`
  );
  return response.results;
}



