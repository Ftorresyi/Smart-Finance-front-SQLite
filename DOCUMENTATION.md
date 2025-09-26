# Smart Finance - Documentação Completa

## Visão Geral do Projeto

O **Smart Finance** é um aplicativo React Native para controle financeiro pessoal que permite aos usuários gerenciar receitas, despesas, categorias, cartões de crédito e metas financeiras. O projeto utiliza tecnologias modernas e práticas recomendadas para desenvolvimento mobile.

## Tecnologias Utilizadas

### Core Technologies
- **React Native com Expo**: Framework para desenvolvimento mobile multiplataforma
- **Zustand**: Biblioteca leve para gerenciamento de estado global
- **SQLite (expo-sqlite)**: Banco de dados local para persistência de dados
- **React Navigation**: Sistema de navegação entre telas

### Bibliotecas de UI e Funcionalidades
- **React Native Paper**: Componentes de UI seguindo Material Design
- **React Native Chart Kit**: Biblioteca para criação de gráficos
- **React Native Vector Icons**: Ícones para interface
- **React Native Date Picker**: Seletor de datas

## Estrutura do Projeto

```
smart-finance/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   └── Navigation.js    # Sistema de navegação principal
│   ├── screens/            # Telas do aplicativo
│   │   ├── HomeScreen.js           # Tela inicial
│   │   ├── TransactionsScreen.js   # Lista de transações
│   │   ├── CategoriesScreen.js     # Gerenciamento de categorias
│   │   ├── CreditCardsScreen.js    # Gerenciamento de cartões
│   │   ├── GoalsScreen.js          # Metas financeiras
│   │   └── AnalyticsScreen.js      # Análises e gráficos
│   ├── store/              # Gerenciamento de estado
│   │   └── useStore.js     # Store principal com Zustand
│   ├── database/           # Configuração do banco de dados
│   │   └── database.js     # Configuração SQLite
│   ├── utils/              # Funções utilitárias
│   └── services/           # Serviços e APIs
├── App.js                  # Componente raiz
└── package.json           # Dependências do projeto
```

## Arquitetura do Aplicativo

### 1. Gerenciamento de Estado (Zustand)

O Zustand foi escolhido por sua simplicidade e performance. Ele centraliza o estado da aplicação em uma única store, facilitando o compartilhamento de dados entre componentes.

**Vantagens do Zustand:**
- Menos boilerplate que Redux
- API baseada em hooks
- Performance otimizada
- Fácil de aprender e usar

### 2. Persistência de Dados (SQLite)

O SQLite foi escolhido para armazenamento local por oferecer:
- Consultas SQL familiares
- Relacionamentos entre tabelas
- Performance para grandes volumes de dados
- Funcionalidade offline completa

### 3. Navegação (React Navigation)

Utiliza uma combinação de:
- **Bottom Tab Navigator**: Navegação principal entre seções
- **Stack Navigator**: Navegação hierárquica dentro de cada seção

## Banco de Dados - Estrutura das Tabelas

### Tabela: categories
```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- Nome da categoria
  type TEXT NOT NULL,                    -- 'income' ou 'expense'
  color TEXT DEFAULT '#007AFF',          -- Cor para identificação visual
  icon TEXT DEFAULT 'folder',            -- Ícone da categoria
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: credit_cards
```sql
CREATE TABLE credit_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- Nome do cartão
  limit_amount REAL DEFAULT 0,           -- Limite do cartão
  closing_day INTEGER NOT NULL,          -- Dia do fechamento da fatura
  due_day INTEGER NOT NULL,              -- Dia do vencimento
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: transactions
```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,             -- Descrição da transação
  amount REAL NOT NULL,                  -- Valor da transação
  type TEXT NOT NULL,                    -- 'income' ou 'expense'
  category_id INTEGER NOT NULL,          -- Referência à categoria
  credit_card_id INTEGER NULL,           -- Referência ao cartão (opcional)
  transaction_date DATE NOT NULL,        -- Data da transação
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories (id),
  FOREIGN KEY (credit_card_id) REFERENCES credit_cards (id)
);
```

### Tabela: financial_goals
```sql
CREATE TABLE financial_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- Nome da meta
  target_amount REAL NOT NULL,           -- Valor objetivo
  current_amount REAL DEFAULT 0,         -- Valor atual
  category_id INTEGER NOT NULL,          -- Categoria relacionada
  target_date DATE NOT NULL,             -- Data limite
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories (id)
);
```

## Fluxo de Dados

1. **Inicialização**: App.js inicializa o banco de dados
2. **Navegação**: Navigation.js gerencia as rotas
3. **Estado**: useStore.js centraliza o estado global
4. **Persistência**: database.js gerencia operações SQLite
5. **UI**: Screens consomem dados do store e exibem na interface

## Próximos Passos

Agora vamos implementar as funcionalidades de categorias, incluindo:
- Formulário para adicionar/editar categorias
- Validações de entrada
- Integração com o banco de dados
- Feedback visual para o usuário

---

*Esta documentação será atualizada conforme o desenvolvimento avança.*

