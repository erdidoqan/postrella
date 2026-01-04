/**
 * CSV dosyasından subscribers verilerini D1 veritabanına yükler
 * Sadece firstName ve email alanlarını alır
 */

import * as fs from 'fs';
import * as path from 'path';
import { executeQuery, insertTableData } from '../lib/d1-client';

interface CSVRow {
  email: string;
  firstName?: string;
}

/**
 * CSV dosyasını parse eder ve email/firstName çiftlerini döndürür
 */
function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // İlk satır header, atla
  const headers = lines[0].split(',').map(h => h.trim());
  const emailIndex = headers.indexOf('email');
  const firstNameIndex = headers.indexOf('firstName');
  
  if (emailIndex === -1) {
    throw new Error('CSV dosyasında email kolonu bulunamadı');
  }
  
  const subscribers: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // CSV parsing - tırnak içindeki değerleri doğru şekilde handle et
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim()); // Son değer
    
    if (values.length > emailIndex) {
      const email = values[emailIndex]?.trim();
      const firstName = firstNameIndex >= 0 ? values[firstNameIndex]?.trim() || null : null;
      
      // Geçerli email kontrolü
      if (email && email.includes('@')) {
        subscribers.push({
          email,
          firstName: firstName || undefined,
        });
      }
    }
  }
  
  return subscribers;
}

/**
 * Subscribers'ı D1 veritabanına yükler (batch insert)
 */
async function importSubscribers(subscribers: CSVRow[]): Promise<void> {
  console.log(`Toplam ${subscribers.length} subscriber bulundu.`);
  
  // Önce tablonun oluşturulduğundan emin ol
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      first_name TEXT,
      is_active INTEGER DEFAULT 1,
      unsubscribed_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
    CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(is_active);
  `;
  
  try {
    await executeQuery(createTableQuery);
    console.log('Subscribers tablosu oluşturuldu/doğrulandı.');
  } catch (error) {
    console.error('Tablo oluşturma hatası:', error);
    throw error;
  }
  
  // Batch'ler halinde insert et (her batch 100 kayıt)
  // SQL INSERT OR IGNORE kullanarak duplicate'leri otomatik skip ediyoruz
  const batchSize = 100;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);
    
    // SQL batch insert oluştur
    const values = batch.map(subscriber => {
      const email = subscriber.email.replace(/'/g, "''"); // SQL injection koruması
      const firstName = subscriber.firstName 
        ? subscriber.firstName.replace(/'/g, "''") 
        : 'NULL';
      return `('${email}', ${firstName === 'NULL' ? 'NULL' : `'${firstName}'`}, 1)`;
    }).join(',\n    ');
    
    const insertQuery = `
      INSERT OR IGNORE INTO subscribers (email, first_name, is_active)
      VALUES
    ${values};
    `;
    
    try {
      const result = await executeQuery(insertQuery);
      const batchInserted = result.meta?.changes || 0;
      const batchSkipped = batch.length - batchInserted;
      
      inserted += batchInserted;
      skipped += batchSkipped;
    } catch (error: any) {
      errors += batch.length;
      console.error(`Batch ${Math.floor(i / batchSize) + 1} hatası:`, error.message);
      
      // Batch başarısız olursa, tek tek deneyelim
      console.log('Batch başarısız, tek tek ekleniyor...');
      for (const subscriber of batch) {
        try {
          await insertTableData('subscribers', {
            email: subscriber.email,
            first_name: subscriber.firstName || null,
            is_active: 1,
          });
          inserted++;
          errors--;
        } catch (err: any) {
          if (err?.message?.includes('UNIQUE constraint') || err?.message?.includes('duplicate')) {
            skipped++;
            errors--;
          }
        }
      }
    }
    
    // Progress göstergesi
    const processed = Math.min(i + batchSize, subscribers.length);
    if (processed % 500 === 0 || processed >= subscribers.length) {
      console.log(`İşlenen: ${processed}/${subscribers.length} | Eklenen: ${inserted} | Atlanan: ${skipped}`);
    }
  }
  
  console.log('\n=== Import Tamamlandı ===');
  console.log(`Başarıyla eklenen: ${inserted}`);
  console.log(`Atlanan (duplicate): ${skipped}`);
  console.log(`Hata: ${errors}`);
}

/**
 * Ana fonksiyon
 */
async function main() {
  const csvPath = path.join(
    process.cwd(),
    'public',
    'GreetingBirds (Automailer Subscribers)-Fri, 02 Jan 2026 20_00_44 GMT.csv'
  );
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV dosyası bulunamadı: ${csvPath}`);
    process.exit(1);
  }
  
  console.log('CSV dosyası parse ediliyor...');
  const subscribers = parseCSV(csvPath);
  
  console.log(`Benzersiz email sayısı: ${new Set(subscribers.map(s => s.email)).size}`);
  
  console.log('\nD1 veritabanına yükleniyor...');
  await importSubscribers(subscribers);
}

// Script çalıştır
main().catch((error) => {
  console.error('Hata:', error);
  process.exit(1);
});

export { parseCSV, importSubscribers };

