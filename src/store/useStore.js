/**
 * useStore.js
 * 
 * FUNCIONALIDADE:
 * Store global do aplicativo usando Zustand, integrado com API backend e sincronização.
 * Gerencia estado da aplicação, dados locais e remotos, e status de sincronização.
 * 
 * CONCEITOS IMPORTANTES:
 * 
 * 1. ZUSTAND:
 *    - Biblioteca de gerenciamento de estado simples e eficiente
 *    - Menos boilerplate que Redux
 *    - TypeScript friendly
 *    - Suporte a middleware e devtools
 * 
 * 2. ESTRATÉGIA OFFLINE-FIRST:
 *    - Estado sempre reflete dados locais
 *    - Sincronização em background
 *    - UI responsiva independente da conexão
 * 
 * 3. OPTIMISTIC UPDATES:
 *    - UI atualizada imediatamente
 *    - Rollback em caso de erro
 *    - Melhor experiência do usuário
 * 
 * 4. CACHE E PERFORMANCE:
 *    - Dados em memória para acesso rápido
 *    - Invalidação inteligente de cache
 *    - Lazy loading quando necessário
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { initDatabase, executeQuery, fetchData, markForSync, migrateDatabase } from '../database/database';
import ApiService from '../services/ApiService';
import SyncService from '../services/SyncService';

/**
 * Interface do store principal
 */
