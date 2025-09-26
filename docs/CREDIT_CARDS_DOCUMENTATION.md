# Sistema de Cartões de Crédito - Documentação Detalhada

## Visão Geral

O sistema de cartões de crédito permite aos usuários cadastrar e gerenciar seus cartões, incluindo informações sobre limites, datas de fechamento e vencimento. Esta funcionalidade é essencial para o controle financeiro, especialmente para rastrear gastos e gerenciar faturas.

## Arquivos Relacionados

### 1. `src/screens/CreditCardsScreen.js`
**Função**: Lista todos os cartões cadastrados pelo usuário

**Funcionalidades principais:**
- Exibe cartões com informações resumidas
- Mostra limite, dia de fechamento e vencimento
- Permite navegação para adicionar novo cartão
- Permite editar cartão existente (toque simples)
- Permite excluir cartão (toque longo)

### 2. `src/screens/AddCreditCardScreen.js`
**Função**: Formulário para cadastrar ou editar cartões

**Funcionalidades principais:**
- Formulário com validação completa
- Preview visual do cartão em tempo real
- Formatação automática de valores monetários
- Validação de datas de fechamento e vencimento
- Exemplo do próximo ciclo do cartão
- Dicas educativas sobre cartões de crédito

## Conceitos Fundamentais

### 1. Anatomia de um Cartão de Crédito

**Nome do Cartão**
- Identificação única do cartão
- Exemplos: "Nubank", "Itaú Mastercard", "C6 Bank Visa"
- Usado para diferenciação nas transações

**Limite do Cartão**
- Valor máximo disponível para gastos
- Formatado em moeda brasileira (R$)
- Usado para controle de gastos

**Dia de Fechamento**
- Data em que a fatura do mês é "fechada"
- Compras após esta data vão para a próxima fatura
- Geralmente entre os dias 1 e 31 do mês

**Dia de Vencimento**
- Data limite para pagamento da fatura
- Sempre alguns dias após o fechamento
- Evita juros e multas se pago até esta data

### 2. Lógica de Ciclo do Cartão

```javascript
// Exemplo de cálculo de próximas datas
const calculateNextCycle = (closingDay, dueDay) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Data de fechamento
  let closingDate = new Date(currentYear, currentMonth, closingDay);
  if (closingDate < today) {
    closingDate = new Date(currentYear, currentMonth + 1, closingDay);
  }

  // Data de vencimento (sempre após fechamento)
  let dueDate = new Date(currentYear, currentMonth, dueDay);
  if (dueDayNum <= closingDay) {
    dueDate = new Date(currentYear, currentMonth + 1, dueDay);
  }
  
  return { closingDate, dueDate };
};
```

## Estrutura do Banco de Dados

