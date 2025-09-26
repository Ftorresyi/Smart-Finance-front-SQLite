import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store/useStore';

export default function HomeScreen({ navigation }) {
  const {
    transactions,
    categories,
    creditCards,
    financialGoals,
    loadTransactions,
    loadCategories,
    loadCreditCards,
    loadFinancialGoals,
    loading,
  } = useStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadTransactions(),
        loadCategories(),
        loadCreditCards(),
        loadFinancialGoals(),
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Calcular resumo financeiro
  const calculateSummary = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.transaction_date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });

    const income = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expenses;

    return { income, expenses, balance };
  };

  const { income, expenses, balance } = calculateSummary();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const QuickActionButton = ({ icon, title, onPress, color = '#007AFF' }) => (
    <TouchableOpacity style={[styles.quickAction, { borderColor: color }]} onPress={onPress}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.quickActionText, { color }]}>{title}</Text>
    </TouchableOpacity>
  );

  const SummaryCard = ({ title, value, color, icon }) => (
    <View style={[styles.summaryCard, { borderLeftColor: color }]}>
      <View style={styles.summaryHeader}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.summaryTitle}>{title}</Text>
      </View>
      <Text style={[styles.summaryValue, { color }]}>{formatCurrency(value)}</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Bem-vindo ao</Text>
        <Text style={styles.appTitle}>Smart Finance</Text>
      </View>

      {/* Resumo Financeiro */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumo do Mês</Text>
        
        <SummaryCard
          title="Receitas"
          value={income}
          color="#4CAF50"
          icon="trending-up"
        />
        
        <SummaryCard
          title="Despesas"
          value={expenses}
          color="#F44336"
          icon="trending-down"
        />
        
        <SummaryCard
          title="Saldo"
          value={balance}
          color={balance >= 0 ? '#4CAF50' : '#F44336'}
          icon={balance >= 0 ? 'checkmark-circle' : 'alert-circle'}
        />
      </View>

      {/* Ações Rápidas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        
        <View style={styles.quickActionsGrid}>
          <QuickActionButton
            icon="add-circle"
            title="Nova Receita"
            color="#4CAF50"
            onPress={() => navigation.navigate('Transactions', {
              screen: 'AddTransaction',
              params: { type: 'income' }
            })}
          />
          
          <QuickActionButton
            icon="remove-circle"
            title="Nova Despesa"
            color="#F44336"
            onPress={() => navigation.navigate('Transactions', {
              screen: 'AddTransaction',
              params: { type: 'expense' }
            })}
          />
          
          <QuickActionButton
            icon="folder"
            title="Categorias"
            onPress={() => navigation.navigate('Categories')}
          />
          
          <QuickActionButton
            icon="card"
            title="Cartões"
            onPress={() => navigation.navigate('CreditCards')}
          />
          
          <QuickActionButton
            icon="trophy"
            title="Metas"
            onPress={() => navigation.navigate('Goals')}
          />
          
          <QuickActionButton
            icon="analytics"
            title="Análises"
            onPress={() => navigation.navigate('Analytics')}
          />
        </View>
      </View>

      {/* Estatísticas Rápidas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estatísticas</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{categories.length}</Text>
            <Text style={styles.statLabel}>Categorias</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{transactions.length}</Text>
            <Text style={styles.statLabel}>Transações</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{creditCards.length}</Text>
            <Text style={styles.statLabel}>Cartões</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{financialGoals.length}</Text>
            <Text style={styles.statLabel}>Metas</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  welcomeText: {
    color: 'white',
    fontSize: 16,
    opacity: 0.9,
  },
  appTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 5,
  },
  section: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
});

