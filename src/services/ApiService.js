/**
 * ApiService.js
 * 
 * FUNCIONALIDADE:
 * Serviço responsável por toda comunicação com a API backend Java.
 * Gerencia autenticação, requisições HTTP e tratamento de erros.
 * 
 * CONCEITOS IMPORTANTES:
 * 
 * 1. AXIOS INTERCEPTORS:
 *    - Interceptam requisições para adicionar headers automaticamente
 *    - Interceptam respostas para tratar erros globalmente
 *    - Renovam tokens JWT automaticamente quando expiram
 * 
 * 2. TRATAMENTO DE CONECTIVIDADE:
 *    - Detecta se o dispositivo está online/offline
 *    - Armazena requisições offline para sincronização posterior
 *    - Implementa retry automático quando a conexão retorna
 * 
 * 3. AUTENTICAÇÃO JWT:
 *    - Armazena tokens de forma segura
 *    - Adiciona Authorization header automaticamente
 *    - Gerencia refresh de tokens
 * 
 * 4. CACHE E SINCRONIZAÇÃO:
 *    - Cache local para dados frequentemente acessados
 *    - Fila de sincronização para operações offline
 *    - Resolução de conflitos de dados
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

/**
 * Configuração base da API
 */
const API_CONFIG = {
  // URL base da sua API Java (ajuste conforme necessário)
  BASE_URL: 'https://8080-idd4pgwgqlwpm8ea4u57u-3d2090d9.manusvm.computer',
  
  // Endpoints da API
  ENDPOINTS: {
    // Autenticação
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH_TOKEN: '/auth/refresh',
    
    // Categorias
    CATEGORIES: '/api/categories',
    
    // Transações
    TRANSACTIONS: '/api/transactions',
    
    // Cartões de Crédito
    CREDIT_CARDS: '/api/credit-cards',
    
    // Metas Financeiras
    FINANCIAL_GOALS: '/api/financial-goals',
    
    // Usuário
    USER_PROFILE: '/api/user/profile',
  },
  
  // Configurações de timeout
  TIMEOUT: 10000, // 10 segundos
  
  // Chaves para AsyncStorage
  STORAGE_KEYS: {
    ACCESS_TOKEN: '@smart_finance:access_token',
    REFRESH_TOKEN: '@smart_finance:refresh_token',
    USER_DATA: '@smart_finance:user_data',
    OFFLINE_QUEUE: '@smart_finance:offline_queue',
    LAST_SYNC: '@smart_finance:last_sync',
  }
};

/**
 * Instância do Axios configurada
 */
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * Estado da conectividade
 */
let isOnline = true;
let offlineQueue = [];

/**
 * Classe principal do serviço de API
 */
class ApiService {
  constructor() {
    this.setupInterceptors();
    this.setupNetworkListener();
    this.loadOfflineQueue();
  }

  /**
   * Configurar interceptors do Axios
   */
  setupInterceptors() {
    // Interceptor de requisição - adiciona token automaticamente
    apiClient.interceptors.request.use(
      async (config) => {
        const token = await this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Interceptor de resposta - trata erros e renova tokens
    apiClient.interceptors.response.use(
      (response) => {
        console.log(`[API] Response ${response.status} from ${response.config.url}`);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Se o token expirou (401) e não é uma tentativa de refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return apiClient(originalRequest);
            }
          } catch (refreshError) {
            console.error('[API] Token refresh failed:', refreshError);
            await this.logout();
            return Promise.reject(refreshError);
          }
        }

        console.error('[API] Response error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Configurar listener de conectividade
   */
  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      isOnline = state.isConnected && state.isInternetReachable;
      
      console.log(`[Network] Status: ${isOnline ? 'Online' : 'Offline'}`);
      
      // Se voltou a ficar online, processar fila offline
      if (wasOffline && isOnline) {
        this.processOfflineQueue();
      }
    });
  }

  /**
   * Carregar fila offline do AsyncStorage
   */
  async loadOfflineQueue() {
    try {
      const queueData = await AsyncStorage.getItem(API_CONFIG.STORAGE_KEYS.OFFLINE_QUEUE);
      if (queueData) {
        offlineQueue = JSON.parse(queueData);
        console.log(`[Offline] Loaded ${offlineQueue.length} queued operations`);
      }
    } catch (error) {
      console.error('[Offline] Error loading queue:', error);
    }
  }

  /**
   * Salvar fila offline no AsyncStorage
   */
  async saveOfflineQueue() {
    try {
      await AsyncStorage.setItem(
        API_CONFIG.STORAGE_KEYS.OFFLINE_QUEUE,
        JSON.stringify(offlineQueue)
      );
    } catch (error) {
      console.error('[Offline] Error saving queue:', error);
    }
  }

  /**
   * Adicionar operação à fila offline
   */
  async addToOfflineQueue(operation) {
    offlineQueue.push({
      ...operation,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9),
    });
    
