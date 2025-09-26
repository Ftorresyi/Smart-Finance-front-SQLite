/**
 * AnalyticsScreen.js
 * 
 * FUNCIONALIDADE:
 * Esta tela apresenta análises visuais completas dos dados financeiros do usuário.
 * Inclui gráficos interativos, métricas importantes e insights sobre padrões de gastos.
 * 
 * CONCEITOS IMPORTANTES:
 * 
 * 1. TIPOS DE ANÁLISES FINANCEIRAS:
 *    - Distribuição: Como o dinheiro é gasto (pizza/donut charts)
 *    - Temporal: Evolução ao longo do tempo (line charts)
 *    - Comparativa: Receitas vs Despesas (bar charts)
 *    - Progresso: Metas e objetivos (progress bars)
 * 
 * 2. MÉTRICAS FINANCEIRAS IMPORTANTES:
 *    - Patrimônio Líquido = Total Receitas - Total Despesas
 *    - Fluxo de Caixa Mensal = Receitas do Mês - Despesas do Mês
 *    - Taxa de Poupança = (Receitas - Despesas) / Receitas * 100
 *    - Gasto Médio por Categoria
 * 
 * 3. PERÍODOS DE ANÁLISE:
 *    - Mês atual
 *    - Últimos 3 meses
 *    - Últimos 6 meses
 *    - Ano atual
 * 
 * 4. BIBLIOTECAS DE GRÁFICOS:
 *    - react-native-chart-kit: Gráficos simples e rápidos
 *    - Responsivos e otimizados para mobile
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';
import useStore from '../store/useStore';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen({ navigation }) {
  // Estados para controle da tela
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [refreshing, setRefreshing] = useState(false);

  // Dados do store
  const {
    transactions,
    categories,
    financialGoals,
    loadTransactions,
    loadCategories,
    loadFinancialGoals,
  } = useStore();

  /**
   * useEffect - Carrega todos os dados necessários
   */
  useEffect(() => {
    loadAllData();
  }, []);

  /**
   * Função para carregar todos os dados
   */
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

  /**
   * Função para refresh da tela
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  /**
   * Função para filtrar transações por período
   */
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
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.transaction_date);
      return transactionDate >= startDate && transactionDate <= now;
    });
  }, [transactions, selectedPeriod]);

  /**
   * Calcular métricas financeiras principais
   */
  const calculateMetrics = useMemo(() => {
    const filteredTransactions = getFilteredTransactions;
    
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netWorth = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // Calcular gastos por categoria
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

  /**
   * Preparar dados para gráfico de pizza (despesas por categoria)
   */
  const prepareExpensesPieData = useMemo(() => {
    const { expensesByCategory } = calculateMetrics;
    
    return Object.entries(expensesByCategory)
      .sort(([,a], [,b]) => b.amount - a.amount) // Ordenar por valor decrescente
      .slice(0, 6) // Pegar apenas top 6 categorias
      .map(([name, data]) => ({
        name,
        population: data.amount,
        color: data.color,
        legendFontColor: '#333',
        legendFontSize: 12,
      }));
  }, [calculateMetrics]);

  /**
   * Preparar dados para gráfico de barras (últimos meses)
   */
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

    const labels = Object.values(monthlyData).map(data => data.label);
    const incomeData = Object.values(monthlyData).map(data => data.income);
    const expenseData = Object.values(monthlyData).map(data => data.expense);

    return {
      labels,
      datasets: [
        {
          data: incomeData,
          color: () => '#4CAF50',
        },
        {
          data: expenseData,
          color: () => '#F44336',
        },
      ],
    };
  }, [getFilteredTransactions, selectedPeriod]);

  /**
   * Função para formatar valores monetários
   */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  /**
   * Componente para seletor de período
   */
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

  /**
   * Componente para cards de métricas principais
   */
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

  /**
   * Componente para gráfico de despesas por categoria
   */
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

  /**
   * Componente para gráfico de evolução mensal
   */
  const MonthlyBarChart = () => {
    const data = prepareMonthlyBarData;

    if (data.labels.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Evolução Mensal</Text>
          <View style={styles.emptyChart}>
            <Ionicons name="bar-chart-outline" size={48} color="#ccc" />
            <Text style={styles.emptyChartText}>Dados insuficientes</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Evolução Mensal</Text>
        <BarChart
          data={data}
          width={screenWidth - 60}
          height={220}
          chartConfig={{
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
            strokeWidth: 2,
            barPercentage: 0.7,
            useShadowColorFromDataset: false,
          }}
          verticalLabelRotation={30}
          showValuesOnTopOfBars={false}
          fromZero={true}
        />
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Receitas</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Despesas</Text>
          </View>
        </View>
      </View>
    );
  };

  /**
   * Componente para progresso das metas
   */
  const GoalsProgress = () => {
    if (financialGoals.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Progresso das Metas</Text>
          <View style={styles.emptyChart}>
            <Ionicons name="trophy-outline" size={48} color="#ccc" />
            <Text style={styles.emptyChartText}>Nenhuma meta cadastrada</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('Goals')}
            >
              <Text style={styles.addButtonText}>Criar Meta</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Progresso das Metas</Text>
        <View style={styles.goalsContainer}>
          {financialGoals.map((goal) => {
            const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
            const progressColor = progress >= 100 ? '#4CAF50' : progress >= 50 ? '#FF9800' : '#F44336';
            
            return (
              <View key={goal.id} style={styles.goalItem}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <Text style={[styles.goalPercentage, { color: progressColor }]}>
                    {progress.toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${progress}%`,
                        backgroundColor: progressColor,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.goalValues}>
                  {formatCurrency(goal.current_amount)} de {formatCurrency(goal.target_amount)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Análises</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Seletor de período */}
        <PeriodSelector />

        {/* Cards de métricas */}
        <MetricsCards />

        {/* Gráfico de despesas por categoria */}
        <ExpensesPieChart />

        {/* Gráfico de evolução mensal */}
        <MonthlyBarChart />

        {/* Progresso das metas */}
        <GoalsProgress />

        {/* Espaçamento final */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

/**
 * ESTILOS DO COMPONENTE
 * Organizados por seção para facilitar manutenção
 */
const styles = StyleSheet.create({
  // Layout geral
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },

  // Seletor de período
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: 'white',
  },

  // Cards de métricas
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Containers de gráficos
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },

  // Estados vazios
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChartText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Legenda dos gráficos
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },

  // Progresso das metas
  goalsContainer: {
    gap: 15,
  },
  goalItem: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  goalPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  goalValues: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },

  // Espaçamento
  bottomSpacing: {
    height: 20,
  },
});

