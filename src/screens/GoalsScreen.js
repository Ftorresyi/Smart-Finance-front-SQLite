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

export default function GoalsScreen({ navigation }) {
  const {
    financialGoals,
    loadFinancialGoals,
    deleteFinancialGoal,
    loading,
  } = useStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFinancialGoals();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFinancialGoals();
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

  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return '#4CAF50';
    if (progress >= 75) return '#8BC34A';
    if (progress >= 50) return '#FF9800';
    if (progress >= 25) return '#FF5722';
    return '#F44336';
  };

  const handleDeleteGoal = (id, name) => {
    Alert.alert(
      'Excluir Meta',
      `Deseja realmente excluir a meta "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteFinancialGoal(id),
        },
      ]
    );
  };

  const renderGoal = ({ item }) => {
    const progress = calculateProgress(item.current_amount, item.target_amount);
    const progressColor = getProgressColor(progress);
    const isOverdue = new Date(item.target_date) < new Date();

    return (
      <TouchableOpacity
        style={styles.goalItem}
        onPress={() => navigation.navigate('AddGoal', { goal: item })}
        onLongPress={() => handleDeleteGoal(item.id, item.name)}
      >
        <View style={styles.goalHeader}>
          <View style={styles.goalInfo}>
            <View style={styles.goalTitleRow}>
              <Ionicons 
                name="trophy" 
                size={20} 
                color={progress >= 100 ? '#FFD700' : '#007AFF'} 
              />
              <Text style={styles.goalName}>{item.name}</Text>
              {isOverdue && progress < 100 && (
                <Ionicons name="alert-circle" size={16} color="#F44336" />
              )}
            </View>
            
            <Text style={styles.goalCategory}>{item.category_name}</Text>
            
            <View style={styles.goalAmounts}>
              <Text style={styles.goalCurrentAmount}>
                {formatCurrency(item.current_amount)}
              </Text>
              <Text style={styles.goalSeparator}> / </Text>
              <Text style={styles.goalTargetAmount}>
                {formatCurrency(item.target_amount)}
              </Text>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${progress}%`, 
                      backgroundColor: progressColor 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.progressText, { color: progressColor }]}>
                {progress.toFixed(1)}%
              </Text>
            </View>
            
            <Text style={[
              styles.goalDate,
              { color: isOverdue && progress < 100 ? '#F44336' : '#666' }
            ]}>
              Meta: {formatDate(item.target_date)}
              {isOverdue && progress < 100 && ' (Vencida)'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="trophy-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateText}>Nenhuma meta cadastrada</Text>
      <Text style={styles.emptyStateSubtext}>
        Toque no botão + para adicionar sua primeira meta financeira
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Metas Financeiras</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddGoal')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={financialGoals}
        renderItem={renderGoal}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={financialGoals.length === 0 ? styles.emptyContainer : styles.listContainer}
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
  goalItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalInfo: {
    flex: 1,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  goalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  goalCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  goalAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalCurrentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  goalSeparator: {
    fontSize: 14,
    color: '#666',
  },
  goalTargetAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'right',
  },
  goalDate: {
    fontSize: 12,
    fontWeight: '500',
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

