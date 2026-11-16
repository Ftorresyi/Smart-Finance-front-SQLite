/**
 * AddGoalScreen.js
 * 
 * FUNCIONALIDADE:
 * Esta tela permite ao usuário criar uma nova meta financeira ou editar uma existente.
 * As metas ajudam no planejamento financeiro, definindo objetivos específicos com prazos.
 * 
 * CONCEITOS IMPORTANTES:
 * 
 * 1. METAS FINANCEIRAS (SMART GOALS):
 *    - Específicas: têm nome claro e categoria definida
 *    - Mensuráveis: têm valor alvo definido
 *    - Atingíveis: valor realista baseado na renda
 *    - Relevantes: relacionadas a categorias existentes
 *    - Temporais: têm data limite definida
 * 
 * 2. TIPOS DE METAS COMUNS:
 *    - Reserva de emergência (6 meses de gastos)
 *    - Compra de bens (carro, casa, viagem)
 *    - Investimentos (aposentadoria, educação)
 *    - Pagamento de dívidas
 * 
 * 3. CÁLCULOS AUTOMÁTICOS:
 *    - Valor mensal necessário = (valor_alvo - valor_atual) / meses_restantes
 *    - Progresso = (valor_atual / valor_alvo) * 100
 *    - Dias restantes = data_alvo - data_atual
 * 
 * 4. VALIDAÇÕES ESPECÍFICAS:
 *    - Data alvo deve ser futura
 *    - Valor alvo deve ser maior que valor atual
 *    - Categoria deve existir
 *    - Nome deve ser único por usuário
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import useStore from '../store/useStore';

export default function AddGoalScreen({ navigation, route }) {
  // Extrair meta dos parâmetros de navegação (se existir, estamos editando)
  const { goal } = route.params || {};
  const isEditing = !!goal;

  // Estados do formulário
  const [name, setName] = useState('');                    // Nome da meta
  const [targetAmount, setTargetAmount] = useState('');    // Valor alvo
  const [currentAmount, setCurrentAmount] = useState('');  // Valor atual
  const [categoryId, setCategoryId] = useState('');        // Categoria relacionada
  const [targetDate, setTargetDate] = useState(new Date()); // Data alvo

  // Estados para controle da UI
  const [errors, setErrors] = useState({});               // Erros de validação
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading do botão
  const [showDatePicker, setShowDatePicker] = useState(false); // Date picker
  const [showCategoryModal, setShowCategoryModal] = useState(false); // Modal de categoria

  // Dados do store
  const {
    categories,
    financialGoals,
    addFinancialGoal,
    updateFinancialGoal,
    loadCategories,
    loading,
  } = useStore();
  const isSaving = isSubmitting || loading.financialGoals;

  /**
   * useEffect - Carrega dados e preenche formulário se editando
   */
  useEffect(() => {
    loadCategories();

    if (isEditing && goal) {
      setName(goal.name);
      setTargetAmount(goal.target_amount.toString());
      setCurrentAmount(goal.current_amount.toString());
      setCategoryId(goal.category_id.toString());
      setTargetDate(new Date(goal.target_date));
    } else {
      // Para nova meta, definir data padrão para 1 ano no futuro
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      setTargetDate(futureDate);
    }
  }, [isEditing, goal]);

  /**
   * Função para formatar valor monetário
   */
  const formatCurrency = (value) => {
    const numericValue = parseFloat(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numericValue);
  };

  /**
   * Função para formatar data
   */
  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR');
  };

  /**
   * Buscar categoria selecionada
   */
  const getSelectedCategory = () => {
    return categories.find(cat => cat.id.toString() === categoryId);
  };

  /**
   * Calcular estatísticas da meta
   */
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

    // Valor mensal necessário (considerando meses restantes)
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

  /**
   * Validação completa do formulário
   */
  const validateForm = () => {
    const newErrors = {};

    // Validar nome da meta
    if (!name.trim()) {
      newErrors.name = 'Nome da meta é obrigatório';
    } else if (name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    } else {
      // Verificar se nome já existe (exceto se estamos editando a mesma meta)
      const existingGoal = financialGoals.find(g => 
        g.name.toLowerCase() === name.trim().toLowerCase() && 
        (!isEditing || g.id !== goal.id)
      );
      if (existingGoal) {
        newErrors.name = 'Já existe uma meta com este nome';
      }
    }

    // Validar valor alvo
    const targetValue = parseFloat(targetAmount);
    if (!targetAmount || isNaN(targetValue)) {
      newErrors.targetAmount = 'Valor alvo é obrigatório e deve ser um número';
    } else if (targetValue <= 0) {
      newErrors.targetAmount = 'Valor alvo deve ser maior que zero';
    } else if (targetValue > 999999999) {
      newErrors.targetAmount = 'Valor alvo muito alto';
    }

    // Validar valor atual
    const currentValue = parseFloat(currentAmount) || 0;
    if (currentValue < 0) {
      newErrors.currentAmount = 'Valor atual não pode ser negativo';
    } else if (currentValue > targetValue) {
      newErrors.currentAmount = 'Valor atual não pode ser maior que o valor alvo';
    }

    // Validar categoria
    if (!categoryId) {
      newErrors.categoryId = 'Categoria é obrigatória';
    } else {
      const category = getSelectedCategory();
      if (!category) {
        newErrors.categoryId = 'Categoria inválida';
      }
    }

    // Validar data alvo
    const today = new Date();
    const minDate = new Date();
    minDate.setDate(today.getDate() + 1); // Pelo menos amanhã

    const maxDate = new Date();
    maxDate.setFullYear(today.getFullYear() + 10); // Máximo 10 anos

    if (targetDate < minDate) {
      newErrors.targetDate = 'Data alvo deve ser pelo menos amanhã';
    } else if (targetDate > maxDate) {
      newErrors.targetDate = 'Data alvo não pode ser mais de 10 anos no futuro';
    }

    return newErrors;
  };

  /**
   * Função para salvar meta financeira
   */
  const handleSave = async () => {
    try {
      setErrors({});
      
      const formErrors = validateForm();
      if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        return;
      }

      setIsSubmitting(true);

      // Preparar dados da meta
      const goalData = {
        name: name.trim(),
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount) || 0,
        category_id: parseInt(categoryId),
        target_date: targetDate.toISOString().split('T')[0], // Formato YYYY-MM-DD
      };

      if (isEditing) {
        const result = await updateFinancialGoal(goal.id, goalData);
        if (result && result.success === false) {
          throw new Error(result.error || 'Erro ao atualizar meta');
        }
        Alert.alert('Sucesso', 'Meta atualizada com sucesso!');
      } else {
        const result = await addFinancialGoal(goalData);
        if (result && result.success === false) {
          throw new Error(result.error || 'Erro ao criar meta');
        }
        Alert.alert('Sucesso', 'Meta criada com sucesso!');
      }

      navigation.goBack();

    } catch (error) {
      Alert.alert('Erro', error.message || 'Erro ao salvar meta');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Modal para seleção de categoria
   */
  const CategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Selecionar Categoria</Text>
          <TouchableOpacity
            onPress={() => setShowCategoryModal(false)}
            style={styles.modalCloseButton}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.modalItem,
                categoryId === category.id.toString() && styles.modalItemSelected
              ]}
              onPress={() => {
                setCategoryId(category.id.toString());
                setShowCategoryModal(false);
              }}
            >
              <View style={styles.categoryItem}>
                <View style={[styles.categoryColor, { backgroundColor: category.color }]} />
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={[
                  styles.categoryType,
                  { color: category.type === 'income' ? '#4CAF50' : '#F44336' }
                ]}>
                  {category.type === 'income' ? 'Receita' : 'Despesa'}
                </Text>
              </View>
              {categoryId === category.id.toString() && (
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}

          {categories.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Nenhuma categoria encontrada</Text>
              <TouchableOpacity
                style={styles.addCategoryButton}
                onPress={() => {
                  setShowCategoryModal(false);
                  navigation.navigate('Categories', {
                    screen: 'AddCategory'
                  });
                }}
              >
                <Text style={styles.addCategoryButtonText}>Criar Nova Categoria</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  /**
   * Componente para mostrar estatísticas da meta
   */
  const GoalStats = () => {
    const stats = calculateGoalStats();

    if (!targetAmount || !targetDate) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Estatísticas da Meta</Text>
        
        {/* Progresso */}
        <View style={styles.statRow}>
          <View style={styles.statIcon}>
            <Ionicons 
              name="analytics" 
              size={20} 
              color={stats.isCompleted ? '#4CAF50' : '#007AFF'} 
            />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Progresso</Text>
            <Text style={[
              styles.statValue,
              { color: stats.isCompleted ? '#4CAF50' : '#007AFF' }
            ]}>
              {stats.progress.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Dias restantes */}
        <View style={styles.statRow}>
          <View style={styles.statIcon}>
            <Ionicons 
              name="calendar" 
              size={20} 
              color={stats.isOverdue ? '#F44336' : '#666'} 
            />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Dias restantes</Text>
            <Text style={[
              styles.statValue,
              { color: stats.isOverdue ? '#F44336' : '#666' }
            ]}>
              {stats.isOverdue ? 'Vencida' : `${stats.daysRemaining} dias`}
            </Text>
          </View>
        </View>

        {/* Valor restante */}
        <View style={styles.statRow}>
          <View style={styles.statIcon}>
            <Ionicons name="cash" size={20} color="#FF9800" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Valor restante</Text>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>
              {formatCurrency(stats.remainingAmount)}
            </Text>
          </View>
        </View>

        {/* Valor mensal necessário */}
        {!stats.isCompleted && !stats.isOverdue && (
          <View style={styles.statRow}>
            <View style={styles.statIcon}>
              <Ionicons name="trending-up" size={20} color="#9C27B0" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Necessário por mês</Text>
              <Text style={[styles.statValue, { color: '#9C27B0' }]}>
                {formatCurrency(stats.monthlyNeeded)}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  /**
   * Componente com dicas sobre metas financeiras
   */
  const GoalTips = () => (
    <View style={styles.tipsContainer}>
      <Text style={styles.tipsTitle}>💡 Dicas para Metas Financeiras</Text>
      
      <View style={styles.tip}>
        <Text style={styles.tipTitle}>Seja Específico:</Text>
        <Text style={styles.tipText}>
          "Comprar um carro" é melhor que "juntar dinheiro".
        </Text>
      </View>
      
      <View style={styles.tip}>
        <Text style={styles.tipTitle}>Defina Prazos Realistas:</Text>
        <Text style={styles.tipText}>
          Metas muito apertadas podem causar frustração.
        </Text>
      </View>
      
      <View style={styles.tip}>
        <Text style={styles.tipTitle}>Acompanhe o Progresso:</Text>
        <Text style={styles.tipText}>
          Atualize o valor atual regularmente para manter a motivação.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar Meta' : 'Nova Meta'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Preview da meta */}
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

        {/* Campo de nome */}
        <View style={styles.section}>
          <Text style={styles.label}>Nome da Meta</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Reserva de emergência, Viagem para Europa..."
            placeholderTextColor="#999"
            maxLength={100}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Campo de valor alvo */}
        <View style={styles.section}>
          <Text style={styles.label}>Valor Alvo</Text>
          <TextInput
            style={[styles.input, errors.targetAmount && styles.inputError]}
            value={targetAmount}
            onChangeText={setTargetAmount}
            placeholder="0,00"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
          {errors.targetAmount && <Text style={styles.errorText}>{errors.targetAmount}</Text>}
        </View>

        {/* Campo de valor atual */}
        <View style={styles.section}>
          <Text style={styles.label}>Valor Atual (Opcional)</Text>
          <TextInput
            style={[styles.input, errors.currentAmount && styles.inputError]}
            value={currentAmount}
            onChangeText={setCurrentAmount}
            placeholder="0,00"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>
            Quanto você já tem poupado para esta meta?
          </Text>
          {errors.currentAmount && <Text style={styles.errorText}>{errors.currentAmount}</Text>}
        </View>

        {/* Seleção de categoria */}
        <View style={styles.section}>
          <Text style={styles.label}>Categoria Relacionada</Text>
          <TouchableOpacity
            style={[styles.selector, errors.categoryId && styles.inputError]}
            onPress={() => setShowCategoryModal(true)}
          >
            {getSelectedCategory() ? (
              <View style={styles.selectedItem}>
                <View style={[styles.categoryColor, { backgroundColor: getSelectedCategory().color }]} />
                <Text style={styles.selectedText}>{getSelectedCategory().name}</Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>Selecionar categoria</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          {errors.categoryId && <Text style={styles.errorText}>{errors.categoryId}</Text>}
        </View>

        {/* Seleção de data */}
        <View style={styles.section}>
          <Text style={styles.label}>Data Alvo</Text>
          <TouchableOpacity
            style={[styles.selector, errors.targetDate && styles.inputError]}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.selectedItem}>
              <Ionicons name="calendar" size={16} color="#007AFF" />
              <Text style={styles.selectedText}>{formatDate(targetDate)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          {errors.targetDate && <Text style={styles.errorText}>{errors.targetDate}</Text>}
        </View>

        {/* Estatísticas da meta */}
        <GoalStats />

        {/* Dicas educativas */}
        <GoalTips />

        {/* Botão de salvar */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            isSaving && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Atualizar Meta' : 'Criar Meta'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de categoria */}
      <CategoryModal />

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={targetDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setTargetDate(selectedDate);
            }
          }}
        />
      )}
    </View>
  );
}

/**
 * ESTILOS DO COMPONENTE
 * Organizados por funcionalidade para facilitar manutenção
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
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
  },

  // Preview da meta
  previewContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  preview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  previewName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  previewAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  previewDate: {
    fontSize: 14,
    color: '#666',
  },

  // Seções do formulário
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },

  // Campos de entrada
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputError: {
    borderColor: '#F44336',
  },

  // Seletores
  selector: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },

  // Categoria
  categoryColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  categoryType: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Estatísticas da meta
  statsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 40,
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Modais
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalContent: {
    flex: 1,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalItemSelected: {
    backgroundColor: '#F0F8FF',
  },

  // Estados vazios
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  addCategoryButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  addCategoryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Dicas educativas
  tipsContainer: {
    backgroundColor: '#E8F5E8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 15,
  },
  tip: {
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#388E3C',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#4CAF50',
    lineHeight: 18,
  },

  // Botão de salvar
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Mensagens de erro
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 5,
  },
});
