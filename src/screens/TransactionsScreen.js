import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store/useStore';

export default function TransactionsScreen({ navigation }) {
  const {
    transactions,
    loadTransactions,
    deleteTransaction,
    loading,
  } = useStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const handleDeleteTransaction = (id, description) => {
    Alert.alert(
      'Excluir Transação',
      `Deseja realmente excluir "${description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteTransaction(id),
        },
      ]
    );
  };

  const renderTransaction = ({ item }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onLongPress={() => handleDeleteTransaction(item.id, item.description)}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <View style={styles.transactionTitleRow}>
            <Ionicons
              name={item.type === 'income' ? 'trending-up' : 'trending-down'}
              size={20}
              color={item.type === 'income' ? '#4CAF50' : '#F44336'}
            />
            <Text style={styles.transactionDescription}>{item.description}</Text>
          </View>
          <Text style={styles.transactionCategory}>{item.category_name}</Text>
          {item.credit_card_name && (
            <Text style={styles.transactionCard}>
              <Ionicons name="card" size={12} color="#666" /> {item.credit_card_name}
            </Text>
          )}
        </View>
        <View style={styles.transactionAmount}>
          <Text
            style={[
              styles.amountText,
              { color: item.type === 'income' ? '#4CAF50' : '#F44336' }
            ]}
          >
            {item.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(item.amount))}
          </Text>
          <Text style={styles.transactionDate}>{formatDate(item.transaction_date)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateText}>Nenhuma transação encontrada</Text>
      <Text style={styles.emptyStateSubtext}>
        Toque no botão + para adicionar sua primeira transação
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transações</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddTransaction')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={transactions.length === 0 ? styles.emptyContainer : styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={EmptyState}
      />
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  listContainer: {
    padding: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  transactionItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionInfo: {
    flex: 1,
    marginRight: 10,
  },
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  transactionCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  transactionCard: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

