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

export default function CategoriesScreen({ navigation }) {
  const {
    categories,
    loadCategories,
    deleteCategory,
    loading,
  } = useStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  };

  const handleDeleteCategory = (id, name) => {
    Alert.alert(
      'Excluir Categoria',
      `Deseja realmente excluir a categoria "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteCategory(id),
        },
      ]
    );
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[styles.categoryItem, { borderLeftColor: item.color }]}
      onPress={() => navigation.navigate('AddCategory', { category: item })}
      onLongPress={() => handleDeleteCategory(item.id, item.name)}
    >
      <View style={styles.categoryHeader}>
        <View style={styles.categoryInfo}>
          <View style={styles.categoryTitleRow}>
            <View style={[styles.categoryColorIndicator, { backgroundColor: item.color }]} />
            <Text style={styles.categoryName}>{item.name}</Text>
          </View>
          <Text style={[
            styles.categoryType,
            { color: item.type === 'income' ? '#4CAF50' : '#F44336' }
          ]}>
            {item.type === 'income' ? 'Receita' : 'Despesa'}
          </Text>
        </View>
        <View style={styles.categoryActions}>
          <Ionicons
            name={item.type === 'income' ? 'trending-up' : 'trending-down'}
            size={24}
            color={item.type === 'income' ? '#4CAF50' : '#F44336'}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="folder-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateText}>Nenhuma categoria encontrada</Text>
      <Text style={styles.emptyStateSubtext}>
        Toque no botão + para adicionar sua primeira categoria
      </Text>
    </View>
  );

  // Separar categorias por tipo
  const incomeCategories = categories.filter(cat => cat.type === 'income');
  const expenseCategories = categories.filter(cat => cat.type === 'expense');

  const renderSection = (title, data, icon, color) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
        <Text style={styles.sectionCount}>({data.length})</Text>
      </View>
      <FlatList
        data={data}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={false}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categorias</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddCategory')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={[1]} // Dummy data para usar FlatList como container
        renderItem={() => (
          <View>
            {categories.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {renderSection('Receitas', incomeCategories, 'trending-up', '#4CAF50')}
                {renderSection('Despesas', expenseCategories, 'trending-down', '#F44336')}
              </>
            )}
          </View>
        )}
        keyExtractor={() => 'categories'}
        contentContainerStyle={categories.length === 0 ? styles.emptyContainer : styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  categoryItem: {
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
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  categoryColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryType: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryActions: {
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

