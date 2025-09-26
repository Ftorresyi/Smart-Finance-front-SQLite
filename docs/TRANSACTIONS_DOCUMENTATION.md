# Sistema de Transações - Documentação Detalhada

## Visão Geral

O sistema de transações é o núcleo do Smart Finance, responsável por registrar todas as movimentações financeiras do usuário. Cada transação representa uma entrada (receita) ou saída (despesa) de dinheiro, com informações detalhadas para análise posterior.

## Arquivos Relacionados

### 1. `src/screens/TransactionsScreen.js`
**Função**: Lista todas as transações do usuário

**Funcionalidades principais:**
- Exibe transações ordenadas por data (mais recentes primeiro)
- Mostra informações completas: descrição, valor, categoria, cartão (se aplicável)
- Permite navegação para adicionar nova transação
- Permite excluir transação (toque longo)
- Atualização via pull-to-refresh

### 2. `src/screens/AddTransactionScreen.js`
**Função**: Formulário para criar ou editar transações

**Funcionalidades principais:**
- Formulário adaptativo (receita/despesa)
- Validação completa de dados
- Seleção de categoria filtrada por tipo
- Seleção opcional de cartão de crédito (só despesas)
- Seletor de data com validações
- Preview em tempo real da transação

## Conceitos Fundamentais

### 1. Tipos de Transação

