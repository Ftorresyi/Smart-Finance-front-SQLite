# Sistema de Metas Financeiras - Documentação Detalhada

## Visão Geral

O sistema de metas financeiras permite aos usuários definir objetivos financeiros específicos com prazos determinados. É uma ferramenta fundamental para planejamento financeiro pessoal, ajudando a manter foco e disciplina nos gastos e poupanças.

## Arquivos Relacionados

### 1. `src/screens/GoalsScreen.js`
**Função**: Lista todas as metas financeiras do usuário

**Funcionalidades principais:**
- Exibe metas com progresso visual (barra de progresso)
- Mostra informações completas: nome, categoria, valores, data
- Indica metas vencidas com alertas visuais
- Permite navegação para adicionar nova meta
- Permite editar meta existente (toque simples)
- Permite excluir meta (toque longo)

### 2. `src/screens/AddGoalScreen.js`
**Função**: Formulário para criar ou editar metas financeiras

**Funcionalidades principais:**
- Formulário completo com validação
- Cálculos automáticos de estatísticas
- Preview da meta em tempo real
- Seleção de categoria relacionada
- Validação de datas e valores
- Dicas educativas sobre metas financeiras

## Conceitos Fundamentais

### 1. Metodologia SMART para Metas

**S - Específicas (Specific)**
- Metas devem ter nome claro e objetivo definido
- Exemplo: "Comprar um carro" vs "Juntar dinheiro"

**M - Mensuráveis (Measurable)**
- Devem ter valor alvo definido em reais
- Progresso pode ser acompanhado numericamente

**A - Atingíveis (Achievable)**
- Valores realistas baseados na renda do usuário
- Validação para evitar metas impossíveis

**R - Relevantes (Relevant)**
- Relacionadas a categorias existentes
- Alinhadas com objetivos pessoais

**T - Temporais (Time-bound)**
- Data limite definida
- Prazo realista para alcançar o objetivo

### 2. Tipos Comuns de Metas Financeiras

**Reserva de Emergência**
- 3-6 meses de gastos essenciais
- Categoria: Poupança/Investimentos
- Prazo: 6-12 meses

**Compra de Bens**
- Carro, casa, eletrônicos
- Categoria: Relacionada ao bem
- Prazo: Variável conforme valor

**Investimentos**
- Aposentadoria, educação
- Categoria: Investimentos
- Prazo: Longo prazo (anos)

**Pagamento de Dívidas**
- Quitação de empréstimos
- Categoria: Despesas/Dívidas
- Prazo: Conforme contrato

## Estrutura do Banco de Dados

```sql
CREATE TABLE financial_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- Nome da meta
  target_amount REAL NOT NULL,           -- Valor objetivo
  current_amount REAL DEFAULT 0,         -- Valor atual poupado
  category_id INTEGER NOT NULL,          -- Categoria relacionada
  target_date DATE NOT NULL,             -- Data limite
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories (id)
);
```

### Relacionamentos
- `category_id` → `categories.id` (obrigatório)
- Permite análises por categoria
- Facilita organização e relatórios

## Cálculos Automáticos

### 1. Progresso Percentual
```javascript
const calculateProgress = (current, target) => {
  return Math.min((current / target) * 100, 100);
};
```

### 2. Dias Restantes
```javascript
const calculateDaysRemaining = (targetDate) => {
  const today = new Date();
  const timeDiff = targetDate.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};
```

### 3. Valor Mensal Necessário
```javascript
const calculateMonthlyNeeded = (remaining, daysRemaining) => {
  const monthsRemaining = Math.max(daysRemaining / 30, 1);
  return remaining / monthsRemaining;
};
```

