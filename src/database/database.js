/**
 * database.js
 * 
 * FUNCIONALIDADE:
 * Configuração e inicialização do banco de dados SQLite local com suporte à sincronização.
 * Define as tabelas e suas estruturas para armazenamento offline e online.
 * 
 * CONCEITOS IMPORTANTES:
 * 
 * 1. SQLITE NO REACT NATIVE:
 *    - Banco de dados local leve e rápido
 *    - Persiste dados mesmo quando o app é fechado
 *    - Suporta SQL padrão para consultas complexas
 *    - Ideal para aplicações offline-first
 * 
 * 2. EXPO-SQLITE:
 *    - Biblioteca oficial do Expo para SQLite
 *    - API simples e bem documentada
 *    - Suporte a transações para operações atômicas
 *    - Compatível com iOS e Android
 * 
 * 3. ESTRUTURA DE TABELAS COM SINCRONIZAÇÃO:
 *    - server_id: ID do registro no servidor
 *    - needs_sync: Flag indicando se precisa sincronizar
 *    - last_synced_at: Timestamp da última sincronização
 *    - is_deleted: Soft delete para sincronização
 * 
 * 4. ESTRATÉGIA OFFLINE-FIRST:
 *    - Dados locais sempre disponíveis
 *    - Sincronização em background
 *    - Resolução de conflitos automática
 */

import * as SQLite from 'expo-sqlite';

/**
 * Nome do banco de dados
 */
const DATABASE_NAME = 'smart_finance.db';

/**
 * Versão do banco de dados (para migrations futuras)
 */
const DATABASE_VERSION = 2; // Incrementado para suportar sincronização

// Abrir/criar o banco de dados
let databasePromise;
let initializationPromise;

const getDatabaseConnection = async () => {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
};

/**
 * Inicializar o banco de dados com suporte à sincronização
 */
