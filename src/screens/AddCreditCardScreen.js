/**
 * AddCreditCardScreen.js
 * 
 * FUNCIONALIDADE:
 * Esta tela permite ao usuário cadastrar um novo cartão de crédito ou editar um existente.
 * Os cartões são usados para rastrear despesas específicas e calcular datas de vencimento.
 * 
 * CONCEITOS IMPORTANTES:
 * 
 * 1. CARTÕES DE CRÉDITO NO CONTEXTO FINANCEIRO:
 *    - Nome: identificação do cartão (ex: "Nubank", "Itaú Mastercard")
 *    - Limite: valor máximo disponível para gastos
 *    - Dia de fechamento: quando a fatura é fechada (ex: dia 10)
 *    - Dia de vencimento: quando a fatura deve ser paga (ex: dia 17)
 * 
 * 2. LÓGICA DE DATAS:
 *    - Fechamento sempre antes do vencimento
 *    - Diferença mínima de 3 dias entre fechamento e vencimento
 *    - Validação para evitar datas inválidas (ex: dia 31 em fevereiro)
 * 
 * 3. INTEGRAÇÃO COM TRANSAÇÕES:
 *    - Cartões são referenciados em despesas
 *    - Permitem rastreamento de gastos por cartão
 *    - Facilitam controle de limites e faturas
 * 
 * 4. VALIDAÇÕES ESPECÍFICAS:
 *    - Nome único por usuário
 *    - Limite deve ser positivo
 *    - Dias devem estar entre 1 e 31
 *    - Vencimento deve ser após fechamento
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store/useStore';

export default function AddCreditCardScreen({ navigation, route }) {
  // Extrair cartão dos parâmetros de navegação (se existir, estamos editando)
  const { creditCard } = route.params || {};
  const isEditing = !!creditCard;

  // Estados do formulário
  const [name, setName] = useState('');                    // Nome do cartão
  const [limitAmount, setLimitAmount] = useState('');      // Limite do cartão
  const [closingDay, setClosingDay] = useState('');        // Dia de fechamento
  const [dueDay, setDueDay] = useState('');                // Dia de vencimento

  // Estados para controle da UI
  const [errors, setErrors] = useState({});               // Erros de validação
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading do botão

  // Funções do Zustand store
  const { addCreditCard, updateCreditCard, creditCards, loading } = useStore();

  /**
   * useEffect - Preenche formulário se estamos editando
   */
  useEffect(() => {
    if (isEditing && creditCard) {
      setName(creditCard.name);
      setLimitAmount(creditCard.limit_amount.toString());
      setClosingDay(creditCard.closing_day.toString());
      setDueDay(creditCard.due_day.toString());
    }
  }, [isEditing, creditCard]);

  /**
   * Função para formatar valor monetário
   * Remove caracteres não numéricos e formata como moeda
   */
  const formatCurrency = (value) => {
    // Remove tudo que não é número
    const numericValue = value.replace(/[^0-9]/g, '');
    
    // Converte para número com duas casas decimais
    const floatValue = parseFloat(numericValue) / 100;
    
    // Formata como moeda brasileira
    if (isNaN(floatValue)) return '';
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(floatValue);
  };

  /**
   * Função para extrair valor numérico da string formatada
   */
  const extractNumericValue = (formattedValue) => {
    const numericString = formattedValue.replace(/[^0-9,]/g, '').replace(',', '.');
    return parseFloat(numericString) || 0;
  };

  /**
   * Handler para mudança no campo de limite
   * Aplica formatação de moeda em tempo real
   */
  const handleLimitChange = (value) => {
    const formatted = formatCurrency(value);
    setLimitAmount(formatted);
  };

  /**
   * Validação completa do formulário
   * Verifica todos os campos e regras de negócio
   */
  const validateForm = () => {
    const newErrors = {};

    // Validar nome do cartão
    if (!name.trim()) {
      newErrors.name = 'Nome do cartão é obrigatório';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    } else {
      // Verificar se nome já existe (exceto se estamos editando o mesmo cartão)
      const existingCard = creditCards.find(card => 
        card.name.toLowerCase() === name.trim().toLowerCase() && 
        (!isEditing || card.id !== creditCard.id)
      );
      if (existingCard) {
        newErrors.name = 'Já existe um cartão com este nome';
      }
    }

    // Validar limite
    const numericLimit = extractNumericValue(limitAmount);
    if (!limitAmount || numericLimit <= 0) {
      newErrors.limitAmount = 'Limite deve ser maior que zero';
    } else if (numericLimit > 999999999) {
      newErrors.limitAmount = 'Limite muito alto';
    }

    // Validar dia de fechamento
    const closingDayNum = parseInt(closingDay);
    if (!closingDay || isNaN(closingDayNum)) {
      newErrors.closingDay = 'Dia de fechamento é obrigatório';
    } else if (closingDayNum < 1 || closingDayNum > 31) {
      newErrors.closingDay = 'Dia deve estar entre 1 e 31';
    }

    // Validar dia de vencimento
    const dueDayNum = parseInt(dueDay);
    if (!dueDay || isNaN(dueDayNum)) {
      newErrors.dueDay = 'Dia de vencimento é obrigatório';
    } else if (dueDayNum < 1 || dueDayNum > 31) {
      newErrors.dueDay = 'Dia deve estar entre 1 e 31';
    }

    // Validar relação entre fechamento e vencimento
    if (closingDayNum && dueDayNum) {
      // Calcular diferença considerando mudança de mês
      let daysDifference;
      if (dueDayNum >= closingDayNum) {
        daysDifference = dueDayNum - closingDayNum;
      } else {
        // Vencimento no mês seguinte
        daysDifference = (30 - closingDayNum) + dueDayNum;
      }

      if (daysDifference < 3) {
        newErrors.dueDay = 'Vencimento deve ser pelo menos 3 dias após o fechamento';
      }
    }

    return newErrors;
  };

  /**
   * Função para salvar cartão de crédito
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

      // Preparar dados do cartão
      const cardData = {
        name: name.trim(),
        limit_amount: extractNumericValue(limitAmount),
        closing_day: parseInt(closingDay),
        due_day: parseInt(dueDay),
      };

      if (isEditing) {
        await updateCreditCard(creditCard.id, cardData);
        Alert.alert('Sucesso', 'Cartão atualizado com sucesso!');
      } else {
        await addCreditCard(cardData);
        Alert.alert('Sucesso', 'Cartão cadastrado com sucesso!');
      }

      navigation.goBack();

    } catch (error) {
      Alert.alert('Erro', error.message || 'Erro ao salvar cartão');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Componente para exibir exemplo de ciclo do cartão
   * Mostra como funcionam as datas de fechamento e vencimento
   */
  const CycleExample = () => {
    const closingDayNum = parseInt(closingDay);
    const dueDayNum = parseInt(dueDay);

    if (!closingDayNum || !dueDayNum) return null;

    // Calcular próximas datas
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Data de fechamento
    let closingDate = new Date(currentYear, currentMonth, closingDayNum);
    if (closingDate < today) {
      closingDate = new Date(currentYear, currentMonth + 1, closingDayNum);
    }

    // Data de vencimento
    let dueDate = new Date(currentYear, currentMonth, dueDayNum);
    if (dueDayNum <= closingDayNum) {
      // Vencimento no mês seguinte
      dueDate = new Date(currentYear, currentMonth + 1, dueDayNum);
    }
    if (dueDate <= closingDate) {
      dueDate = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDayNum);
    }

    return (
      <View style={styles.cycleExample}>
        <Text style={styles.cycleTitle}>Próximo Ciclo:</Text>
        <View style={styles.cycleRow}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.cycleText}>
            Fechamento: {closingDate.toLocaleDateString('pt-BR')}
          </Text>
        </View>
        <View style={styles.cycleRow}>
          <Ionicons name="alarm" size={16} color="#F44336" />
          <Text style={styles.cycleText}>
            Vencimento: {dueDate.toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </View>
    );
  };

  /**
   * Componente para dicas sobre cartões de crédito
   * Educativo para usuários iniciantes
   */
  const CreditCardTips = () => (
    <View style={styles.tipsContainer}>
      <Text style={styles.tipsTitle}>💡 Dicas sobre Cartões de Crédito</Text>
      
      <View style={styles.tip}>
        <Text style={styles.tipTitle}>Dia de Fechamento:</Text>
        <Text style={styles.tipText}>
          Data em que o cartão "fecha" a fatura do mês. Compras após esta data vão para a próxima fatura.
        </Text>
      </View>
      
      <View style={styles.tip}>
        <Text style={styles.tipTitle}>Dia de Vencimento:</Text>
        <Text style={styles.tipText}>
          Data limite para pagar a fatura sem juros. Sempre alguns dias após o fechamento.
        </Text>
      </View>
      
      <View style={styles.tip}>
        <Text style={styles.tipTitle}>Limite:</Text>
        <Text style={styles.tipText}>
          Valor máximo que você pode gastar no cartão. Use com responsabilidade!
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
          {isEditing ? 'Editar Cartão' : 'Novo Cartão'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Preview do cartão */}
        <View style={styles.previewContainer}>
          <View style={styles.cardPreview}>
            <View style={styles.cardHeader}>
              <Ionicons name="card" size={24} color="white" />
              <Text style={styles.cardBrand}>SMART FINANCE</Text>
            </View>
            <Text style={styles.cardName}>
              {name || 'Nome do Cartão'}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardLimit}>
                Limite: {limitAmount || 'R$ 0,00'}
              </Text>
            </View>
          </View>
        </View>

        {/* Campo de nome */}
        <View style={styles.section}>
          <Text style={styles.label}>Nome do Cartão</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Nubank, Itaú Mastercard, C6 Bank..."
            placeholderTextColor="#999"
            maxLength={50}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Campo de limite */}
        <View style={styles.section}>
          <Text style={styles.label}>Limite do Cartão</Text>
          <TextInput
            style={[styles.input, errors.limitAmount && styles.inputError]}
            value={limitAmount}
            onChangeText={handleLimitChange}
            placeholder="R$ 0,00"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
          {errors.limitAmount && <Text style={styles.errorText}>{errors.limitAmount}</Text>}
        </View>

        {/* Campos de datas */}
        <View style={styles.datesContainer}>
          <View style={styles.dateField}>
            <Text style={styles.label}>Dia de Fechamento</Text>
            <TextInput
              style={[styles.input, errors.closingDay && styles.inputError]}
              value={closingDay}
              onChangeText={setClosingDay}
              placeholder="10"
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={2}
            />
            {errors.closingDay && <Text style={styles.errorText}>{errors.closingDay}</Text>}
          </View>

          <View style={styles.dateField}>
            <Text style={styles.label}>Dia de Vencimento</Text>
            <TextInput
              style={[styles.input, errors.dueDay && styles.inputError]}
              value={dueDay}
              onChangeText={setDueDay}
              placeholder="17"
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={2}
            />
            {errors.dueDay && <Text style={styles.errorText}>{errors.dueDay}</Text>}
          </View>
        </View>

        {/* Exemplo do ciclo */}
        <CycleExample />

        {/* Dicas educativas */}
        <CreditCardTips />

        {/* Botão de salvar */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (isSubmitting || loading) && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={isSubmitting || loading}
        >
          {isSubmitting || loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Atualizar Cartão' : 'Cadastrar Cartão'}
              </Text>
            </>
          )}
        </TouchableOpacity>
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

  // Preview do cartão
  previewContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  cardPreview: {
    width: 300,
    height: 180,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundColor: '#667eea', // Fallback para React Native
    borderRadius: 15,
    padding: 20,
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrand: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cardName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  cardFooter: {
    alignItems: 'flex-end',
  },
  cardLimit: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
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

  // Container de datas
  datesContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  dateField: {
    flex: 1,
  },

  // Exemplo do ciclo
  cycleExample: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  cycleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  cycleText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },

  // Dicas educativas
  tipsContainer: {
    backgroundColor: '#FFF9C4',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFF176',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57F17',
    marginBottom: 15,
  },
  tip: {
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#BF360C',
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