### 4. Estatísticas Completas
```javascript
const calculateGoalStats = () => {
  const target = parseFloat(targetAmount) || 0;
  const current = parseFloat(currentAmount) || 0;
  const today = new Date();
  const target_date = new Date(targetDate);

  // Progresso percentual
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  // Dias restantes
  const timeDiff = target_date.getTime() - today.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

  // Valor restante
  const remainingAmount = Math.max(target - current, 0);

  // Valor mensal necessário
  const monthsRemaining = Math.max(daysRemaining / 30, 1);
  const monthlyNeeded = remainingAmount / monthsRemaining;

  return {
    progress,
    daysRemaining,
    remainingAmount,
    monthlyNeeded,
    isOverdue: daysRemaining < 0,
    isCompleted: progress >= 100,
  };
};
```

## Validações Implementadas

### 1. Validação de Nome
```javascript
// Nome único por usuário
const existingGoal = financialGoals.find(g => 
  g.name.toLowerCase() === name.trim().toLowerCase() && 
  (!isEditing || g.id !== goal.id)
);
if (existingGoal) {
  newErrors.name = 'Já existe uma meta com este nome';
}
```

### 2. Validação de Valores
```javascript
// Valor alvo deve ser positivo
const targetValue = parseFloat(targetAmount);
if (targetValue <= 0) {
  newErrors.targetAmount = 'Valor alvo deve ser maior que zero';
}

// Valor atual não pode ser maior que alvo
const currentValue = parseFloat(currentAmount) || 0;
if (currentValue > targetValue) {
  newErrors.currentAmount = 'Valor atual não pode ser maior que o valor alvo';
}
```

### 3. Validação de Datas
```javascript
// Data deve ser futura
const today = new Date();
const minDate = new Date();
minDate.setDate(today.getDate() + 1);

if (targetDate < minDate) {
  newErrors.targetDate = 'Data alvo deve ser pelo menos amanhã';
}

// Máximo 10 anos no futuro
const maxDate = new Date();
maxDate.setFullYear(today.getFullYear() + 10);

if (targetDate > maxDate) {
  newErrors.targetDate = 'Data alvo não pode ser mais de 10 anos no futuro';
}
```

## Componentes de UI Especializados

### 1. Preview da Meta
**Função**: Mostra representação visual da meta

```javascript
const GoalPreview = () => (
  <View style={styles.previewContainer}>
    <View style={styles.preview}>
      <Ionicons name="trophy" size={32} color="#FFD700" />
    </View>
    <Text style={styles.previewName}>
      {name || 'Nome da Meta'}
    </Text>
    <Text style={styles.previewAmount}>
      {targetAmount ? formatCurrency(targetAmount) : 'R$ 0,00'}
    </Text>
    <Text style={styles.previewDate}>
      até {formatDate(targetDate)}
    </Text>
  </View>
);
```

### 2. Estatísticas da Meta
**Função**: Mostra cálculos automáticos em tempo real

```javascript
const GoalStats = () => {
  const stats = calculateGoalStats();

  return (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>Estatísticas da Meta</Text>
      
      {/* Progresso */}
      <View style={styles.statRow}>
        <Ionicons name="analytics" size={20} color="#007AFF" />
        <Text style={styles.statLabel}>Progresso</Text>
        <Text style={styles.statValue}>
          {stats.progress.toFixed(1)}%
        </Text>
      </View>

      {/* Mais estatísticas... */}
    </View>
  );
};
```

### 3. Dicas Educativas
**Função**: Componente educativo sobre metas financeiras

```javascript
const GoalTips = () => (
  <View style={styles.tipsContainer}>
    <Text style={styles.tipsTitle}>💡 Dicas para Metas Financeiras</Text>
    
    <View style={styles.tip}>
      <Text style={styles.tipTitle}>Seja Específico:</Text>
      <Text style={styles.tipText}>
        "Comprar um carro" é melhor que "juntar dinheiro".
      </Text>
    </View>
    
    {/* Mais dicas... */}
  </View>
);
```

## Fluxo de Dados

### 1. Carregamento de Metas
```
GoalsScreen → useStore.loadFinancialGoals() → database.fetchData() → SQLite
```

**Query executada:**
```sql
SELECT fg.*, c.name as category_name, c.color as category_color
FROM financial_goals fg
LEFT JOIN categories c ON fg.category_id = c.id
ORDER BY fg.target_date
```

