# Arquitetura de Sincronização e Autenticação - Documentação

## Visão Geral

Para transformar o Smart Finance em uma plataforma robusta e sempre disponível, o sistema foi re-arquitetado para um modelo **Híbrido Offline-First**. Isso significa que o aplicativo funciona perfeitamente com ou sem conexão à internet, sincronizando os dados com o servidor em segundo plano sempre que possível.

Esta documentação detalha a arquitetura de sincronização, o fluxo de autenticação e as mudanças estruturais no banco de dados local.

## Arquivos Relacionados

### 1. `src/store/useStore.js`
**Função**: O "cérebro" da aplicação. Orquestra o estado, as interações do usuário e a comunicação entre a UI, o banco de dados local e os serviços de API e Sincronização.

### 2. `src/database/database.js`
**Função**: A camada de acesso ao banco de dados local (SQLite). Foi atualizada para suportar a lógica de sincronização.

### 3. `src/services/ApiService.js`
**Função**: Centraliza toda a comunicação direta com a API backend. Lida com as requisições HTTP (login, etc.) e o gerenciamento do token de autenticação.

### 4. `src/services/SyncService.js`
**Função**: Contém a lógica complexa do processo de sincronização. É responsável por enviar dados locais pendentes e buscar dados atualizados do servidor.

## Conceitos Fundamentais

### 1. Offline-First
O aplicativo sempre lê e escreve no banco de dados local (SQLite) primeiro. Isso garante que a interface seja extremamente rápida e funcional, independentemente da qualidade da conexão com a internet.

### 2. Sincronização em Segundo Plano (Background Sync)
Quando uma conexão está disponível, o `SyncService` é ativado para reconciliar os dados entre o dispositivo local e o servidor. O usuário não precisa iniciar esse processo manualmente.

### 3. UI Otimista (Optimistic UI)
Quando o usuário cria ou edita um dado, a mudança é refletida na interface **imediatamente**, pois é salva primeiro no banco local. A sincronização com o servidor acontece depois, em segundo plano. Em caso de falha na sincronização, o sistema está preparado para lidar com o erro.

### 4. Soft Deletes
Registros não são permanentemente deletados do banco local. Em vez disso, eles são marcados com `is_deleted = 1`. Isso é crucial para que o `SyncService` possa informar ao servidor que aquele item também deve ser excluído lá.

## Estrutura do Banco de Dados (Atualizada)

