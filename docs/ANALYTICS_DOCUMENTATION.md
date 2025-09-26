# Sistema de Análises e Gráficos - Documentação Detalhada

## Visão Geral

O sistema de análises é o dashboard principal do Smart Finance, oferecendo visualizações interativas e métricas importantes sobre a situação financeira do usuário. Combina dados de transações, categorias e metas para gerar insights valiosos sobre padrões de gastos e progresso financeiro.

## Arquivos Relacionados

### 1. `src/screens/AnalyticsScreen.js`
**Função**: Dashboard principal com análises visuais completas

**Funcionalidades principais:**
- Seletor de período (1M, 3M, 6M, 1A)
- Cards de métricas principais
- Gráfico de pizza (despesas por categoria)
- Gráfico de barras (evolução mensal)
- Progresso das metas financeiras
- Refresh automático dos dados

## Conceitos Fundamentais

### 1. Tipos de Análises Financeiras

**Análise de Distribuição**
- Como o dinheiro é distribuído entre categorias
- Visualização: Gráfico de Pizza (Pie Chart)
- Objetivo: Identificar onde o dinheiro está sendo gasto

**Análise Temporal**
- Evolução das finanças ao longo do tempo
- Visualização: Gráfico de Barras (Bar Chart)
- Objetivo: Identificar tendências e padrões sazonais

**Análise Comparativa**
- Receitas vs Despesas por período
- Visualização: Barras agrupadas
- Objetivo: Avaliar equilíbrio financeiro

**Análise de Progresso**
- Acompanhamento de metas financeiras
- Visualização: Barras de progresso
- Objetivo: Motivar e acompanhar objetivos

### 2. Métricas Financeiras Importantes

**Patrimônio Líquido**
```javascript
const netWorth = totalIncome - totalExpenses;
```
- Representa a diferença entre receitas e despesas
- Positivo: superávit, Negativo: déficit

**Taxa de Poupança**
```javascript
const savingsRate = totalIncome > 0 ? 
  ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
```
- Percentual da renda que está sendo poupado
- Meta recomendada: 10-20% da renda

**Fluxo de Caixa**
- Entrada e saída de dinheiro por período
- Permite identificar meses problemáticos

### 3. Períodos de Análise

**1 Mês (1M)**
- Análise do mês atual vs mês anterior
- Ideal para controle mensal

**3 Meses (3M)**
- Análise trimestral
- Identifica tendências de curto prazo

**6 Meses (6M)**
- Análise semestral
- Padrões sazonais e médio prazo

**1 Ano (1A)**
- Análise anual completa
- Tendências de longo prazo

## Implementação Técnica

### 1. Filtragem de Dados por Período

```javascript
const getFilteredTransactions = useMemo(() => {
  const now = new Date();
  let startDate = new Date();

  switch (selectedPeriod) {
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'semester':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.transaction_date);
    return transactionDate >= startDate && transactionDate <= now;
  });
}, [transactions, selectedPeriod]);
```

### 2. Cálculo de Métricas

```javascript
const calculateMetrics = useMemo(() => {
  const filteredTransactions = getFilteredTransactions;
  
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netWorth = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? 
    ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Agrupar por categoria
  const expensesByCategory = {};
  filteredTransactions
    .filter(t => t.type === 'expense')
    .forEach(transaction => {
      const category = categories.find(c => c.id === transaction.category_id);
      const categoryName = category ? category.name : 'Sem categoria';
      const categoryColor = category ? category.color : '#666';
      
      if (!expensesByCategory[categoryName]) {
        expensesByCategory[categoryName] = { amount: 0, color: categoryColor };
      }
      expensesByCategory[categoryName].amount += transaction.amount;
    });

  return {
    totalIncome,
    totalExpenses,
    netWorth,
    savingsRate,
    expensesByCategory,
    transactionCount: filteredTransactions.length,
  };
}, [getFilteredTransactions, categories]);
```

