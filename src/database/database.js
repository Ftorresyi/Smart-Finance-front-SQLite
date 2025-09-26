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
const db = SQLite.openDatabase(DATABASE_NAME);

/**
 * Abrir conexão com o banco de dados
 */
export const openDatabase = () => {
  return SQLite.openDatabase(DATABASE_NAME);
};

/**
 * Inicializar o banco de dados com suporte à sincronização
 */
export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.transaction(
      tx => {
        // Criar tabela de categorias com suporte à sincronização
        tx.executeSql(`
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
        `);

        // Criar tabela de cartões de crédito com suporte à sincronização
        tx.executeSql(`
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
        `);

        // Criar tabela de transações com suporte à sincronização
        tx.executeSql(`
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
        `);

        // Criar tabela de metas financeiras com suporte à sincronização
        tx.executeSql(`
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
        `);

        // Criar tabela de configurações do app
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS app_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT NOT NULL UNIQUE,
            value TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Criar tabela de log de sincronização
        tx.executeSql(`
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

        // Criar índices para performance
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_categories_server_id ON categories(server_id);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_categories_needs_sync ON categories(needs_sync);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_transactions_server_id ON transactions(server_id);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_transactions_needs_sync ON transactions(needs_sync);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_credit_cards_server_id ON credit_cards(server_id);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_financial_goals_server_id ON financial_goals(server_id);');

        // Inserir categorias padrão se não existirem
        tx.executeSql(`
          INSERT OR IGNORE INTO categories (id, name, type, color, icon, needs_sync) VALUES
          (1, 'Salário', 'income', '#4CAF50', 'attach-money', 1),
          (2, 'Freelance', 'income', '#8BC34A', 'work', 1),
          (3, 'Investimentos', 'income', '#2196F3', 'trending-up', 1),
          (4, 'Alimentação', 'expense', '#FF5722', 'restaurant', 1),
          (5, 'Transporte', 'expense', '#2196F3', 'directions-car', 1),
          (6, 'Moradia', 'expense', '#9C27B0', 'home', 1),
          (7, 'Lazer', 'expense', '#FF9800', 'movie', 1),
          (8, 'Saúde', 'expense', '#F44336', 'local-hospital', 1);
        `);

        // Inserir configurações padrão
        tx.executeSql(`
          INSERT OR IGNORE INTO app_settings (key, value) VALUES
          ('first_launch', 'true'),
          ('auto_sync_enabled', 'true'),
          ('sync_interval', '300000'),
          ('offline_mode', 'false');
        `);

        console.log('[Database] Tables created successfully with sync support');
      },
      error => {
        console.error('[Database] Error creating tables:', error);
        reject(error);
      },
      () => {
        console.log('[Database] Database initialized successfully with sync support');
        resolve();
      }
    );
  });
};

/**
 * Executar migração do banco de dados para adicionar suporte à sincronização
 */
export const migrateDatabase = () => {
  return new Promise((resolve, reject) => {
    db.transaction(
      tx => {
        // Verificar se as colunas de sincronização já existem
        tx.executeSql(
          "PRAGMA table_info(categories)",
          [],
          (_, result) => {
            const columns = result.rows._array.map(col => col.name);
            
            // Se não tem a coluna server_id, fazer migração
            if (!columns.includes('server_id')) {
              console.log('[Database] Running migration to add sync support');
              
              // Adicionar colunas de sincronização às tabelas existentes
              tx.executeSql('ALTER TABLE categories ADD COLUMN server_id INTEGER NULL;');
              tx.executeSql('ALTER TABLE categories ADD COLUMN needs_sync INTEGER DEFAULT 1;');
              tx.executeSql('ALTER TABLE categories ADD COLUMN is_deleted INTEGER DEFAULT 0;');
              tx.executeSql('ALTER TABLE categories ADD COLUMN last_synced_at DATETIME NULL;');
              
              tx.executeSql('ALTER TABLE credit_cards ADD COLUMN server_id INTEGER NULL;');
              tx.executeSql('ALTER TABLE credit_cards ADD COLUMN needs_sync INTEGER DEFAULT 1;');
              tx.executeSql('ALTER TABLE credit_cards ADD COLUMN is_deleted INTEGER DEFAULT 0;');
              tx.executeSql('ALTER TABLE credit_cards ADD COLUMN last_synced_at DATETIME NULL;');
              
              tx.executeSql('ALTER TABLE transactions ADD COLUMN server_id INTEGER NULL;');
              tx.executeSql('ALTER TABLE transactions ADD COLUMN category_server_id INTEGER NULL;');
              tx.executeSql('ALTER TABLE transactions ADD COLUMN credit_card_server_id INTEGER NULL;');
              tx.executeSql('ALTER TABLE transactions ADD COLUMN needs_sync INTEGER DEFAULT 1;');
              tx.executeSql('ALTER TABLE transactions ADD COLUMN is_deleted INTEGER DEFAULT 0;');
              tx.executeSql('ALTER TABLE transactions ADD COLUMN last_synced_at DATETIME NULL;');
              
              tx.executeSql('ALTER TABLE financial_goals ADD COLUMN server_id INTEGER NULL;');
              tx.executeSql('ALTER TABLE financial_goals ADD COLUMN category_server_id INTEGER NULL;');
              tx.executeSql('ALTER TABLE financial_goals ADD COLUMN needs_sync INTEGER DEFAULT 1;');
              tx.executeSql('ALTER TABLE financial_goals ADD COLUMN is_deleted INTEGER DEFAULT 0;');
              tx.executeSql('ALTER TABLE financial_goals ADD COLUMN last_synced_at DATETIME NULL;');
              
              // Marcar dados existentes para sincronização
              tx.executeSql('UPDATE categories SET needs_sync = 1 WHERE server_id IS NULL;');
              tx.executeSql('UPDATE credit_cards SET needs_sync = 1 WHERE server_id IS NULL;');
              tx.executeSql('UPDATE transactions SET needs_sync = 1 WHERE server_id IS NULL;');
              tx.executeSql('UPDATE financial_goals SET needs_sync = 1 WHERE server_id IS NULL;');
              
              console.log('[Database] Migration completed successfully');
            }
          }
        );
      },
      error => {
        console.error('[Database] Migration error:', error);
        reject(error);
      },
      () => {
        resolve();
      }
    );
  });
};

/**
 * Função para executar queries
 */
export const executeQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, result) => resolve(result),
        (_, error) => {
          console.log('Erro na query:', error);
          reject(error);
        }
      );
    });
  });
};

/**
 * Função para buscar dados
 */
export const fetchData = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, result) => {
          const rows = [];
          for (let i = 0; i < result.rows.length; i++) {
            rows.push(result.rows.item(i));
          }
          resolve(rows);
        },
        (_, error) => {
          console.log('Erro ao buscar dados:', error);
          reject(error);
        }
      );
    });
  });
};

/**
 * Marcar registro para sincronização
 */
export const markForSync = (tableName, id) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `UPDATE ${tableName} SET needs_sync = 1, updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), id],
        () => {
          console.log(`[Database] Marked ${tableName} record ${id} for sync`);
          resolve();
        },
        (_, error) => {
          console.error(`[Database] Error marking ${tableName} record for sync:`, error);
          reject(error);
        }
      );
    });
  });
};