Para suportar a sincronização, as tabelas principais foram atualizadas com as seguintes colunas:

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- ID local
  server_id INTEGER NULL UNIQUE,        -- ID do registro no servidor (NULL se ainda não sincronizado)
  name TEXT NOT NULL,
  -- ... outras colunas
  needs_sync INTEGER DEFAULT 0,         -- Flag (0 ou 1) que indica se o registro precisa ser enviado ao servidor
  is_deleted INTEGER DEFAULT 0,         -- Flag para soft delete
  last_synced_at DATETIME NULL,         -- Timestamp da última sincronização bem-sucedida
  created_at DATETIME,
  updated_at DATETIME
);
```
*   **`server_id`**: Armazena o ID correspondente do registro no banco de dados do servidor. É a "ponte" entre o dado local e o remoto.
*   **`needs_sync`**: Uma flag (booleano) que o `useStore` ativa (`1`) sempre que um registro é criado ou modificado localmente. O `SyncService` usa essa coluna para encontrar quais itens precisam ser enviados ao servidor.
*   **`is_deleted`**: Para implementar "soft deletes".

### Novas Tabelas de Suporte

*   **`app_settings`**: Guarda configurações gerais do aplicativo, como flags de primeiro uso e preferências de sincronização.
*   **`sync_log`**: Tabela para registrar o histórico de operações de sincronização, útil para depuração e análise de problemas.

## Fluxo de Autenticação

1.  **Primeiro Acesso**: O usuário abre o app, que funciona em modo offline. Ele pode interagir com os dados padrão, mas nada é sincronizado.
2.  **Tela de Login**: O usuário insere suas credenciais.
3.  **Chamada de Login**: A UI chama a função `login(email, password)` do `useStore`.
4.  **Requisição à API**: `useStore` utiliza o `ApiService` para fazer uma requisição `POST /auth/login` ao backend.
5.  **Resposta do Servidor**: O backend valida as credenciais e retorna um `token` de autenticação.
6.  **Armazenamento Seguro**: O `ApiService` armazena o token de forma segura no dispositivo (ex: usando `expo-secure-store`).

### Interceptor de Autenticação (A Mágica Automática)

Uma vez que o token é armazenado, o `ApiService` utiliza um **Interceptor do Axios**. Este é um pedaço de código que "intercepta" toda e qualquer requisição que o aplicativo faz para a API.

- **O que ele faz?** Antes de a requisição ser enviada, o interceptor busca o token armazenado e o anexa automaticamente ao cabeçalho da requisição (`Authorization: Bearer <token>`).
- **Por que é importante?** Isso elimina a necessidade de adicionar manualmente o token em cada chamada de API (`getCategories`, `addTransaction`, etc.). O processo se torna automático e à prova de erros, garantindo que o backend sempre saiba qual usuário está fazendo a requisição.

7.  **Início da Sincronização**: Com o login bem-sucedido, o `useStore` imediatamente chama a função `startSync()`, que ativa o `SyncService`.

## Fluxo de Sincronização (Incremental Sync)

Este é o coração da arquitetura híbrida, orquestrado pelo `SyncService`.

### **Passo 1: Enviar Mudanças Locais (Upload)**
1.  O `SyncService` busca no banco de dados local todos os registros de todas as tabelas que estão marcados com `needs_sync = 1`.
2.  Ele agrupa esses registros por tipo (categorias, transações, etc.).
3.  Envia esses grupos para um endpoint especializado no backend (ex: `POST /sync/changes`).
    *   **Registros novos** (sem `server_id`) são criados no backend.
    *   **Registros existentes** (com `server_id`) são atualizados.
    *   **Registros com `is_deleted = 1`** são excluídos no backend.
4.  O backend processa esses dados e retorna os `server_id` para os novos registros.
5.  O `SyncService` atualiza os registros locais com os `server_id` recebidos e marca `needs_sync = 0`.

### **Passo 2: Buscar Mudanças Remotas (Download)**
1.  O `SyncService` pergunta ao servidor por todas as mudanças que ocorreram desde a última sincronização bem-sucedida, enviando o timestamp de `last_synced_at`.
2.  O backend retorna uma lista de registros (novos ou atualizados) que foram modificados no servidor por outros dispositivos.
3.  O `SyncService` percorre essa lista e insere ou atualiza (operação "UPSERT") os registros no banco de dados local (SQLite), usando o `server_id` como chave de reconciliação.

### **Exemplo de um Novo Lançamento (Create)**
1.  Usuário cria uma nova categoria.
2.  `useStore.addCategory()` é chamado.
3.  A função insere a categoria no SQLite com `needs_sync = 1`.
4.  A UI é atualizada imediatamente (UI Otimista).
5.  `useStore` chama `performSync()`.
6.  O `SyncService` encontra a nova categoria e a envia para o servidor.
7.  O servidor retorna o `server_id`.
8.  O `SyncService` atualiza o registro local com o `server_id` e `needs_sync = 0`.

## Requisitos da API Backend

Para que esta arquitetura funcione, o backend precisa expor os seguintes endpoints:

*   `POST /auth/login`: Para autenticar o usuário e retornar um token.
*   `POST /auth/register`: Para registrar novos usuários.
*   `POST /sync/changes`: Um endpoint robusto que recebe um payload com as mudanças locais (criações, atualizações, deleções) e as processa.
*   `GET /sync/changes?last_sync_timestamp=...`: Endpoint que retorna todas as mudanças do servidor desde a data especificada.
*   Endpoints de CRUD tradicionais (ex: `GET /categories`, `POST /categories`) também são úteis para cenários específicos e testes.

## Possíveis Melhorias Futuras

*   **Resolução de Conflitos**: Implementar uma estratégia para quando um mesmo registro é modificado localmente e no servidor ao mesmo tempo (ex: "o mais recente vence").
*   **Push Notifications**: O servidor poderia enviar uma notificação push para os dispositivos quando um dado importante é alterado, forçando uma sincronização em tempo real.
*   **Sincronização em Lotes (Batching)**: Para performance, em vez de sincronizar item por item, enviar e receber dados em lotes (arrays).