### 3. Preparação de Dados para Gráficos

**Gráfico de Pizza (Despesas por Categoria)**
```javascript
const prepareExpensesPieData = useMemo(() => {
  const { expensesByCategory } = calculateMetrics;
  
  return Object.entries(expensesByCategory)
    .sort(([,a], [,b]) => b.amount - a.amount) // Ordenar por valor
    .slice(0, 6) // Top 6 categorias
    .map(([name, data]) => ({
      name,
      population: data.amount,
      color: data.color,
      legendFontColor: '#333',
      legendFontSize: 12,
    }));
}, [calculateMetrics]);
```

**Gráfico de Barras (Evolução Mensal)**
```javascript
const prepareMonthlyBarData = useMemo(() => {
  const monthlyData = {};
  const now = new Date();
  const monthsToShow = selectedPeriod === 'year' ? 12 : 6;
  
  // Inicializar meses
  for (let i = monthsToShow - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short' });
    
    monthlyData[monthKey] = {
      label: monthLabel,
      income: 0,
      expense: 0,
    };
  }

  // Agrupar transações por mês
  getFilteredTransactions.forEach(transaction => {
    const transactionDate = new Date(transaction.transaction_date);
    const monthKey = `${transactionDate.getFullYear()}-${transactionDate.getMonth()}`;
    
    if (monthlyData[monthKey]) {
      if (transaction.type === 'income') {
        monthlyData[monthKey].income += transaction.amount;
      } else {
        monthlyData[monthKey].expense += transaction.amount;
      }
    }
  });

  return {
    labels: Object.values(monthlyData).map(data => data.label),
    datasets: [
      {
        data: Object.values(monthlyData).map(data => data.income),
        color: () => '#4CAF50', // Verde para receitas
      },
      {
        data: Object.values(monthlyData).map(data => data.expense),
        color: () => '#F44336', // Vermelho para despesas
      },
    ],
  };
}, [getFilteredTransactions, selectedPeriod]);
```

## Componentes de UI Especializados

### 1. Seletor de Período

