import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'expenses.db');
  db = new Database(dbPath);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Initialize database schema
  initDatabase();

  return db;
}

// Initialize database schema
function initDatabase() {
  if (!db) return;
  // Main transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      transaction_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      raw_input TEXT,
      ai_confidence REAL,
      metadata JSON
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_date ON transactions(user_id, transaction_date);
    CREATE INDEX IF NOT EXISTS idx_category_amount ON transactions(category, amount);
    CREATE INDEX IF NOT EXISTS idx_date_amount ON transactions(transaction_date, amount);
  `);

  // FTS5 table for semantic search
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS transactions_fts USING fts5(
      description,
      category,
      content=transactions,
      content_rowid=rowid
    );
  `);

  // Triggers to sync FTS
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS transactions_ai AFTER INSERT ON transactions BEGIN
      INSERT INTO transactions_fts(rowid, description, category)
      VALUES (new.rowid, new.description, new.category);
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS transactions_au AFTER UPDATE ON transactions BEGIN
      UPDATE transactions_fts SET description = new.description, category = new.category
      WHERE rowid = new.rowid;
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS transactions_ad AFTER DELETE ON transactions BEGIN
      DELETE FROM transactions_fts WHERE rowid = old.rowid;
    END;
  `);
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
  created_at: string;
  raw_input: string | null;
  ai_confidence: number | null;
  metadata: string | null;
}

// Save a new transaction
export function saveTransaction(transaction: {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
  raw_input: string;
  ai_confidence: number;
  metadata?: Record<string, any>;
}): Transaction {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO transactions (
      id, user_id, amount, category, description,
      transaction_date, raw_input, ai_confidence, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    transaction.id,
    transaction.user_id,
    transaction.amount,
    transaction.category,
    transaction.description,
    transaction.transaction_date,
    transaction.raw_input,
    transaction.ai_confidence,
    transaction.metadata ? JSON.stringify(transaction.metadata) : null
  );

  // Fetch the inserted transaction
  const select = database.prepare('SELECT * FROM transactions WHERE id = ?');
  return select.get(transaction.id) as Transaction;
}

// Check for duplicate transactions
export function checkDuplicates(
  userId: string,
  amount: number,
  category: string,
  daysBack: number = 1
): Transaction[] {
  const database = getDb();
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysBack);
  const dateStr = dateThreshold.toISOString().split('T')[0];

  const amountMin = amount * 0.9;
  const amountMax = amount * 1.1;

  const stmt = database.prepare(`
    SELECT *
    FROM transactions
    WHERE user_id = ?
      AND category = ?
      AND transaction_date >= ?
      AND amount >= ?
      AND amount <= ?
    ORDER BY transaction_date DESC, ABS(amount - ?) ASC
    LIMIT 5
  `);

  return stmt.all(userId, category, dateStr, amountMin, amountMax, amount) as Transaction[];
}

// Get transactions for a user within a date range
export function getTransactions(
  userId: string,
  fromDate?: string,
  toDate?: string
): Transaction[] {
  const database = getDb();
  let query = 'SELECT * FROM transactions WHERE user_id = ?';
  const params: any[] = [userId];

  if (fromDate) {
    query += ' AND transaction_date >= ?';
    params.push(fromDate);
  }

  if (toDate) {
    query += ' AND transaction_date <= ?';
    params.push(toDate);
  }

  query += ' ORDER BY transaction_date DESC';

  const stmt = database.prepare(query);
  return stmt.all(...params) as Transaction[];
}

// Get monthly statistics
export function getMonthlyStats(userId: string, year: number, month: number) {
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const transactions = getTransactions(userId, startDate, endDate);

  if (transactions.length === 0) {
    return null;
  }

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const count = transactions.length;
  const average = total / count;

  // Group by category
  const categoryMap = new Map<string, { total: number; count: number }>();
  transactions.forEach(t => {
    const existing = categoryMap.get(t.category) || { total: 0, count: 0 };
    categoryMap.set(t.category, {
      total: existing.total + t.amount,
      count: existing.count + 1
    });
  });

  const byCategory = Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      total: stats.total,
      count: stats.count,
      percentage: Math.round((stats.total / total) * 1000) / 10
    }))
    .sort((a, b) => b.total - a.total);

  // Top 5 transactions
  const topTransactions = [...transactions]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    total,
    count,
    average,
    byCategory,
    topTransactions,
    allTransactions: transactions
  };
}

export default getDb;
