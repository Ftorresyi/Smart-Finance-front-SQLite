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

export default function CreditCardsScreen({ navigation }) {
  const {
    creditCards,
    loadCreditCards,
    deleteCreditCard,
    loading,
  } = useStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCreditCards();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCreditCards();
    setRefreshing(false);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleDeleteCreditCard = (id, name) => {
    Alert.alert(
      'Excluir Cartão',
      `Deseja realmente excluir o cartão "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteCreditCard(id),
        },
      ]
    );
  };

  const renderCreditCard = ({ item }) => (
    <TouchableOpacity
      style={styles.cardItem}
      onPress={() => navigation.navigate('AddCreditCard', { creditCard: item })}
      onLongPress={() => handleDeleteCreditCard(item.id, item.name)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="card" size={24} color="#007AFF" />
            <Text style={styles.cardName}>{item.name}</Text>
          </View>
          
          <View style={styles.cardDetails}>
            <View style={styles.cardDetailItem}>
              <Text style={styles.cardDetailLabel}>Limite:</Text>
              <Text style={styles.cardDetailValue}>
                {formatCurrency(item.limit_amount)}
              </Text>
            </View>
            
            <View style={styles.cardDetailItem}>
              <Text style={styles.cardDetailLabel}>Fechamento:</Text>
              <Text style={styles.cardDetailValue}>Dia {item.closing_day}</Text>
            </View>
            
            <View style={styles.cardDetailItem}>
              <Text style={styles.cardDetailLabel}>Vencimento:</Text>
              <Text style={styles.cardDetailValue}>Dia {item.due_day}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.cardActions}>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="card-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateText}>Nenhum cartão cadastrado</Text>
      <Text style={styles.emptyStateSubtext}>
        Toque no botão + para adicionar seu primeiro cartão de crédito
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cartões de Crédito</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddCreditCard')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={creditCards}
        renderItem={renderCreditCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={creditCards.length === 0 ? styles.emptyContainer : styles.listContainer}
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
  cardItem: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  cardDetails: {
    gap: 8,
  },
  cardDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDetailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  cardDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  cardActions: {
    padding: 5,
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