/**
 * Obter estatísticas de sincronização
 */
export const getSyncStats = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      const stats = {};
      let completedQueries = 0;
      const totalQueries = 4;

      const checkComplete = () => {
        completedQueries++;
        if (completedQueries === totalQueries) {
          resolve(stats);
        }
      };

      // Contar registros que precisam sincronizar
      tx.executeSql(
        'SELECT COUNT(*) as count FROM categories WHERE needs_sync = 1',
        [],
        (_, result) => {
          stats.categoriesPending = result.rows.item(0).count;
          checkComplete();
        }
      );

      tx.executeSql(
        'SELECT COUNT(*) as count FROM transactions WHERE needs_sync = 1',
        [],
        (_, result) => {
          stats.transactionsPending = result.rows.item(0).count;
          checkComplete();
        }
      );

      tx.executeSql(
        'SELECT COUNT(*) as count FROM credit_cards WHERE needs_sync = 1',
        [],
        (_, result) => {
          stats.creditCardsPending = result.rows.item(0).count;
          checkComplete();
        }
      );

      tx.executeSql(
        'SELECT COUNT(*) as count FROM financial_goals WHERE needs_sync = 1',
        [],
        (_, result) => {
          stats.goalsPending = result.rows.item(0).count;
          checkComplete();
        }
      );
    }, reject);
  });
};

export default db;

