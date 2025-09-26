/**
 * AddCategoryScreen.js
 * 
 * FUNCIONALIDADE:
 * Esta tela permite ao usuário criar uma nova categoria ou editar uma categoria existente.
 * As categorias são usadas para organizar receitas e despesas, facilitando a análise financeira.
 * 
 * CONCEITOS IMPORTANTES:
 * 
 * 1. FORMULÁRIOS EM REACT NATIVE:
 *    - Usamos useState para controlar o estado dos campos do formulário
 *    - Cada campo tem seu próprio estado (name, type, color, icon)
 *    - A validação é feita antes de enviar os dados
 * 
 * 2. NAVEGAÇÃO COM PARÂMETROS:
 *    - route.params permite receber dados da tela anterior
 *    - Se category existe em params, estamos editando; senão, criando
 * 
 * 3. ZUSTAND STORE:
 *    - addCategory: função para criar nova categoria
 *    - updateCategory: função para atualizar categoria existente
 *    - loading: estado para mostrar indicador de carregamento
 * 
 * 4. VALIDAÇÃO DE FORMULÁRIO:
 *    - Verificamos se todos os campos obrigatórios estão preenchidos
 *    - Mostramos mensagens de erro específicas para cada campo
 * 
 * 5. FEEDBACK VISUAL:
 *    - Alert para confirmar sucesso ou mostrar erros
 *    - Loading indicator durante operações assíncronas
 *    - Cores diferentes para receitas (verde) e despesas (vermelho)
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

export default function AddCategoryScreen({ navigation, route }) {
  // Extrair categoria dos parâmetros de navegação (se existir, estamos editando)
  const { category } = route.params || {};
  const isEditing = !!category; // Converte para boolean: true se category existe

  // Estados do formulário - cada campo tem seu próprio estado
  const [name, setName] = useState('');           // Nome da categoria
  const [type, setType] = useState('expense');    // Tipo: 'income' ou 'expense'
  const [color, setColor] = useState('#007AFF');  // Cor para identificação visual
  const [icon, setIcon] = useState('folder');     // Ícone da categoria

  // Estados para controle da UI
  const [errors, setErrors] = useState({});       // Armazena erros de validação
  const [isSubmitting, setIsSubmitting] = useState(false); // Controla loading do botão

  // Funções do Zustand store para manipular categorias
  const { addCategory, updateCategory, loading } = useStore();

  // Cores predefinidas para o usuário escolher
  const predefinedColors = [
    '#007AFF', '#4CAF50', '#F44336', '#FF9800', 
    '#9C27B0', '#2196F3', '#FF5722', '#795548',
    '#607D8B', '#E91E63', '#3F51B5', '#00BCD4'
  ];

  // Ícones predefinidos para categorias
  const predefinedIcons = [
    'folder', 'home', 'car', 'restaurant', 'medical',
    'school', 'fitness', 'game-controller', 'musical-notes',
    'airplane', 'gift', 'heart', 'briefcase', 'card'
  ];

  /**
   * useEffect - Hook que executa quando o componente é montado
   * Se estamos editando, preenche os campos com os dados da categoria existente
   */
  useEffect(() => {
    if (isEditing && category) {
      setName(category.name);
      setType(category.type);
      setColor(category.color);
      setIcon(category.icon);
    }
  }, [isEditing, category]);

  /**
   * Função de validação do formulário
   * Verifica se todos os campos obrigatórios estão preenchidos
   * Retorna um objeto com os erros encontrados
   */
  const validateForm = () => {
    const newErrors = {};

    // Validar nome da categoria
    if (!name.trim()) {
      newErrors.name = 'Nome da categoria é obrigatório';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    // Validar tipo (deve ser 'income' ou 'expense')
    if (!['income', 'expense'].includes(type)) {
      newErrors.type = 'Tipo deve ser Receita ou Despesa';
    }

    return newErrors;
  };

  /**
   * Função para salvar a categoria
   * Executa validação, chama a função apropriada do store e navega de volta
   */
  const handleSave = async () => {
    try {
      // Limpar erros anteriores
      setErrors({});
      
      // Validar formulário
      const formErrors = validateForm();
      if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        return;
      }

      // Mostrar loading
      setIsSubmitting(true);

      // Preparar dados da categoria
      const categoryData = {
        name: name.trim(),
        type,
        color,
        icon,
      };

      // Chamar função apropriada do store
      if (isEditing) {
        await updateCategory(category.id, categoryData);
        Alert.alert('Sucesso', 'Categoria atualizada com sucesso!');
      } else {
        await addCategory(categoryData);
        Alert.alert('Sucesso', 'Categoria criada com sucesso!');
      }

      // Voltar para a tela anterior
      navigation.goBack();

    } catch (error) {
      // Mostrar erro se algo deu errado
      Alert.alert('Erro', error.message || 'Erro ao salvar categoria');
    } finally {
      // Esconder loading
      setIsSubmitting(false);
    }
  };

  /**
   * Componente para seleção de tipo (Receita/Despesa)
   * Mostra dois botões com cores diferentes para cada tipo
   */
  const TypeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.label}>Tipo da Categoria</Text>
      <View style={styles.typeContainer}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            type === 'income' && styles.typeButtonActive,
            { borderColor: '#4CAF50' }
          ]}
          onPress={() => setType('income')}
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
          onPress={() => setType('expense')}
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
   * Componente para seleção de cor
   * Mostra uma grade de cores predefinidas
   */
  const ColorSelector = () => (
    <View style={styles.section}>
      <Text style={styles.label}>Cor da Categoria</Text>
      <View style={styles.colorGrid}>
        {predefinedColors.map((colorOption) => (
          <TouchableOpacity
            key={colorOption}
            style={[
              styles.colorOption,
              { backgroundColor: colorOption },
              color === colorOption && styles.colorOptionSelected
            ]}
            onPress={() => setColor(colorOption)}
          >
            {color === colorOption && (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  /**
   * Componente para seleção de ícone
   * Mostra uma grade de ícones predefinidos
   */
  const IconSelector = () => (
    <View style={styles.section}>
      <Text style={styles.label}>Ícone da Categoria</Text>
      <View style={styles.iconGrid}>
        {predefinedIcons.map((iconOption) => (
          <TouchableOpacity
            key={iconOption}
            style={[
              styles.iconOption,
              icon === iconOption && styles.iconOptionSelected
            ]}
            onPress={() => setIcon(iconOption)}
          >
            <Ionicons 
              name={iconOption} 
              size={24} 
              color={icon === iconOption ? color : '#666'} 
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header da tela */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Preview da categoria */}
        <View style={styles.previewContainer}>
          <View style={[styles.preview, { backgroundColor: color }]}>
            <Ionicons name={icon} size={32} color="white" />
          </View>
          <Text style={styles.previewText}>{name || 'Nome da Categoria'}</Text>
          <Text style={[
            styles.previewType,
            { color: type === 'income' ? '#4CAF50' : '#F44336' }
          ]}>
            {type === 'income' ? 'Receita' : 'Despesa'}
          </Text>
        </View>

        {/* Campo de nome */}
        <View style={styles.section}>
          <Text style={styles.label}>Nome da Categoria</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Alimentação, Salário, Transporte..."
            placeholderTextColor="#999"
            maxLength={50}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Seletor de tipo */}
        <TypeSelector />

        {/* Seletor de cor */}
        <ColorSelector />

        {/* Seletor de ícone */}
        <IconSelector />

        {/* Botão de salvar */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: color },
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
                {isEditing ? 'Atualizar Categoria' : 'Criar Categoria'}
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
 * 
 * Organizados por seção para facilitar manutenção:
 * - Layout geral (container, header, content)
 * - Componentes de formulário (input, button, etc.)
 * - Seletores específicos (type, color, icon)
 * - Estados de erro e loading
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
    width: 34, // Mesmo tamanho do botão de voltar para centralizar o título
  },
  content: {
    flex: 1,
    padding: 20,
  },

  // Preview da categoria
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
    marginBottom: 10,
  },
  previewText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  previewType: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Seções do formulário
  section: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },

  // Campo de entrada de texto
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

  // Seletor de cores
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#333',
  },

  // Seletor de ícones
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconOption: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  iconOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
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

  // Mensagens de erro
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 5,
  },
});