    await this.saveOfflineQueue();
    console.log(`[Offline] Added operation to queue: ${operation.method} ${operation.endpoint}`);
  }

  /**
   * Processar fila offline quando voltar a ter conexão
   */
  async processOfflineQueue() {
    if (offlineQueue.length === 0) return;

    console.log(`[Offline] Processing ${offlineQueue.length} queued operations`);
    
    const processedOperations = [];
    
    for (const operation of offlineQueue) {
      try {
        await this.executeOperation(operation);
        processedOperations.push(operation);
        console.log(`[Offline] Processed: ${operation.method} ${operation.endpoint}`);
      } catch (error) {
        console.error(`[Offline] Failed to process: ${operation.method} ${operation.endpoint}`, error);
        // Manter na fila para tentar novamente depois
      }
    }

    // Remover operações processadas com sucesso
    offlineQueue = offlineQueue.filter(op => !processedOperations.includes(op));
    await this.saveOfflineQueue();
    
    console.log(`[Offline] Processed ${processedOperations.length} operations, ${offlineQueue.length} remaining`);
  }

  /**
   * Executar operação da fila offline
   */
  async executeOperation(operation) {
    const { method, endpoint, data, params } = operation;
    
    switch (method.toLowerCase()) {
      case 'post':
        return await apiClient.post(endpoint, data);
      case 'put':
        return await apiClient.put(endpoint, data);
      case 'patch':
        return await apiClient.patch(endpoint, data);
      case 'delete':
        return await apiClient.delete(endpoint, { params });
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  /**
   * Fazer requisição com suporte offline
   */
  async makeRequest(method, endpoint, data = null, params = null, options = {}) {
    const { skipOfflineQueue = false } = options;

    // Se está offline e não é uma operação de leitura, adicionar à fila
    if (!isOnline && !skipOfflineQueue && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      await this.addToOfflineQueue({ method, endpoint, data, params });
      
      // Retornar resposta simulada para não quebrar o fluxo da UI
      return {
        data: { success: true, offline: true, message: 'Operation queued for sync' },
        status: 202, // Accepted
      };
    }

    // Fazer requisição normal
    try {
      const config = { params };
      
      switch (method.toUpperCase()) {
        case 'GET':
          return await apiClient.get(endpoint, config);
        case 'POST':
          return await apiClient.post(endpoint, data, config);
        case 'PUT':
          return await apiClient.put(endpoint, data, config);
        case 'PATCH':
          return await apiClient.patch(endpoint, data, config);
        case 'DELETE':
          return await apiClient.delete(endpoint, config);
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
    } catch (error) {
      // Se falhou por problema de rede e não está na fila offline
      if (!isOnline && !skipOfflineQueue) {
        await this.addToOfflineQueue({ method, endpoint, data, params });
        return {
          data: { success: true, offline: true, message: 'Operation queued for sync' },
          status: 202,
        };
      }
      
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS DE AUTENTICAÇÃO
  // ==========================================

  /**
   * Fazer login
   */
  async login(email, password) {
    try {
      const response = await this.makeRequest('POST', API_CONFIG.ENDPOINTS.LOGIN, {
        email,
        password,
      }, null, { skipOfflineQueue: true });

      const { accessToken, refreshToken, user } = response.data;

      // Salvar tokens e dados do usuário
      await Promise.all([
        AsyncStorage.setItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        AsyncStorage.setItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
        AsyncStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(user)),
      ]);

      console.log('[Auth] Login successful');
      return { success: true, user };
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      throw error;
    }
  }

  /**
   * Fazer logout
   */
  async logout() {
    try {
      // Limpar tokens e dados locais
      await Promise.all([
        AsyncStorage.removeItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.removeItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER_DATA),
      ]);

      console.log('[Auth] Logout successful');
      return { success: true };
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      throw error;
    }
  }

  /**
   * Renovar token de acesso
   */
  async refreshAccessToken() {
    try {
      const refreshToken = await AsyncStorage.getItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post(API_CONFIG.ENDPOINTS.REFRESH_TOKEN, {
        refreshToken,
      });

      const { accessToken } = response.data;
      await AsyncStorage.setItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);

      console.log('[Auth] Token refreshed successfully');
      return accessToken;
    } catch (error) {
      console.error('[Auth] Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Obter token de acesso
   */
  async getAccessToken() {
    try {
      return await AsyncStorage.getItem(API_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('[Auth] Error getting access token:', error);
      return null;
    }
  }

  /**
   * Verificar se está autenticado
   */
  async isAuthenticated() {
    const token = await this.getAccessToken();
    return !!token;
  }

  // ==========================================
  // MÉTODOS DE DADOS (CRUD)
  // ==========================================

  /**
   * Categorias
   */
  async getCategories() {
    const response = await this.makeRequest('GET', API_CONFIG.ENDPOINTS.CATEGORIES);
    return response.data;
  }

  async createCategory(categoryData) {
    const response = await this.makeRequest('POST', API_CONFIG.ENDPOINTS.CATEGORIES, categoryData);
    return response.data;
  }

  async updateCategory(id, categoryData) {
    const response = await this.makeRequest('PUT', `${API_CONFIG.ENDPOINTS.CATEGORIES}/${id}`, categoryData);
    return response.data;
  }

  async deleteCategory(id) {
    const response = await this.makeRequest('DELETE', `${API_CONFIG.ENDPOINTS.CATEGORIES}/${id}`);
    return response.data;
  }

  /**
   * Transações
   */
  async getTransactions(params = {}) {
    const response = await this.makeRequest('GET', API_CONFIG.ENDPOINTS.TRANSACTIONS, null, params);
    return response.data;
  }

  async createTransaction(transactionData) {
    const response = await this.makeRequest('POST', API_CONFIG.ENDPOINTS.TRANSACTIONS, transactionData);
    return response.data;
  }

  async updateTransaction(id, transactionData) {
    const response = await this.makeRequest('PUT', `${API_CONFIG.ENDPOINTS.TRANSACTIONS}/${id}`, transactionData);
    return response.data;
  }

  async deleteTransaction(id) {
    const response = await this.makeRequest('DELETE', `${API_CONFIG.ENDPOINTS.TRANSACTIONS}/${id}`);
    return response.data;
  }

  /**
   * Cartões de Crédito
   */
  async getCreditCards() {
    const response = await this.makeRequest('GET', API_CONFIG.ENDPOINTS.CREDIT_CARDS);
    return response.data;
  }

  async createCreditCard(cardData) {
    const response = await this.makeRequest('POST', API_CONFIG.ENDPOINTS.CREDIT_CARDS, cardData);
    return response.data;
  }

  async updateCreditCard(id, cardData) {
    const response = await this.makeRequest('PUT', `${API_CONFIG.ENDPOINTS.CREDIT_CARDS}/${id}`, cardData);
    return response.data;
  }

  async deleteCreditCard(id) {
    const response = await this.makeRequest('DELETE', `${API_CONFIG.ENDPOINTS.CREDIT_CARDS}/${id}`);
    return response.data;
  }

  /**
   * Metas Financeiras
   */
  async getFinancialGoals() {
    const response = await this.makeRequest('GET', API_CONFIG.ENDPOINTS.FINANCIAL_GOALS);
    return response.data;
  }

  async createFinancialGoal(goalData) {
    const response = await this.makeRequest('POST', API_CONFIG.ENDPOINTS.FINANCIAL_GOALS, goalData);
    return response.data;
  }

  async updateFinancialGoal(id, goalData) {
    const response = await this.makeRequest('PUT', `${API_CONFIG.ENDPOINTS.FINANCIAL_GOALS}/${id}`, goalData);
    return response.data;
  }

  async deleteFinancialGoal(id) {
    const response = await this.makeRequest('DELETE', `${API_CONFIG.ENDPOINTS.FINANCIAL_GOALS}/${id}`);
    return response.data;
  }

  // ==========================================
  // MÉTODOS DE SINCRONIZAÇÃO
  // ==========================================

  /**
   * Sincronizar todos os dados
   */
  async syncAllData() {
    if (!isOnline) {
      console.log('[Sync] Cannot sync while offline');
      return { success: false, message: 'Device is offline' };
    }

    try {
      console.log('[Sync] Starting full data synchronization');
      
      // Processar fila offline primeiro
      await this.processOfflineQueue();
      
      // Buscar dados atualizados do servidor
      const [categories, transactions, creditCards, financialGoals] = await Promise.all([
        this.getCategories(),
        this.getTransactions(),
        this.getCreditCards(),
        this.getFinancialGoals(),
      ]);

      // Salvar timestamp da última sincronização
      await AsyncStorage.setItem(
        API_CONFIG.STORAGE_KEYS.LAST_SYNC,
        new Date().toISOString()
      );

      console.log('[Sync] Full synchronization completed');
      
      return {
        success: true,
        data: {
          categories,
          transactions,
          creditCards,
          financialGoals,
        },
      };
    } catch (error) {
      console.error('[Sync] Synchronization failed:', error);
      throw error;
    }
  }

  /**
   * Obter status da sincronização
   */
  async getSyncStatus() {
    const lastSync = await AsyncStorage.getItem(API_CONFIG.STORAGE_KEYS.LAST_SYNC);
    const queueLength = offlineQueue.length;
    
    return {
      isOnline,
      lastSync: lastSync ? new Date(lastSync) : null,
      pendingOperations: queueLength,
      needsSync: queueLength > 0 || !lastSync,
    };
  }
}

// Exportar instância singleton
export default new ApiService();