### 2. Criação de Meta
```
AddGoalScreen → Validação → useStore.addFinancialGoal() → database.executeQuery() → SQLite
```

### 3. Atualização de Meta
```
AddGoalScreen → Validação → useStore.updateFinancialGoal() → database.executeQuery() → SQLite
```

## Estados Visuais das Metas

### 1. Meta Normal
- Progresso < 100%
- Data não vencida
- Cor: Azul (#007AFF)

### 2. Meta Concluída
- Progresso >= 100%
- Cor: Verde (#4CAF50)
- Ícone: Troféu dourado

### 3. Meta Vencida
- Data passou
- Progresso < 100%
- Cor: Vermelho (#F44336)
- Indicador de alerta

### 4. Cores por Progresso
```javascript
const getProgressColor = (progress) => {
  if (progress >= 100) return '#4CAF50'; // Verde - Concluída
  if (progress >= 75) return '#8BC34A';  // Verde claro
  if (progress >= 50) return '#FF9800';  // Laranja
  if (progress >= 25) return '#FF5722';  // Laranja escuro
  return '#F44336';                      // Vermelho
};
```

## Integração com Categorias

### Relacionamento
- Cada meta deve ter uma categoria
- Permite análises por tipo de objetivo
- Facilita organização visual

### Filtragem
- Metas podem ser filtradas por categoria
- Análises agrupadas por tipo
- Relatórios segmentados

## Casos de Uso Comuns

### 1. Reserva de Emergência
```javascript
const emergencyFund = {
  name: "Reserva de Emergência",
  target_amount: 18000, // 6 meses de R$ 3.000
  current_amount: 0,
  category_id: 1, // Poupança
  target_date: "2024-12-31"
};
```

### 2. Compra de Carro
```javascript
const carGoal = {
  name: "Carro Novo",
  target_amount: 45000,
  current_amount: 5000, // Já tem algo poupado
  category_id: 4, // Transporte
  target_date: "2025-06-30"
};
```

### 3. Viagem
```javascript
const travelGoal = {
  name: "Viagem para Europa",
  target_amount: 15000,
  current_amount: 0,
  category_id: 6, // Lazer
  target_date: "2024-07-01"
};
```

## Análises e Relatórios

### 1. Progresso Geral
- Quantas metas ativas
- Progresso médio
- Metas próximas do vencimento

### 2. Por Categoria
- Distribuição de metas por tipo
- Valores totais por categoria
- Sucesso por categoria

### 3. Temporal
- Metas por mês/ano
- Sazonalidade de objetivos
- Histórico de conclusões

## Notificações e Lembretes

### Tipos de Alertas (Futuro)
1. **Meta próxima do vencimento** (30, 15, 7 dias)
2. **Meta vencida** sem conclusão
3. **Meta concluída** com parabenização
4. **Progresso lento** comparado ao necessário

## Gamificação (Futuro)

### Elementos
- **Badges**: Primeira meta, meta de R$ 10k, etc.
- **Streaks**: Metas consecutivas concluídas
- **Níveis**: Baseado em valor total poupado
- **Conquistas**: Marcos específicos

## Boas Práticas Implementadas

1. **Cálculos Automáticos**: Estatísticas em tempo real
2. **Validação Robusta**: Múltiplas camadas de verificação
3. **Feedback Visual**: Cores e ícones informativos
4. **Educação do Usuário**: Dicas e orientações
5. **UX Intuitiva**: Interface clara e objetiva

## Possíveis Melhorias Futuras

### 1. Funcionalidades Avançadas
- Metas compartilhadas (família)
- Submetas (marcos intermediários)
- Metas recorrentes (anuais)
- Ajuste automático de prazos

### 2. Integração
- Transferência automática para poupança
- Lembretes personalizados
- Sincronização com investimentos
- Importação de dados bancários

### 3. Análises Avançadas
- Previsão de conclusão
- Comparação com médias
- Sugestões de otimização
- Relatórios detalhados