**Receitas (Income)**
- Representam dinheiro que entra
- Exemplos: salário, vendas, investimentos
- Cor padrão: Verde (#4CAF50)
- Não podem usar cartão de crédito

**Despesas (Expense)**
- Representam dinheiro que sai
- Exemplos: compras, contas, lazer
- Cor padrão: Vermelho (#F44336)
- Podem usar cartão de crédito

### 2. Relacionamentos no Banco

```sql
-- Relacionamento obrigatório com categoria
category_id INTEGER NOT NULL,
FOREIGN KEY (category_id) REFERENCES categories (id)

-- Relacionamento opcional com cartão de crédito
credit_card_id INTEGER NULL,
FOREIGN KEY (credit_card_id) REFERENCES credit_cards (id)
```

### 3. Validações Implementadas

#### Validação de Descrição
```javascript
if (!description.trim()) {
  newErrors.description = 'Descrição é obrigatória';
} else if (description.trim().length < 3) {
  newErrors.description = 'Descrição deve ter pelo menos 3 caracteres';
}
```

#### Validação de Valor
```javascript
const numericAmount = parseFloat(amount);
if (!amount || isNaN(numericAmount)) {
  newErrors.amount = 'Valor é obrigatório e deve ser um número';
} else if (numericAmount <= 0) {
  newErrors.amount = 'Valor deve ser maior que zero';
}
```

#### Validação de Categoria
```javascript
if (!categoryId) {
  newErrors.categoryId = 'Categoria é obrigatória';
} else {
  const category = getSelectedCategory();
  if (category.type !== type) {
    newErrors.categoryId = 'Categoria não compatível com o tipo de transação';
  }
}
```

## Estrutura do Banco de Dados

```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,             -- Descrição da transação
  amount REAL NOT NULL,                  -- Valor (sempre positivo)
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')), -- Tipo
  category_id INTEGER NOT NULL,          -- Categoria obrigatória
  credit_card_id INTEGER NULL,           -- Cartão opcional
  transaction_date DATE NOT NULL,        -- Data da transação
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories (id),
  FOREIGN KEY (credit_card_id) REFERENCES credit_cards (id)
);
```

## Fluxo de Dados Detalhado

### 1. Carregamento de Transações
```
TransactionsScreen → useStore.loadTransactions() → database.fetchData() → SQLite
```

**Query executada:**
```sql
SELECT t.*, c.name as category_name, c.color as category_color,
       cc.name as credit_card_name
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN credit_cards cc ON t.credit_card_id = cc.id
ORDER BY t.transaction_date DESC
```

### 2. Criação de Transação
```
AddTransactionScreen → Validação → useStore.addTransaction() → database.executeQuery() → SQLite
```

### 3. Atualização de Transação
```
AddTransactionScreen → Validação → useStore.updateTransaction() → database.executeQuery() → SQLite
```

## Componentes de UI Especializados

### 1. TypeSelector
**Função**: Permite alternar entre receita e despesa

```javascript
const TypeSelector = () => (
  <View style={styles.typeContainer}>
    <TouchableOpacity onPress={() => setType('income')}>
      {/* Botão de receita */}
    </TouchableOpacity>
    <TouchableOpacity onPress={() => setType('expense')}>
      {/* Botão de despesa */}
    </TouchableOpacity>
  </View>
);
```

**Comportamento especial:**
- Ao mudar tipo, limpa categoria selecionada
- Ao mudar para receita, limpa cartão de crédito

### 2. CategoryModal
**Função**: Modal para seleção de categoria

```javascript
const getFilteredCategories = () => {
  return categories.filter(category => category.type === type);
};
```

**Características:**
- Filtra categorias por tipo de transação
- Mostra cor e nome da categoria
- Permite criar nova categoria se lista vazia

### 3. CreditCardModal
**Função**: Modal para seleção de cartão (só despesas)

**Características:**
- Só aparece para despesas
- Inclui opção "Nenhum cartão" (dinheiro/débito)
- Permite cadastrar novo cartão se lista vazia

## Formatação e Apresentação

### Formatação Monetária
```javascript
const formatCurrency = (value) => {
  const numericValue = parseFloat(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numericValue);
};
```

### Formatação de Data
```javascript
const formatDate = (date) => {
  return date.toLocaleDateString('pt-BR');
};
```

### Preview em Tempo Real
O componente mostra preview da transação conforme o usuário digita:
- Valor formatado em moeda brasileira
- Cor baseada no tipo (verde/vermelho)
- Ícone correspondente ao tipo

## Integração com Cartões de Crédito

### Lógica de Negócio
- Cartões só podem ser usados em despesas
- Campo opcional (null no banco se não selecionado)
- Informação exibida na lista de transações

### Considerações Futuras
- Data de vencimento da fatura
- Cálculo de juros
- Parcelamento de compras

## Estados de Loading e Erro

### Loading States
```javascript
const [isSubmitting, setIsSubmitting] = useState(false);

// Durante salvamento
setIsSubmitting(true);
await addTransaction(transactionData);
setIsSubmitting(false);
```

### Error Handling
```javascript
try {
  await addTransaction(transactionData);
  Alert.alert('Sucesso', 'Transação registrada com sucesso!');
} catch (error) {
  Alert.alert('Erro', error.message || 'Erro ao salvar transação');
}
```

## Navegação e Parâmetros

### Navegação para Formulário
```javascript
// Da tela inicial (com tipo pré-definido)
navigation.navigate('Transactions', {
  screen: 'AddTransaction',
  params: { type: 'income' }
});

// Para edição (com transação existente)
navigation.navigate('AddTransaction', { 
  transaction: selectedTransaction 
});
```

### Detecção de Modo
```javascript
const { transaction, type: initialType } = route.params || {};
const isEditing = !!transaction;
```

## Boas Práticas Implementadas

1. **Validação Robusta**
   - Frontend para UX imediata
   - Backend para integridade de dados

2. **Feedback Visual**
   - Preview em tempo real
   - Estados de loading
   - Mensagens de erro específicas

3. **Usabilidade**
   - Formulário adaptativo por tipo
   - Seleção visual de opções
   - Navegação intuitiva

4. **Performance**
   - Carregamento assíncrono
   - Filtragem eficiente
   - Atualizações otimizadas

## Possíveis Melhorias Futuras

1. **Funcionalidades Avançadas**
   - Transações recorrentes
   - Parcelamento de compras
   - Anexos (fotos de notas fiscais)

2. **Análises**
   - Padrões de gastos
   - Alertas de orçamento
   - Comparações mensais

3. **Sincronização**
   - Backup na nuvem
   - Sincronização entre dispositivos
   - Importação de extratos bancários