const useStore = create(
  devtools(
    (set, get) => ({
      // ==========================================
      // ESTADO INICIAL
      // ==========================================
      
      // Dados da aplicação
      categories: [],
      transactions: [],
      creditCards: [],
      financialGoals: [],
      
      // Estado de carregamento
      loading: {
        categories: false,
        transactions: false,
        creditCards: false,
        financialGoals: false,
        sync: false,
        auth: false,
      },
      
      // Estado de sincronização
      syncStatus: {
        isOnline: true,
        lastSync: null,
        pendingOperations: 0,
        syncInProgress: false,
        localPendingChanges: 0,
        conflictsCount: 0,
      },
      
      // Estado de autenticação
      auth: {
        isAuthenticated: false,
        user: null,
        token: null,
      },
      
      // Estado de erro
      errors: {},
      
      // Flag de inicialização
      isInitialized: false,
      
      // ==========================================
      // AÇÕES DE INICIALIZAÇÃO
      // ==========================================
      
      /**
       * Inicializar aplicação
       */
      initializeApp: async () => {
        try {
          console.log('[Store] Initializing application...');
          
          // 1. Inicializar banco de dados
          await initDatabase();
          
          // 2. Executar migração se necessário
          await migrateDatabase();
          
          // 3. Verificar autenticação
          const isAuthenticated = await ApiService.isAuthenticated();
          if (isAuthenticated) {
            set(state => ({
              auth: { ...state.auth, isAuthenticated: true }
            }));
          }
          
          // 4. Carregar dados locais
          await get().loadLocalData();
          
          // 5. Iniciar sincronização se autenticado
          if (isAuthenticated) {
            get().startSync();
          }
          
          set({ isInitialized: true });
          console.log('[Store] Application initialized successfully');
        } catch (error) {
          console.error('[Store] Error initializing application:', error);
          set(state => ({
            errors: { ...state.errors, initialization: error.message }
          }));
        }
      },
      
      /**
       * Carregar dados locais do SQLite
       */
      loadLocalData: async () => {
        try {
          console.log('[Store] Loading local data...');
          
          // Carregar todos os dados em paralelo
          const [categories, transactions, creditCards, financialGoals] = await Promise.all([
            fetchData('SELECT * FROM categories WHERE is_deleted = 0 ORDER BY name'),
            fetchData(`
              SELECT t.*, c.name as category_name, c.color as category_color,
                     cc.name as credit_card_name
              FROM transactions t
              LEFT JOIN categories c ON t.category_id = c.id
              LEFT JOIN credit_cards cc ON t.credit_card_id = cc.id
              WHERE t.is_deleted = 0
              ORDER BY t.transaction_date DESC
            `),
            fetchData('SELECT * FROM credit_cards WHERE is_deleted = 0 ORDER BY name'),
            fetchData(`
              SELECT fg.*, c.name as category_name, c.color as category_color
              FROM financial_goals fg
              LEFT JOIN categories c ON fg.category_id = c.id
              WHERE fg.is_deleted = 0
              ORDER BY fg.target_date
            `),
          ]);
          
          set({
            categories,
            transactions,
            creditCards,
            financialGoals,
          });
          
          console.log('[Store] Local data loaded successfully');
        } catch (error) {
          console.error('[Store] Error loading local data:', error);
          set(state => ({
            errors: { ...state.errors, loadData: error.message }
          }));
        }
      },
      
      // ==========================================
      // AÇÕES DE AUTENTICAÇÃO
      // ==========================================
      
      /**
       * Fazer login
       */
      login: async (email, password) => {
        try {
          set(state => ({
            loading: { ...state.loading, auth: true }
          }));
          
          const result = await ApiService.login(email, password);
          
          if (result.success) {
            set(state => ({
              auth: {
                isAuthenticated: true,
                user: result.user,
                token: result.token,
              },
              loading: { ...state.loading, auth: false },
            }));
            
            // Iniciar sincronização após login
            get().startSync();
            
            return { success: true };
          } else {
            throw new Error('Login failed');
          }
        } catch (error) {
          console.error('[Store] Login error:', error);
          set(state => ({
            loading: { ...state.loading, auth: false },
            errors: { ...state.errors, auth: error.message }
          }));
          return { success: false, error: error.message };
        }
      },
      
      /**
       * Fazer logout
       */
      logout: async () => {
        try {
          await ApiService.logout();
          
          set({
            auth: {
              isAuthenticated: false,
              user: null,
              token: null,
            },
            syncStatus: {
              isOnline: true,
              lastSync: null,
              pendingOperations: 0,
              syncInProgress: false,
              localPendingChanges: 0,
              conflictsCount: 0,
            },
          });
          
          // Parar sincronização
          SyncService.stopAutoSync();
          
          console.log('[Store] Logout successful');
        } catch (error) {
          console.error('[Store] Logout error:', error);
        }
      },
      
      // ==========================================
      // AÇÕES DE SINCRONIZAÇÃO
      // ==========================================
      
      /**
       * Iniciar sincronização automática
       */
      startSync: async () => {
        try {
          // Atualizar status de sincronização
          await get().updateSyncStatus();
          
          // Executar sincronização inicial
          await get().performSync();
          
          console.log('[Store] Sync started');
        } catch (error) {
          console.error('[Store] Error starting sync:', error);
        }
      },
      
      /**
       * Executar sincronização
       */
      performSync: async () => {
        if (get().syncStatus.syncInProgress) {
          console.log('[Store] Sync already in progress');
          return;
        }
        
        try {
          set(state => ({
            syncStatus: { ...state.syncStatus, syncInProgress: true }
          }));
          
          const result = await SyncService.performIncrementalSync();
          
          if (result.success) {
            // Recarregar dados locais após sincronização
            await get().loadLocalData();
          }
          
          // Atualizar status de sincronização
          await get().updateSyncStatus();
          
        } catch (error) {
          console.error('[Store] Sync error:', error);
          set(state => ({
            errors: { ...state.errors, sync: error.message }
          }));
        } finally {
          set(state => ({
            syncStatus: { ...state.syncStatus, syncInProgress: false }
          }));
        }
      },
      
      /**
       * Forçar sincronização completa
       */
      forceSync: async () => {
        try {
          set(state => ({
            syncStatus: { ...state.syncStatus, syncInProgress: true }
          }));
          
          const result = await SyncService.forcSync();
          
          if (result.success) {
            await get().loadLocalData();
          }
          
          await get().updateSyncStatus();
          
          return result;
        } catch (error) {
          console.error('[Store] Force sync error:', error);
          return { success: false, error: error.message };
        } finally {
          set(state => ({
            syncStatus: { ...state.syncStatus, syncInProgress: false }
          }));
        }
      },
      
      /**
       * Atualizar status de sincronização
       */
      updateSyncStatus: async () => {
        try {
          const status = await SyncService.getSyncStatus();
          set(state => ({
            syncStatus: { ...state.syncStatus, ...status }
          }));
        } catch (error) {
          console.error('[Store] Error updating sync status:', error);
        }
      },
      
      // ==========================================
      // AÇÕES DE CATEGORIAS
      // ==========================================
      
      /**
       * Carregar categorias
       */
      loadCategories: async () => {
        try {
          set(state => ({ loading: { ...state.loading, categories: true } }));
          
          const categories = await fetchData('SELECT * FROM categories WHERE is_deleted = 0 ORDER BY name');
          
          set(state => ({
            categories,
            loading: { ...state.loading, categories: false }
          }));
        } catch (error) {
          console.error('[Store] Error loading categories:', error);
          set(state => ({
            loading: { ...state.loading, categories: false },
            errors: { ...state.errors, categories: error.message }
          }));
        }
      },
      
      /**
       * Adicionar categoria
       */
      addCategory: async (categoryData) => {
        try {
          set(state => ({
            loading: { ...state.loading, categories: true }
          }));
          
          // 1. Inserir no banco local
          const result = await executeQuery(
            'INSERT INTO categories (name, type, color, icon, needs_sync, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
            [
              categoryData.name,
              categoryData.type,
              categoryData.color,
              categoryData.icon,
              new Date().toISOString(),
              new Date().toISOString(),
            ]
          );
          
          // 2. Atualizar estado local (optimistic update)
          const newCategory = {
            id: result.insertId,
            ...categoryData,
            needs_sync: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          set(state => ({
            categories: [...state.categories, newCategory],
            loading: { ...state.loading, categories: false },
          }));
          
          // 3. Tentar sincronizar se online
          if (get().auth.isAuthenticated) {
            get().performSync();
          }
          
          return { success: true, data: newCategory };
        } catch (error) {
          console.error('[Store] Error adding category:', error);
          set(state => ({
            loading: { ...state.loading, categories: false },
            errors: { ...state.errors, categories: error.message }
          }));
          return { success: false, error: error.message };
        }
      },
      
      /**
       * Atualizar categoria
       */
      updateCategory: async (id, categoryData) => {
        try {
          set(state => ({
            loading: { ...state.loading, categories: true }
          }));
          
          // 1. Atualizar no banco local
          await executeQuery(
            'UPDATE categories SET name = ?, type = ?, color = ?, icon = ?, needs_sync = 1, updated_at = ? WHERE id = ?',
            [
              categoryData.name,
              categoryData.type,
              categoryData.color,
              categoryData.icon,
              new Date().toISOString(),
              id,
            ]
          );
          
          // 2. Atualizar estado local
          set(state => ({
            categories: state.categories.map(cat =>
              cat.id === id
                ? { ...cat, ...categoryData, needs_sync: 1, updated_at: new Date().toISOString() }
                : cat
            ),
            loading: { ...state.loading, categories: false },
          }));
          
          // 3. Tentar sincronizar se online
          if (get().auth.isAuthenticated) {
            get().performSync();
          }
          
          return { success: true };
        } catch (error) {
          console.error('[Store] Error updating category:', error);
          set(state => ({
            loading: { ...state.loading, categories: false },
            errors: { ...state.errors, categories: error.message }
          }));
          return { success: false, error: error.message };
        }
      },
      
      /**
       * Deletar categoria
       */
      deleteCategory: async (id) => {
        try {
          // 1. Soft delete no banco local
          await executeQuery(
            'UPDATE categories SET is_deleted = 1, needs_sync = 1, updated_at = ? WHERE id = ?',
            [new Date().toISOString(), id]
          );
          
          // 2. Remover do estado local
          set(state => ({
            categories: state.categories.filter(cat => cat.id !== id)
          }));
          
          // 3. Tentar sincronizar se online
          if (get().auth.isAuthenticated) {
            get().performSync();
          }
          
          return { success: true };
        } catch (error) {
          console.error('[Store] Error deleting category:', error);
          return { success: false, error: error.message };
        }
      },
      
      // ==========================================
      // AÇÕES DE TRANSAÇÕES
      // ==========================================
      
      /**
       * Carregar transações
       */
      loadTransactions: async () => {
        try {
          set(state => ({ loading: { ...state.loading, transactions: true } }));
          
          const transactions = await fetchData(`
            SELECT t.*, c.name as category_name, c.color as category_color,
                   cc.name as credit_card_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN credit_cards cc ON t.credit_card_id = cc.id
            WHERE t.is_deleted = 0
            ORDER BY t.transaction_date DESC
          `);
          
          set(state => ({
            transactions,
            loading: { ...state.loading, transactions: false }
          }));
        } catch (error) {
          console.error('[Store] Error loading transactions:', error);
          set(state => ({
            loading: { ...state.loading, transactions: false },
            errors: { ...state.errors, transactions: error.message }
          }));
        }
      },
      
      /**
       * Adicionar transação
       */
      addTransaction: async (transactionData) => {
        try {
          set(state => ({
            loading: { ...state.loading, transactions: true }
          }));
          
          const result = await executeQuery(
            `INSERT INTO transactions 
             (description, amount, type, category_id, credit_card_id, transaction_date, needs_sync, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [
              transactionData.description,
              transactionData.amount,
              transactionData.type,
              transactionData.category_id,
              transactionData.credit_card_id,
              transactionData.transaction_date,
              new Date().toISOString(),
              new Date().toISOString(),
            ]
          );
          
          // Recarregar transações para obter dados completos com JOINs
          await get().loadTransactions();
          
          set(state => ({
            loading: { ...state.loading, transactions: false }
          }));
          
          if (get().auth.isAuthenticated) {
            get().performSync();
          }
          
          return { success: true, data: { id: result.insertId, ...transactionData } };
        } catch (error) {
          console.error('[Store] Error adding transaction:', error);
          set(state => ({
            loading: { ...state.loading, transactions: false },
            errors: { ...state.errors, transactions: error.message }
          }));
          return { success: false, error: error.message };
        }
      },
      
      /**
       * Atualizar transação
       */
      updateTransaction: async (id, transactionData) => {
        try {
          await executeQuery(
            `UPDATE transactions SET 
             description = ?, amount = ?, type = ?, category_id = ?, credit_card_id = ?, 
             transaction_date = ?, needs_sync = 1, updated_at = ? 
             WHERE id = ?`,
            [
              transactionData.description,
              transactionData.amount,
              transactionData.type,
              transactionData.category_id,
              transactionData.credit_card_id,
              transactionData.transaction_date,
              new Date().toISOString(),
              id,
            ]
          );
          
          // Recarregar transações
          await get().loadTransactions();
          
          if (get().auth.isAuthenticated) {
            get().performSync();
          }
          
          return { success: true };
        } catch (error) {
          console.error('[Store] Error updating transaction:', error);
          return { success: false, error: error.message };
        }
      },
      
      /**
       * Deletar transação
       */
      deleteTransaction: async (id) => {
        try {
          await executeQuery(
            'UPDATE transactions SET is_deleted = 1, needs_sync = 1, updated_at = ? WHERE id = ?',
            [new Date().toISOString(), id]
          );
          
          set(state => ({
            transactions: state.transactions.filter(trans => trans.id !== id)
          }));
          
          if (get().auth.isAuthenticated) {
            get().performSync();
          }
          
          return { success: true };
        } catch (error) {
          console.error('[Store] Error deleting transaction:', error);
          return { success: false, error: error.message };
        }
      },
      
      // ==========================================
      // AÇÕES DE CARTÕES DE CRÉDITO
      // ==========================================
      
      /**
       * Carregar cartões de crédito
       */
      loadCreditCards: async () => {
        try {
          set(state => ({ loading: { ...state.loading, creditCards: true } }));
          
          const creditCards = await fetchData('SELECT * FROM credit_cards WHERE is_deleted = 0 ORDER BY name');
          
          set(state => ({
            creditCards,
            loading: { ...state.loading, creditCards: false }
          }));
        } catch (error) {
          console.error('[Store] Error loading credit cards:', error);
          set(state => ({
            loading: { ...state.loading, creditCards: false },
            errors: { ...state.errors, creditCards: error.message }
          }));
        }
      },
      
      /**
       * Adicionar cartão de crédito
       */
      addCreditCard: async (cardData) => {
        try {
          const result = await executeQuery(
            'INSERT INTO credit_cards (name, limit_amount, closing_day, due_day, needs_sync, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
            [
              cardData.name,
              cardData.limit_amount,
              cardData.closing_day,
              cardData.due_day,
              new Date().toISOString(),
              new Date().toISOString(),
            ]
          );
          
          const newCard = {
            id: result.insertId,
            ...cardData,
            needs_sync: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          set(state => ({
            creditCards: [...state.creditCards, newCard]
          }));
          
          if (get().auth.isAuthenticated) {
            get().performSync();
          }
          
          return { success: true, data: newCard };
        } catch (error) {
          console.error('[Store] Error adding credit card:', error);
          return { success: false, error: error.message };
        }
      },
      
      /**
       * Atualizar cartão de crédito
       */
      updateCreditCard: async (id, cardData) => {
        try {
          await executeQuery(
            'UPDATE credit_cards SET name = ?, limit_amount = ?, closing_day = ?, due_day = ?, needs_sync = 1, updated_at = ? WHERE id = ?',
            [
              cardData.name,
              cardData.limit_amount,
              cardData.closing_day,
              cardData.due_day,
              new Date().toISOString(),
              id,
            ]
          );
          
          set(state => ({
            creditCards: state.creditCards.map(card =>
              card.id === id
                ? { ...card, ...cardData, needs_sync: 1, updated_at: new Date().toISOString() }
                : card
            )
          }));
          
          if (get().auth.isAuthenticated) {
            get().performSync();
          }
          
          return { success: true };
        } catch (error) {
          console.error('[Store] Error updating credit card:', error);
          return { success: false, error: error.message };
        }
      },
      
      /**
       * Deletar cartão de crédito
       */
      deleteCreditCard: async (id) => {
        try {
          await executeQuery(
            'UPDATE credit_cards SET is_deleted = 1, needs_sync = 1, updated_at = ? WHERE id = ?',
            [new Date().toISOString(), id]
          );
          
          set(state => ({
            creditCards: state.creditCards.filter(card => card.id !== id)
          }));
          
          if (get().auth.isAuthenticated) {
            get().performSync();
          }
          
          return { success: true };
        } catch (error) {
          console.error('[Store] Error deleting credit card:', error);
          return { success: false, error: error.message };
        }
      },
      
      // ==========================================
      // AÇÕES DE METAS FINANCEIRAS
      // ==========================================
      
      /**
       * Carregar metas financeiras
       */
      loadFinancialGoals: async () => {
        try {
          set(state => ({ loading: { ...state.loading, financialGoals: true } }));
          
          const financialGoals = await fetchData(`
            SELECT fg.*, c.name as category_name, c.color as category_color
            FROM financial_goals fg
            LEFT JOIN categories c ON fg.category_id = c.id
            WHERE fg.is_deleted = 0
            ORDER BY fg.target_date
          `);
          
          set(state => ({
            financialGoals,
            loading: { ...state.loading, financialGoals: false }
          }));
        } catch (error) {
          console.error('[Store] Error loading financial goals:', error);
          set(state => ({
            loading: { ...state.loading, financialGoals: false },
            errors: { ...state.errors, financialGoals: error.message }
          }));
        }
      },
      
      /**
       * Adicionar meta financeira
       */
      addFinancialGoal: async (goalData) => {
        try {
          const result = await executeQuery(
            'INSERT INTO financial_goals (name, target_amount, current_amount, category_id, target_date, needs_sync, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
            [
              goalData.name,
              goalData.target_amount,
              goalData.current_amount || 0,
              goalData.category_id,
              goalData.target_date,
              new Date().toISOString(),
              new Date().toISOString(),
            ]
          );
          
          // Recarregar metas para obter dados completos com JOINs
          await get().loadFinancialGoals();
          
          if (get().auth.isAuthenticated) {
            get().performSync();
          }
          
          return { success: true, data: { id: result.insertId, ...goalData } };
        } catch (error) {
          console.error('[Store] Error adding financial goal:', error);
          return { success: false, error: error.message };
        }
      },
      
      /**
       * Atualizar meta financeira
       */
      updateFinancialGoal: async (id, goalData) => {
        try {
          await executeQuery(
            'UPDATE financial_goals SET name = ?, target_amount = ?, current_amount = ?, category_id = ?, target_date = ?, needs_sync = 1, updated_at = ? WHERE id = ?',
            [
              goalData.name,
              goalData.target_amount,
              goalData.current_amount,
              goalData.category_id,
              goalData.target_date,
              new Date().toISOString(),
              id,
            ]
          );
          
          // Recarregar metas
          await get().loadFinancialGoals();
          
          if (get().auth.isAuthenticated) {
            get().performSync();
          }
          
          return { success: true };
        } catch (error) {
          console.error('[Store] Error updating financial goal:', error);
          return { success: false, error: error.message };
        }
      },
      
      /**
       * Deletar meta financeira
       */
      deleteFinancialGoal: async (id) => {
        try {
          await executeQuery(
            'UPDATE financial_goals SET is_deleted = 1, needs_sync = 1, updated_at = ? WHERE id = ?',
            [new Date().toISOString(), id]
          );
          
          set(state => ({
            financialGoals: state.financialGoals.filter(goal => goal.id !== id)
          }));
          
          if (get().auth.isAuthenticated) {
            get().performSync();
          }
          
          return { success: true };
        } catch (error) {
          console.error('[Store] Error deleting financial goal:', error);
          return { success: false, error: error.message };
        }
      },
      
      // ==========================================
      // AÇÕES UTILITÁRIAS
      // ==========================================
      
      /**
       * Limpar erros
       */
      clearErrors: () => {
        set({ errors: {} });
      },
      
      /**
       * Limpar erro específico
       */
      clearError: (errorKey) => {
        set(state => {
          const newErrors = { ...state.errors };
          delete newErrors[errorKey];
          return { errors: newErrors };
        });
      },
      
      /**
       * Obter estatísticas financeiras
       */
      getFinancialStats: () => {
        const { transactions } = get();
        
        const totalIncome = transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
          
        const totalExpenses = transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
          
        const balance = totalIncome - totalExpenses;
        
        return {
          totalIncome,
          totalExpenses,
          balance,
          savingsRate: totalIncome > 0 ? ((balance / totalIncome) * 100) : 0,
        };
      },
      
    }),
    {
      name: 'smart-finance-store', // Nome para DevTools
    }
  )
);

export default useStore;