```javascript
const PeriodSelector = () => {
  const periods = [
    { key: 'month', label: '1M' },
    { key: 'quarter', label: '3M' },
    { key: 'semester', label: '6M' },
    { key: 'year', label: '1A' },
  ];

  return (
    <View style={styles.periodSelector}>
      {periods.map(period => (
        <TouchableOpacity
          key={period.key}
          style={[
            styles.periodButton,
            selectedPeriod === period.key && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod(period.key)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period.key && styles.periodButtonTextActive
          ]}>
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

### 2. Cards de Métricas

```javascript
const MetricsCards = () => {
  const { totalIncome, totalExpenses, netWorth, savingsRate } = calculateMetrics;

  const metrics = [
    {
      title: 'Receitas',
      value: formatCurrency(totalIncome),
      icon: 'trending-up',
      color: '#4CAF50',
    },
    {
      title: 'Despesas',
      value: formatCurrency(totalExpenses),
      icon: 'trending-down',
      color: '#F44336',
    },
    {
      title: 'Saldo',
      value: formatCurrency(netWorth),
      icon: netWorth >= 0 ? 'wallet' : 'warning',
      color: netWorth >= 0 ? '#2196F3' : '#FF9800',
    },
    {
      title: 'Taxa Poupança',
      value: `${savingsRate.toFixed(1)}%`,
      icon: 'pie-chart',
      color: '#9C27B0',
    },
  ];

  return (
    <View style={styles.metricsContainer}>
      {metrics.map((metric, index) => (
        <View key={index} style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: metric.color }]}>
            <Ionicons name={metric.icon} size={20} color="white" />
          </View>
          <Text style={styles.metricTitle}>{metric.title}</Text>
          <Text style={[styles.metricValue, { color: metric.color }]}>
            {metric.value}
          </Text>
        </View>
      ))}
    </View>
  );
};
```

### 3. Gráficos com Estados Vazios

```javascript
const ExpensesPieChart = () => {
  const data = prepareExpensesPieData;

  if (data.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Despesas por Categoria</Text>
        <View style={styles.emptyChart}>
          <Ionicons name="pie-chart-outline" size={48} color="#ccc" />
          <Text style={styles.emptyChartText}>Nenhuma despesa encontrada</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Despesas por Categoria</Text>
      <PieChart
        data={data}
        width={screenWidth - 60}
        height={220}
        chartConfig={{
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
    </View>
  );
};
```

## Bibliotecas de Gráficos

### react-native-chart-kit

**Vantagens:**
- Simples de usar
- Boa performance
- Gráficos responsivos
- Suporte a múltiplos tipos

**Tipos de Gráficos Utilizados:**
- `PieChart`: Distribuição por categoria
- `BarChart`: Comparação mensal
- `LineChart`: Tendências temporais (futuro)

**Configuração Padrão:**
```javascript
const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
};
```

## Performance e Otimização

### 1. useMemo para Cálculos Pesados

```javascript
// Evita recálculos desnecessários
const calculateMetrics = useMemo(() => {
  // Cálculos complexos aqui
}, [getFilteredTransactions, categories]);

const prepareExpensesPieData = useMemo(() => {
  // Preparação de dados aqui
}, [calculateMetrics]);
```

### 2. Filtragem Eficiente

```javascript
// Filtra apenas uma vez e reutiliza
const getFilteredTransactions = useMemo(() => {
  // Lógica de filtragem
}, [transactions, selectedPeriod]);
```

### 3. Carregamento Assíncrono

```javascript
const loadAllData = async () => {
  try {
    await Promise.all([
      loadTransactions(),
      loadCategories(),
      loadFinancialGoals(),
    ]);
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }
};
```

## Estados de UI

### 1. Loading States
- Indicadores de carregamento durante refresh
- Skeleton screens para melhor UX

### 2. Empty States
- Mensagens informativas quando não há dados
- Botões de ação para criar conteúdo

### 3. Error States
- Tratamento de erros de carregamento
- Opções de retry

## Responsividade

### Dimensões Dinâmicas
```javascript
const screenWidth = Dimensions.get('window').width;

// Gráficos se adaptam ao tamanho da tela
<PieChart
  width={screenWidth - 60}
  height={220}
  // ...
/>
```

### Layout Flexível
```javascript
// Cards se adaptam ao espaço disponível
metricsContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 15,
},
metricCard: {
  flex: 1,
  minWidth: '45%', // Mínimo 45% da largura
},
```

## Insights e Análises Futuras

### 1. Análises Avançadas
- Previsão de gastos baseada em histórico
- Identificação de padrões sazonais
- Alertas de gastos anômalos
- Comparação com médias de mercado

### 2. Segmentação
- Análise por cartão de crédito
- Gastos por dia da semana
- Horários de maior gasto
- Análise geográfica (futuro)

### 3. Relatórios Personalizados
- Exportação de dados
- Relatórios em PDF
- Compartilhamento de insights
- Metas vs realizado

## Boas Práticas Implementadas

1. **Performance**: useMemo para cálculos pesados
2. **UX**: Estados vazios informativos
3. **Responsividade**: Gráficos adaptáveis
4. **Acessibilidade**: Cores contrastantes
5. **Manutenibilidade**: Código bem documentado

## Possíveis Melhorias Futuras

### 1. Interatividade
- Gráficos clicáveis para drill-down
- Filtros avançados
- Zoom e pan em gráficos temporais

### 2. Novos Tipos de Análise
- Análise de correlação
- Benchmarking
- Projeções futuras
- Análise de ROI

### 3. Exportação e Compartilhamento
- Relatórios em PDF
- Compartilhamento social
- Integração com planilhas
- APIs para terceiros