const initializeDatabase = async () => {
  const db = await getDatabaseConnection();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      color TEXT DEFAULT '#007AFF',
      icon TEXT DEFAULT 'folder',
      needs_sync INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      last_synced_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(server_id)
    );

    CREATE TABLE IF NOT EXISTS credit_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NULL,
      name TEXT NOT NULL,
      limit_amount REAL DEFAULT 0,
      closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
      due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
      needs_sync INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      last_synced_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(server_id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      category_id INTEGER NOT NULL,
      category_server_id INTEGER NULL,
      credit_card_id INTEGER NULL,
      credit_card_server_id INTEGER NULL,
      transaction_date DATE NOT NULL,
      needs_sync INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      last_synced_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id),
      FOREIGN KEY (credit_card_id) REFERENCES credit_cards (id),
      UNIQUE(server_id)
    );

    CREATE TABLE IF NOT EXISTS financial_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NULL,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      category_id INTEGER NOT NULL,
      category_server_id INTEGER NULL,
      target_date DATE NOT NULL,
      needs_sync INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      last_synced_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id),
      UNIQUE(server_id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      local_id INTEGER,
      server_id INTEGER,
      status TEXT NOT NULL,
      error_message TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await migrateDatabaseWithConnection(db);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_categories_server_id ON categories(server_id);
    CREATE INDEX IF NOT EXISTS idx_categories_needs_sync ON categories(needs_sync);
    CREATE INDEX IF NOT EXISTS idx_transactions_server_id ON transactions(server_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_needs_sync ON transactions(needs_sync);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_credit_cards_server_id ON credit_cards(server_id);
    CREATE INDEX IF NOT EXISTS idx_financial_goals_server_id ON financial_goals(server_id);

    INSERT OR IGNORE INTO categories (id, name, type, color, icon, needs_sync) VALUES
      (1, 'Salário', 'income', '#4CAF50', 'attach-money', 1),
      (2, 'Freelance', 'income', '#8BC34A', 'work', 1),
      (3, 'Investimentos', 'income', '#2196F3', 'trending-up', 1),
      (4, 'Alimentação', 'expense', '#FF5722', 'restaurant', 1),
      (5, 'Transporte', 'expense', '#2196F3', 'directions-car', 1),
      (6, 'Moradia', 'expense', '#9C27B0', 'home', 1),
      (7, 'Lazer', 'expense', '#FF9800', 'movie', 1),
      (8, 'Saúde', 'expense', '#F44336', 'local-hospital', 1);

    INSERT OR IGNORE INTO app_settings (key, value) VALUES
      ('first_launch', 'true'),
      ('auto_sync_enabled', 'true'),
      ('sync_interval', '300000'),
      ('offline_mode', 'false');
  `);

  console.log('[Database] Database initialized successfully with sync support');
};

export const initDatabase = () => {
  if (!initializationPromise) {
    initializationPromise = initializeDatabase().catch(error => {
      initializationPromise = undefined;
      throw error;
    });
  }

  return initializationPromise;
};

/**
 * Open the database only after its schema is ready.
 */
export const openDatabase = async () => {
  await initDatabase();
  return getDatabaseConnection();
};

/**
 * Executar migração do banco de dados para adicionar suporte à sincronização
 */
const migrateDatabaseWithConnection = async db => {
  const columnsByTable = {
    categories: [
      ['server_id', 'INTEGER NULL'],
      ['needs_sync', 'INTEGER DEFAULT 1'],
      ['is_deleted', 'INTEGER DEFAULT 0'],
      ['last_synced_at', 'DATETIME NULL'],
      ['updated_at', 'DATETIME NULL'],
    ],
    credit_cards: [
      ['server_id', 'INTEGER NULL'],
      ['needs_sync', 'INTEGER DEFAULT 1'],
      ['is_deleted', 'INTEGER DEFAULT 0'],
      ['last_synced_at', 'DATETIME NULL'],
      ['updated_at', 'DATETIME NULL'],
    ],
    transactions: [
      ['server_id', 'INTEGER NULL'],
      ['category_server_id', 'INTEGER NULL'],
      ['credit_card_server_id', 'INTEGER NULL'],
      ['needs_sync', 'INTEGER DEFAULT 1'],
      ['is_deleted', 'INTEGER DEFAULT 0'],
      ['last_synced_at', 'DATETIME NULL'],
      ['updated_at', 'DATETIME NULL'],
    ],
    financial_goals: [
      ['server_id', 'INTEGER NULL'],
      ['category_server_id', 'INTEGER NULL'],
      ['needs_sync', 'INTEGER DEFAULT 1'],
      ['is_deleted', 'INTEGER DEFAULT 0'],
      ['last_synced_at', 'DATETIME NULL'],
      ['updated_at', 'DATETIME NULL'],
    ],
  };

  await db.withTransactionAsync(async () => {
    for (const [tableName, columns] of Object.entries(columnsByTable)) {
      const existingColumns = await db.getAllAsync(`PRAGMA table_info(${tableName})`);
      const existingColumnNames = new Set(existingColumns.map(column => column.name));
      const needsSyncMigration = !existingColumnNames.has('server_id');

      for (const [columnName, columnDefinition] of columns) {
        if (!existingColumnNames.has(columnName)) {
          await db.execAsync(
            `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`
          );
        }
      }

      if (needsSyncMigration) {
        await db.runAsync(
          `UPDATE ${tableName} SET needs_sync = 1 WHERE server_id IS NULL`
        );
      }

      await db.runAsync(
        `UPDATE ${tableName} SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL`
      );
    }
  });
};

export const migrateDatabase = async () => {
  await initDatabase();
  const db = await getDatabaseConnection();
  await migrateDatabaseWithConnection(db);
};

/**
 * Função para executar queries
 */
export const executeQuery = async (sql, params = []) => {
  const db = await openDatabase();
  const result = await db.runAsync(sql, params);
  return { ...result, insertId: result.lastInsertRowId };
};

/**
 * Função para buscar dados
 */
export const fetchData = async (sql, params = []) => {
  const db = await openDatabase();
  return db.getAllAsync(sql, params);
};

/**
 * Marcar registro para sincronização
 */
export const markForSync = async (tableName, id) => {
  if (!['categories', 'credit_cards', 'transactions', 'financial_goals'].includes(tableName)) {
    throw new Error(`Unsupported table for sync: ${tableName}`);
  }

  const db = await openDatabase();
  await db.runAsync(
    `UPDATE ${tableName} SET needs_sync = 1, updated_at = ? WHERE id = ?`,
    [new Date().toISOString(), id]
  );
  console.log(`[Database] Marked ${tableName} record ${id} for sync`);
};

/**
 * Obter estatísticas de sincronização
 */
export const getSyncStats = async () => {
  const db = await openDatabase();
  const [categories, transactions, creditCards, goals] = await Promise.all([
    db.getFirstAsync('SELECT COUNT(*) as count FROM categories WHERE needs_sync = 1'),
    db.getFirstAsync('SELECT COUNT(*) as count FROM transactions WHERE needs_sync = 1'),
    db.getFirstAsync('SELECT COUNT(*) as count FROM credit_cards WHERE needs_sync = 1'),
    db.getFirstAsync('SELECT COUNT(*) as count FROM financial_goals WHERE needs_sync = 1'),
  ]);

  return {
    categoriesPending: categories.count,
    transactionsPending: transactions.count,
    creditCardsPending: creditCards.count,
    goalsPending: goals.count,
  };
};

export default openDatabase;
