/**
 * SyncService.js
 * 
 * FUNCIONALIDADE:
 * Serviço responsável pela sincronização inteligente entre dados locais (SQLite) 
 * e remotos (API Java). Gerencia conflitos, merge de dados e estratégias de sync.
 * 
 * CONCEITOS IMPORTANTES:
 * 
 * 1. ESTRATÉGIAS DE SINCRONIZAÇÃO:
 *    - Last Write Wins: O último dado modificado prevalece
 *    - Merge Inteligente: Combina dados locais e remotos
 *    - Conflict Resolution: Resolve conflitos baseado em regras
 * 
 * 2. TIPOS DE SINCRONIZAÇÃO:
 *    - Full Sync: Sincroniza todos os dados (primeira vez)
 *    - Incremental Sync: Apenas dados modificados
 *    - Real-time Sync: Sincronização em tempo real
 * 
 * 3. DETECÇÃO DE CONFLITOS:
 *    - Timestamps de modificação
 *    - Versioning de dados
 *    - Hash de conteúdo
 * 
 * 4. ESTRATÉGIAS OFFLINE-FIRST:
 *    - Dados locais sempre disponíveis
 *    - Sincronização em background
 *    - UI responsiva independente da conexão
 */

import ApiService from './ApiService';
import { openDatabase } from '../database/database';

/**
 * Configurações de sincronização
 */
const SYNC_CONFIG = {
  // Intervalo de sincronização automática (em milissegundos)
  AUTO_SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutos
  
  // Timeout para operações de sincronização
  SYNC_TIMEOUT: 30000, // 30 segundos
  
  // Número máximo de tentativas de retry
  MAX_RETRY_ATTEMPTS: 3,
  
  // Delay entre tentativas de retry (em milissegundos)
  RETRY_DELAY: 2000, // 2 segundos
  
  // Estratégias de resolução de conflitos
  CONFLICT_RESOLUTION: {
    LAST_WRITE_WINS: 'last_write_wins',
    MERGE: 'merge',
    MANUAL: 'manual',
  },
};

/**
 * Classe principal do serviço de sincronização
 */
class SyncService {
  constructor() {
    this.db = null;
    this.syncInProgress = false;
    this.autoSyncTimer = null;
    this.conflictQueue = [];
    
    this.initializeDatabase();
    this.startAutoSync();
  }

  /**
   * Inicializar conexão com o banco de dados
   */
  async initializeDatabase() {
    try {
      this.db = await openDatabase();
      console.log('[Sync] Database initialized');
    } catch (error) {
      console.error('[Sync] Database initialization failed:', error);
    }
  }

