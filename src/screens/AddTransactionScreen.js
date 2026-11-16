/**
 * AddTransactionScreen.js
 * 
 * FUNCIONALIDADE:
 * Esta tela permite ao usuário registrar uma nova transação (receita ou despesa) ou editar uma existente.
 * As transações são o coração do sistema financeiro, registrando todas as movimentações de dinheiro.
 * 
 * CONCEITOS IMPORTANTES:
 * 
 * 1. TRANSAÇÕES FINANCEIRAS:
 *    - Receitas: dinheiro que entra (salário, vendas, etc.)
 *    - Despesas: dinheiro que sai (compras, contas, etc.)
 *    - Cada transação tem: descrição, valor, categoria, data e opcionalmente cartão de crédito
 * 
 * 2. RELACIONAMENTOS NO BANCO:
 *    - transaction.category_id → categories.id (obrigatório)
 *    - transaction.credit_card_id → credit_cards.id (opcional, só para despesas)
 * 
 * 3. VALIDAÇÕES ESPECÍFICAS:
 *    - Valor deve ser positivo (o tipo define se é entrada ou saída)
 *    - Data não pode ser futura demais
 *    - Categoria deve existir e ser do tipo correto
 *    - Cartão só pode ser usado em despesas
 * 
 * 4. UX CONSIDERATIONS:
 *    - Formulário adapta-se ao tipo (receita/despesa)
 *    - Seleção de categoria filtrada por tipo
 *    - Cartão de crédito só aparece para despesas
 *    - Preview do valor formatado em tempo real
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import useStore from '../store/useStore';

export default function AddTransactionScreen({ navigation, route }) {
  // Extrair parâmetros de navegação
  const { transaction, type: initialType } = route.params || {};
  const isEditing = !!transaction;

  // Estados do formulário
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState(initialType || 'expense');
  const [categoryId, setCategoryId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [pendingTransactionDate, setPendingTransactionDate] = useState(new Date());
  
  // Estados para controle da UI
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCreditCardModal, setShowCreditCardModal] = useState(false);

  // Dados do store
  const {
    categories,
    creditCards,
    addTransaction,
    updateTransaction,
    loadCategories,
    loadCreditCards,
    loading,
  } = useStore();
  const isSaving = isSubmitting || loading.transactions;

  /**
   * useEffect - Carrega dados necessários e preenche formulário se editando
   */
  useEffect(() => {
    loadCategories();
    loadCreditCards();

    if (isEditing && transaction) {
      setDescription(transaction.description);
      setAmount(transaction.amount.toString());
      setType(transaction.type);
      setCategoryId(transaction.category_id.toString());
      setCreditCardId(transaction.credit_card_id?.toString() || '');
      setTransactionDate(new Date(transaction.transaction_date));
    }
  }, [isEditing, transaction]);

  /**
   * Função para formatar valor monetário
   * Converte número para formato brasileiro (R$ 1.234,56)
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
   * Converte Date para string no formato brasileiro
   */
  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR');
  };

  /**
   * Filtrar categorias por tipo
   * Só mostra categorias compatíveis com o tipo de transação
   */
  const getFilteredCategories = () => {
    return categories.filter(category => category.type === type);
  };

  /**
   * Buscar categoria selecionada
   * Retorna objeto da categoria ou null se não encontrada
   */
  const getSelectedCategory = () => {
    return categories.find(cat => cat.id.toString() === categoryId);
  };

  /**
   * Buscar cartão selecionado
   * Retorna objeto do cartão ou null se não encontrado
   */
  const getSelectedCreditCard = () => {
    return creditCards.find(card => card.id.toString() === creditCardId);
  };

  /**
   * Validação completa do formulário
   * Verifica todos os campos e retorna objeto com erros
   */
  const validateForm = () => {
    const newErrors = {};

    // Validar descrição
    if (!description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    } else if (description.trim().length < 3) {
      newErrors.description = 'Descrição deve ter pelo menos 3 caracteres';
    }

    // Validar valor
    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount)) {
      newErrors.amount = 'Valor é obrigatório e deve ser um número';
    } else if (numericAmount <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    } else if (numericAmount > 999999999) {
      newErrors.amount = 'Valor muito alto';
    }

    // Validar categoria
    if (!categoryId) {
      newErrors.categoryId = 'Categoria é obrigatória';
    } else {
      const category = getSelectedCategory();
      if (!category) {
        newErrors.categoryId = 'Categoria inválida';
      } else if (category.type !== type) {
        newErrors.categoryId = 'Categoria não compatível com o tipo de transação';
      }
    }

    // Validar data
    const today = new Date();
    const maxFutureDate = new Date();
    maxFutureDate.setDate(today.getDate() + 30); // Máximo 30 dias no futuro

    if (transactionDate > maxFutureDate) {
      newErrors.transactionDate = 'Data não pode ser mais de 30 dias no futuro';
    }

    // Validar cartão de crédito (se selecionado)
    if (creditCardId && type === 'income') {
      newErrors.creditCardId = 'Cartão de crédito não pode ser usado em receitas';
    }

    return newErrors;
  };

  /**
   * Função para salvar transação
   * Executa validação, chama função do store e navega de volta
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

      // Preparar dados da transação
      const transactionData = {
        description: description.trim(),
        amount: parseFloat(amount),
        type,
        category_id: parseInt(categoryId),
        credit_card_id: creditCardId ? parseInt(creditCardId) : null,
        transaction_date: transactionDate.toISOString().split('T')[0], // Formato YYYY-MM-DD
      };

      if (isEditing) {
        const result = await updateTransaction(transaction.id, transactionData);
        if (result && result.success === false) {
          throw new Error(result.error || 'Erro ao atualizar transação');
        }
        Alert.alert('Sucesso', 'Transação atualizada com sucesso!');
      } else {
        const result = await addTransaction(transactionData);
        if (result && result.success === false) {
          throw new Error(result.error || 'Erro ao registrar transação');
        }
        Alert.alert('Sucesso', 'Transação registrada com sucesso!');
      }

      navigation.goBack();

    } catch (error) {
      Alert.alert('Erro', error.message || 'Erro ao salvar transação');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Componente para seleção de tipo (Receita/Despesa)
   */
  const TypeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.label}>Tipo da Transação</Text>
      <View style={styles.typeContainer}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            type === 'income' && styles.typeButtonActive,
            { borderColor: '#4CAF50' }
          ]}
          onPress={() => {
            setType('income');
            setCategoryId(''); // Limpar categoria ao mudar tipo
            setCreditCardId(''); // Limpar cartão ao mudar para receita
          }}
        >
          <Ionicons 
            name="trending-up" 
            size={20} 
            color={type === 'income' ? 'white' : '#4CAF50'} 
          />
          <Text style={[
            styles.typeButtonText,
            type === 'income' && styles.typeButtonTextActive
          ]}>
            Receita
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            type === 'expense' && styles.typeButtonActive,
            { borderColor: '#F44336' }
          ]}
          onPress={() => {
            setType('expense');
            setCategoryId(''); // Limpar categoria ao mudar tipo
          }}
        >
          <Ionicons 
            name="trending-down" 
            size={20} 
            color={type === 'expense' ? 'white' : '#F44336'} 
          />
          <Text style={[
            styles.typeButtonText,
            type === 'expense' && styles.typeButtonTextActive
          ]}>
            Despesa
          </Text>
        </TouchableOpacity>
      </View>
      {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
    </View>
  );

  /**
   * Modal para seleção de categoria
   * Mostra apenas categorias do tipo correto
   */
  const CategoryModal = () => {
    const filteredCategories = getFilteredCategories();

    return (
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
            {filteredCategories.map((category) => (
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
                </View>
                {categoryId === category.id.toString() && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}

            {filteredCategories.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Nenhuma categoria de {type === 'income' ? 'receita' : 'despesa'} encontrada
                </Text>
                <TouchableOpacity
                  style={styles.addCategoryButton}
                  onPress={() => {
                    setShowCategoryModal(false);
                    navigation.navigate('Categories', {
                      screen: 'AddCategory',
                      params: { type }
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
  };

  /**
   * Modal para seleção de cartão de crédito
   * Só aparece para despesas
   */
  const CreditCardModal = () => (
    <Modal
      visible={showCreditCardModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Selecionar Cartão</Text>
          <TouchableOpacity
            onPress={() => setShowCreditCardModal(false)}
            style={styles.modalCloseButton}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Opção "Nenhum cartão" */}
          <TouchableOpacity
            style={[
              styles.modalItem,
              !creditCardId && styles.modalItemSelected
            ]}
            onPress={() => {
              setCreditCardId('');
              setShowCreditCardModal(false);
            }}
          >
            <Text style={styles.categoryName}>Nenhum cartão (Dinheiro/Débito)</Text>
            {!creditCardId && (
              <Ionicons name="checkmark" size={20} color="#007AFF" />
            )}
          </TouchableOpacity>

          {creditCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.modalItem,
                creditCardId === card.id.toString() && styles.modalItemSelected
              ]}
              onPress={() => {
                setCreditCardId(card.id.toString());
                setShowCreditCardModal(false);
              }}
            >
              <View style={styles.cardItem}>
                <Ionicons name="card" size={20} color="#007AFF" />
                <Text style={styles.categoryName}>{card.name}</Text>
              </View>
              {creditCardId === card.id.toString() && (
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}

          {creditCards.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Nenhum cartão cadastrado</Text>
              <TouchableOpacity
                style={styles.addCategoryButton}
                onPress={() => {
                  setShowCreditCardModal(false);
                  navigation.navigate('CreditCards', {
                    screen: 'AddCreditCard'
                  });
                }}
              >
                <Text style={styles.addCategoryButtonText}>Cadastrar Cartão</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
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
          {isEditing ? 'Editar Transação' : 'Nova Transação'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Preview da transação */}
        <View style={styles.previewContainer}>
          <View style={[
            styles.preview,
            { backgroundColor: type === 'income' ? '#4CAF50' : '#F44336' }
          ]}>
            <Ionicons 
              name={type === 'income' ? 'trending-up' : 'trending-down'} 
              size={32} 
              color="white" 
            />
          </View>
          <Text style={styles.previewAmount}>
            {amount ? formatCurrency(amount) : 'R$ 0,00'}
          </Text>
          <Text style={styles.previewDescription}>
            {description || 'Descrição da transação'}
          </Text>
        </View>

        {/* Seletor de tipo */}
        <TypeSelector />

        {/* Campo de descrição */}
        <View style={styles.section}>
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={[styles.input, errors.description && styles.inputError]}
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: Compra no supermercado, Salário do mês..."
            placeholderTextColor="#999"
            maxLength={100}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        {/* Campo de valor */}
        <View style={styles.section}>
          <Text style={styles.label}>Valor</Text>
          <TextInput
            style={[styles.input, errors.amount && styles.inputError]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0,00"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
          {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
        </View>

        {/* Seleção de categoria */}
        <View style={styles.section}>
          <Text style={styles.label}>Categoria</Text>
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

        {/* Seleção de cartão (só para despesas) */}
        {type === 'expense' && (
          <View style={styles.section}>
            <Text style={styles.label}>Cartão de Crédito (Opcional)</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowCreditCardModal(true)}
            >
              {getSelectedCreditCard() ? (
                <View style={styles.selectedItem}>
                  <Ionicons name="card" size={16} color="#007AFF" />
                  <Text style={styles.selectedText}>{getSelectedCreditCard().name}</Text>
                </View>
              ) : (
                <Text style={styles.placeholderText}>Dinheiro/Débito</Text>
              )}
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* Seleção de data */}
        <View style={styles.section}>
          <Text style={styles.label}>Data da Transação</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => {
              setPendingTransactionDate(transactionDate);
              setShowDatePicker(true);
            }}
          >
            <View style={styles.selectedItem}>
              <Ionicons name="calendar" size={16} color="#007AFF" />
              <Text style={styles.selectedText}>{formatDate(transactionDate)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          {errors.transactionDate && <Text style={styles.errorText}>{errors.transactionDate}</Text>}
        </View>

        {/* Botão de salvar */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: type === 'income' ? '#4CAF50' : '#F44336' },
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
                {isEditing ? 'Atualizar Transação' : 'Registrar Transação'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modais */}
      <CategoryModal />
      <CreditCardModal />

      {/* Date Picker */}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerActions}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerActionText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setTransactionDate(pendingTransactionDate);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.datePickerActionText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pendingTransactionDate}
                mode="date"
                display="spinner"
                onChange={(_, selectedDate) => {
                  if (selectedDate) {
                    setPendingTransactionDate(selectedDate);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={transactionDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (event.type === 'set' && selectedDate) {
              setTransactionDate(selectedDate);
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

  // Preview da transação
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  previewAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  previewDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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

  // Seletores (categoria, cartão, data)
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

  // Seletor de tipo
  typeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: 'white',
  },
  typeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  typeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: 'white',
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
  },
  categoryName: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
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

  // Botão de salvar
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  datePickerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  datePickerActionText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Mensagens de erro
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 5,
  },
});