```sql
CREATE TABLE credit_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- Nome único do cartão
  limit_amount REAL DEFAULT 0,           -- Limite em reais
  closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Constraints Importantes
- `closing_day` e `due_day` devem estar entre 1 e 31
- `name` deve ser único por usuário (validado no frontend)
- `limit_amount` deve ser positivo

## Validações Implementadas

### 1. Validação de Nome
```javascript
// Verificar se nome já existe
const existingCard = creditCards.find(card => 
  card.name.toLowerCase() === name.trim().toLowerCase() && 
  (!isEditing || card.id !== creditCard.id)
);
if (existingCard) {
  newErrors.name = 'Já existe um cartão com este nome';
}
```

### 2. Validação de Limite
```javascript
const numericLimit = extractNumericValue(limitAmount);
if (!limitAmount || numericLimit <= 0) {
  newErrors.limitAmount = 'Limite deve ser maior que zero';
} else if (numericLimit > 999999999) {
  newErrors.limitAmount = 'Limite muito alto';
}
```

### 3. Validação de Datas
```javascript
// Validar relação entre fechamento e vencimento
if (closingDayNum && dueDayNum) {
  let daysDifference;
  if (dueDayNum >= closingDayNum) {
    daysDifference = dueDayNum - closingDayNum;
  } else {
    // Vencimento no mês seguinte
    daysDifference = (30 - closingDayNum) + dueDayNum;
  }

  if (daysDifference < 3) {
    newErrors.dueDay = 'Vencimento deve ser pelo menos 3 dias após o fechamento';
  }
}
```

## Formatação de Valores

### Formatação Monetária em Tempo Real
```javascript
const formatCurrency = (value) => {
  // Remove tudo que não é número
  const numericValue = value.replace(/[^0-9]/g, '');
  
  // Converte para número com duas casas decimais
  const floatValue = parseFloat(numericValue) / 100;
  
  // Formata como moeda brasileira
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(floatValue);
};
```

### Extração de Valor Numérico
```javascript
const extractNumericValue = (formattedValue) => {
  const numericString = formattedValue.replace(/[^0-9,]/g, '').replace(',', '.');
  return parseFloat(numericString) || 0;
};
```

## Componentes de UI Especializados

### 1. Preview do Cartão
**Função**: Mostra uma representação visual do cartão

```javascript
const CardPreview = () => (
  <View style={styles.cardPreview}>
    <View style={styles.cardHeader}>
      <Ionicons name="card" size={24} color="white" />
      <Text style={styles.cardBrand}>SMART FINANCE</Text>
    </View>
    <Text style={styles.cardName}>
      {name || 'Nome do Cartão'}
    </Text>
    <View style={styles.cardFooter}>
      <Text style={styles.cardLimit}>
        Limite: {limitAmount || 'R$ 0,00'}
      </Text>
    </View>
  </View>
);
```

### 2. Exemplo do Ciclo
**Função**: Mostra as próximas datas de fechamento e vencimento

```javascript
const CycleExample = () => {
  // Cálculos de data...
  
  return (
    <View style={styles.cycleExample}>
      <Text style={styles.cycleTitle}>Próximo Ciclo:</Text>
      <View style={styles.cycleRow}>
        <Ionicons name="calendar" size={16} color="#666" />
        <Text>Fechamento: {closingDate.toLocaleDateString('pt-BR')}</Text>
      </View>
      <View style={styles.cycleRow}>
        <Ionicons name="alarm" size={16} color="#F44336" />
        <Text>Vencimento: {dueDate.toLocaleDateString('pt-BR')}</Text>
      </View>
    </View>
  );
};
```

### 3. Dicas Educativas
**Função**: Componente educativo para usuários iniciantes

```javascript
const CreditCardTips = () => (
  <View style={styles.tipsContainer}>
    <Text style={styles.tipsTitle}>💡 Dicas sobre Cartões de Crédito</Text>
    
    <View style={styles.tip}>
      <Text style={styles.tipTitle}>Dia de Fechamento:</Text>
      <Text style={styles.tipText}>
        Data em que o cartão "fecha" a fatura do mês...
      </Text>
    </View>
    
    {/* Mais dicas... */}
  </View>
);
```

## Integração com Transações

### Relacionamento no Banco
```sql
-- Na tabela transactions
credit_card_id INTEGER NULL,
FOREIGN KEY (credit_card_id) REFERENCES credit_cards (id)
```

### Uso em Transações
- Cartões aparecem como opção apenas em despesas
- Campo opcional (pode ser null para dinheiro/débito)
- Nome do cartão é exibido na lista de transações

### Query com JOIN
```sql
SELECT t.*, cc.name as credit_card_name
FROM transactions t
LEFT JOIN credit_cards cc ON t.credit_card_id = cc.id
WHERE t.type = 'expense'
```

## Fluxo de Dados

### 1. Carregamento de Cartões
```
CreditCardsScreen → useStore.loadCreditCards() → database.fetchData() → SQLite
```

### 2. Criação de Cartão
```
AddCreditCardScreen → Validação → useStore.addCreditCard() → database.executeQuery() → SQLite
```

### 3. Atualização de Cartão
```
AddCreditCardScreen → Validação → useStore.updateCreditCard() → database.executeQuery() → SQLite
```

## Estados de UI e Feedback

### Loading States
```javascript
const [isSubmitting, setIsSubmitting] = useState(false);

// Durante operação
setIsSubmitting(true);
await addCreditCard(cardData);
setIsSubmitting(false);
```

### Error Handling
```javascript
try {
  await addCreditCard(cardData);
  Alert.alert('Sucesso', 'Cartão cadastrado com sucesso!');
} catch (error) {
  Alert.alert('Erro', error.message || 'Erro ao salvar cartão');
}
```

### Validação Visual
- Campos com erro ficam com borda vermelha
- Mensagens específicas para cada tipo de erro
- Preview atualizado em tempo real

## Casos de Uso Comuns

### 1. Cadastro de Novo Cartão
1. Usuário acessa tela de cartões
2. Toca no botão "+"
3. Preenche formulário
4. Sistema valida dados
5. Cartão é salvo no banco
6. Lista é atualizada

### 2. Edição de Cartão Existente
1. Usuário toca em cartão na lista
2. Formulário é pré-preenchido
3. Usuário modifica dados
4. Sistema valida mudanças
5. Cartão é atualizado
6. Lista reflete mudanças

### 3. Uso em Transação
1. Usuário cria despesa
2. Seleciona cartão de crédito
3. Transação é vinculada ao cartão
4. Aparece na lista com nome do cartão

## Considerações de UX

### 1. Formatação Intuitiva
- Limite formatado como moeda em tempo real
- Dias aceitos entre 1-31 com validação
- Preview visual do cartão

### 2. Validação Progressiva
- Erros mostrados conforme usuário digita
- Validações específicas para cada campo
- Feedback imediato sobre problemas

### 3. Educação do Usuário
- Dicas sobre conceitos de cartão de crédito
- Exemplo de próximo ciclo
- Explicação de fechamento vs vencimento

## Possíveis Melhorias Futuras

### 1. Funcionalidades Avançadas
- Notificações de vencimento
- Histórico de faturas
- Controle de limite disponível
- Parcelamento de compras

### 2. Análises
- Gastos por cartão
- Comparação entre cartões
- Alertas de limite
- Projeção de faturas

### 3. Integração
- Importação de faturas
- Sincronização com bancos
- Lembretes automáticos
- Relatórios detalhados

## Boas Práticas Implementadas

1. **Validação Robusta**: Múltiplas camadas de validação
2. **UX Educativa**: Dicas e exemplos para usuários
3. **Feedback Visual**: Preview e formatação em tempo real
4. **Tratamento de Erros**: Mensagens específicas e claras
5. **Responsividade**: Interface adaptável e intuitiva