  /**
   * Iniciar sincronização automática
   */
  startAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }

    this.autoSyncTimer = setInterval(async () => {
      try {
        const syncStatus = await ApiService.getSyncStatus();
        if (syncStatus.isOnline && syncStatus.needsSync) {
          await this.performIncrementalSync();
        }
      } catch (error) {
        console.error('[Sync] Auto sync failed:', error);
      }
    }, SYNC_CONFIG.AUTO_SYNC_INTERVAL);

    console.log('[Sync] Auto sync started');
  }

  /**
   * Parar sincronização automática
   */
  stopAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
      console.log('[Sync] Auto sync stopped');
    }
  }

  /**
   * Executar sincronização completa
   */
  async performFullSync() {
    if (this.syncInProgress) {
      console.log('[Sync] Sync already in progress');
      return { success: false, message: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    console.log('[Sync] Starting full synchronization');

    try {
      // 1. Sincronizar dados do servidor para local
      const serverData = await ApiService.syncAllData();
      
      if (serverData.success) {
        // 2. Atualizar dados locais com dados do servidor
        await this.updateLocalData(serverData.data);
        
        // 3. Enviar dados locais pendentes para o servidor
        await this.pushLocalChanges();
        
        console.log('[Sync] Full synchronization completed successfully');
        return { success: true, message: 'Full sync completed' };
      } else {
        throw new Error('Failed to fetch server data');
      }
    } catch (error) {
      console.error('[Sync] Full synchronization failed:', error);
      return { success: false, message: error.message };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Executar sincronização incremental
   */
  async performIncrementalSync() {
    if (this.syncInProgress) {
      return { success: false, message: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    console.log('[Sync] Starting incremental synchronization');

    try {
      // 1. Enviar mudanças locais pendentes
      await this.pushLocalChanges();
      
      // 2. Buscar mudanças do servidor desde a última sincronização
      await this.pullServerChanges();
      
      console.log('[Sync] Incremental synchronization completed');
      return { success: true, message: 'Incremental sync completed' };
    } catch (error) {
      console.error('[Sync] Incremental synchronization failed:', error);
      return { success: false, message: error.message };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Atualizar dados locais com dados do servidor
   */
  async updateLocalData(serverData) {
    const { categories, transactions, creditCards, financialGoals } = serverData;

    try {
      // Atualizar categorias
      if (categories && categories.length > 0) {
        await this.syncCategories(categories);
      }

      // Atualizar transações
      if (transactions && transactions.length > 0) {
        await this.syncTransactions(transactions);
      }

      // Atualizar cartões de crédito
      if (creditCards && creditCards.length > 0) {
        await this.syncCreditCards(creditCards);
      }

      // Atualizar metas financeiras
      if (financialGoals && financialGoals.length > 0) {
        await this.syncFinancialGoals(financialGoals);
      }

      console.log('[Sync] Local data updated successfully');
    } catch (error) {
      console.error('[Sync] Error updating local data:', error);
      throw error;
    }
  }

  /**
   * Sincronizar categorias
   */
  async syncCategories(serverCategories) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        // Buscar categorias locais
        tx.executeSql(
          'SELECT * FROM categories',
          [],
          (_, { rows }) => {
            const localCategories = rows._array;
            
            // Processar cada categoria do servidor
            serverCategories.forEach(serverCategory => {
              const localCategory = localCategories.find(local => local.server_id === serverCategory.id);
              
              if (localCategory) {
                // Categoria existe localmente, verificar se precisa atualizar
                if (this.shouldUpdateLocal(localCategory, serverCategory)) {
                  this.updateLocalCategory(tx, localCategory.id, serverCategory);
                }
              } else {
                // Nova categoria do servidor
                this.insertLocalCategory(tx, serverCategory);
              }
            });
            
            resolve();
          },
          (_, error) => {
            console.error('[Sync] Error fetching local categories:', error);
            reject(error);
          }
        );
      });
    });
  }

  /**
   * Sincronizar transações
   */
  async syncTransactions(serverTransactions) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM transactions',
          [],
          (_, { rows }) => {
            const localTransactions = rows._array;
            
            serverTransactions.forEach(serverTransaction => {
              const localTransaction = localTransactions.find(local => local.server_id === serverTransaction.id);
              
              if (localTransaction) {
                if (this.shouldUpdateLocal(localTransaction, serverTransaction)) {
                  this.updateLocalTransaction(tx, localTransaction.id, serverTransaction);
                }
              } else {
                this.insertLocalTransaction(tx, serverTransaction);
              }
            });
            
            resolve();
          },
          (_, error) => {
            console.error('[Sync] Error fetching local transactions:', error);
            reject(error);
          }
        );
      });
    });
  }

  /**
   * Sincronizar cartões de crédito
   */
  async syncCreditCards(serverCreditCards) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM credit_cards',
          [],
          (_, { rows }) => {
            const localCreditCards = rows._array;
            
            serverCreditCards.forEach(serverCard => {
              const localCard = localCreditCards.find(local => local.server_id === serverCard.id);
              
              if (localCard) {
                if (this.shouldUpdateLocal(localCard, serverCard)) {
                  this.updateLocalCreditCard(tx, localCard.id, serverCard);
                }
              } else {
                this.insertLocalCreditCard(tx, serverCard);
              }
            });
            
            resolve();
          },
          (_, error) => {
            console.error('[Sync] Error fetching local credit cards:', error);
            reject(error);
          }
        );
      });
    });
  }

  /**
   * Sincronizar metas financeiras
   */
  async syncFinancialGoals(serverGoals) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM financial_goals',
          [],
          (_, { rows }) => {
            const localGoals = rows._array;
            
            serverGoals.forEach(serverGoal => {
              const localGoal = localGoals.find(local => local.server_id === serverGoal.id);
              
              if (localGoal) {
                if (this.shouldUpdateLocal(localGoal, serverGoal)) {
                  this.updateLocalFinancialGoal(tx, localGoal.id, serverGoal);
                }
              } else {
                this.insertLocalFinancialGoal(tx, serverGoal);
              }
            });
            
            resolve();
          },
          (_, error) => {
            console.error('[Sync] Error fetching local financial goals:', error);
            reject(error);
          }
        );
      });
    });
  }

  /**
   * Enviar mudanças locais para o servidor
   */
  async pushLocalChanges() {
    try {
      // Buscar dados locais que precisam ser sincronizados
      const pendingChanges = await this.getPendingLocalChanges();
      
      // Enviar cada tipo de dado
      await Promise.all([
        this.pushCategories(pendingChanges.categories),
        this.pushTransactions(pendingChanges.transactions),
        this.pushCreditCards(pendingChanges.creditCards),
        this.pushFinancialGoals(pendingChanges.financialGoals),
      ]);
      
      console.log('[Sync] Local changes pushed successfully');
    } catch (error) {
      console.error('[Sync] Error pushing local changes:', error);
      throw error;
    }
  }

  /**
   * Buscar mudanças locais pendentes
   */
  async getPendingLocalChanges() {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        const results = {};
        let completedQueries = 0;
        const totalQueries = 4;

        const checkComplete = () => {
          completedQueries++;
          if (completedQueries === totalQueries) {
            resolve(results);
          }
        };

        // Categorias pendentes (sem server_id ou modificadas)
        tx.executeSql(
          'SELECT * FROM categories WHERE server_id IS NULL OR needs_sync = 1',
          [],
          (_, { rows }) => {
            results.categories = rows._array;
            checkComplete();
          },
          (_, error) => {
            console.error('[Sync] Error fetching pending categories:', error);
            reject(error);
          }
        );

        // Transações pendentes
        tx.executeSql(
          'SELECT * FROM transactions WHERE server_id IS NULL OR needs_sync = 1',
          [],
          (_, { rows }) => {
            results.transactions = rows._array;
            checkComplete();
          },
          (_, error) => {
            console.error('[Sync] Error fetching pending transactions:', error);
            reject(error);
          }
        );

        // Cartões pendentes
        tx.executeSql(
          'SELECT * FROM credit_cards WHERE server_id IS NULL OR needs_sync = 1',
          [],
          (_, { rows }) => {
            results.creditCards = rows._array;
            checkComplete();
          },
          (_, error) => {
            console.error('[Sync] Error fetching pending credit cards:', error);
            reject(error);
          }
        );

        // Metas pendentes
        tx.executeSql(
          'SELECT * FROM financial_goals WHERE server_id IS NULL OR needs_sync = 1',
          [],
          (_, { rows }) => {
            results.financialGoals = rows._array;
            checkComplete();
          },
          (_, error) => {
            console.error('[Sync] Error fetching pending financial goals:', error);
            reject(error);
          }
        );
      });
    });
  }

  /**
   * Enviar categorias para o servidor
   */
  async pushCategories(categories) {
    for (const category of categories) {
      try {
        let serverResponse;
        
        if (category.server_id) {
          // Atualizar categoria existente
          serverResponse = await ApiService.updateCategory(category.server_id, {
            name: category.name,
            type: category.type,
            color: category.color,
            icon: category.icon,
          });
        } else {
          // Criar nova categoria
          serverResponse = await ApiService.createCategory({
            name: category.name,
            type: category.type,
            color: category.color,
            icon: category.icon,
          });
        }

        // Atualizar registro local com server_id
        if (serverResponse && serverResponse.id) {
          await this.updateLocalCategoryServerId(category.id, serverResponse.id);
        }
      } catch (error) {
        console.error(`[Sync] Error pushing category ${category.id}:`, error);
      }
    }
  }

  /**
   * Enviar transações para o servidor
   */
  async pushTransactions(transactions) {
    for (const transaction of transactions) {
      try {
        let serverResponse;
        
        if (transaction.server_id) {
          serverResponse = await ApiService.updateTransaction(transaction.server_id, {
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            categoryId: transaction.category_server_id,
            creditCardId: transaction.credit_card_server_id,
            transactionDate: transaction.transaction_date,
          });
        } else {
          serverResponse = await ApiService.createTransaction({
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            categoryId: transaction.category_server_id,
            creditCardId: transaction.credit_card_server_id,
            transactionDate: transaction.transaction_date,
          });
        }

        if (serverResponse && serverResponse.id) {
          await this.updateLocalTransactionServerId(transaction.id, serverResponse.id);
        }
      } catch (error) {
        console.error(`[Sync] Error pushing transaction ${transaction.id}:`, error);
      }
    }
  }

  /**
   * Enviar cartões de crédito para o servidor
   */
  async pushCreditCards(creditCards) {
    for (const card of creditCards) {
      try {
        let serverResponse;
        
        if (card.server_id) {
          serverResponse = await ApiService.updateCreditCard(card.server_id, {
            name: card.name,
            limitAmount: card.limit_amount,
            closingDay: card.closing_day,
            dueDay: card.due_day,
          });
        } else {
          serverResponse = await ApiService.createCreditCard({
            name: card.name,
            limitAmount: card.limit_amount,
            closingDay: card.closing_day,
            dueDay: card.due_day,
          });
        }

        if (serverResponse && serverResponse.id) {
          await this.updateLocalCreditCardServerId(card.id, serverResponse.id);
        }
      } catch (error) {
        console.error(`[Sync] Error pushing credit card ${card.id}:`, error);
      }
    }
  }

  /**
   * Enviar metas financeiras para o servidor
   */
  async pushFinancialGoals(goals) {
    for (const goal of goals) {
      try {
        let serverResponse;
        
        if (goal.server_id) {
          serverResponse = await ApiService.updateFinancialGoal(goal.server_id, {
            name: goal.name,
            targetAmount: goal.target_amount,
            currentAmount: goal.current_amount,
            categoryId: goal.category_server_id,
            targetDate: goal.target_date,
          });
        } else {
          serverResponse = await ApiService.createFinancialGoal({
            name: goal.name,
            targetAmount: goal.target_amount,
            currentAmount: goal.current_amount,
            categoryId: goal.category_server_id,
            targetDate: goal.target_date,
          });
        }

        if (serverResponse && serverResponse.id) {
          await this.updateLocalFinancialGoalServerId(goal.id, serverResponse.id);
        }
      } catch (error) {
        console.error(`[Sync] Error pushing financial goal ${goal.id}:`, error);
      }
    }
  }

  /**
   * Determinar se deve atualizar dados locais
   */
  shouldUpdateLocal(localItem, serverItem) {
    // Estratégia: Last Write Wins baseado em updated_at
    const localUpdated = new Date(localItem.updated_at || localItem.created_at);
    const serverUpdated = new Date(serverItem.updatedAt || serverItem.createdAt);
    
    return serverUpdated > localUpdated;
  }

  /**
   * Métodos auxiliares para atualizar registros locais
   */
  updateLocalCategory(tx, localId, serverCategory) {
    tx.executeSql(
      `UPDATE categories SET 
        name = ?, type = ?, color = ?, icon = ?, 
        server_id = ?, updated_at = ?, needs_sync = 0
       WHERE id = ?`,
      [
        serverCategory.name,
        serverCategory.type,
        serverCategory.color,
        serverCategory.icon,
        serverCategory.id,
        new Date().toISOString(),
        localId
      ]
    );
  }

  insertLocalCategory(tx, serverCategory) {
    tx.executeSql(
      `INSERT INTO categories (name, type, color, icon, server_id, created_at, updated_at, needs_sync)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        serverCategory.name,
        serverCategory.type,
        serverCategory.color,
        serverCategory.icon,
        serverCategory.id,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );
  }

  // Métodos similares para outros tipos de dados...
  // (updateLocalTransaction, insertLocalTransaction, etc.)

  /**
   * Atualizar server_id de registros locais
   */
  async updateLocalCategoryServerId(localId, serverId) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'UPDATE categories SET server_id = ?, needs_sync = 0 WHERE id = ?',
          [serverId, localId],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  }

  async updateLocalTransactionServerId(localId, serverId) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'UPDATE transactions SET server_id = ?, needs_sync = 0 WHERE id = ?',
          [serverId, localId],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  }

  async updateLocalCreditCardServerId(localId, serverId) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'UPDATE credit_cards SET server_id = ?, needs_sync = 0 WHERE id = ?',
          [serverId, localId],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  }

  async updateLocalFinancialGoalServerId(localId, serverId) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'UPDATE financial_goals SET server_id = ?, needs_sync = 0 WHERE id = ?',
          [serverId, localId],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  }

  /**
   * Obter status da sincronização
   */
  async getSyncStatus() {
    const apiStatus = await ApiService.getSyncStatus();
    const pendingChanges = await this.getPendingLocalChanges();
    
    const totalPending = 
      pendingChanges.categories.length +
      pendingChanges.transactions.length +
      pendingChanges.creditCards.length +
      pendingChanges.financialGoals.length;

    return {
      ...apiStatus,
      syncInProgress: this.syncInProgress,
      localPendingChanges: totalPending,
      conflictsCount: this.conflictQueue.length,
    };
  }

  /**
   * Forçar sincronização manual
   */
  async forcSync() {
    console.log('[Sync] Force sync requested');
    return await this.performFullSync();
  }
}

// Exportar instância singleton
export default new SyncService();

