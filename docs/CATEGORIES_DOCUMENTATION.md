# Sistema de Categorias - Documentação Detalhada

## Visão Geral

O sistema de categorias é fundamental para organizar receitas e despesas no Smart Finance. Ele permite que os usuários classifiquem suas transações financeiras de forma personalizada, facilitando análises e relatórios posteriores.

## Arquivos Relacionados

### 1. `src/screens/CategoriesScreen.js`
**Função**: Tela principal que lista todas as categorias cadastradas

**Funcionalidades principais:**
- Exibe categorias separadas por tipo (Receitas e Despesas)
- Permite navegação para adicionar nova categoria
- Permite editar categoria existente (toque simples)
- Permite excluir categoria (toque longo)
- Atualização automática da lista via pull-to-refresh

**Conceitos importantes:**
```javascript
// Separação de categorias por tipo
const incomeCategories = categories.filter(cat => cat.type === 'income');
const expenseCategories = categories.filter(cat => cat.type === 'expense');
```

### 2. `src/screens/AddCategoryScreen.js`
**Função**: Formulário para criar ou editar categorias

**Funcionalidades principais:**
- Formulário com validação completa
- Preview em tempo real da categoria
- Seleção visual de cores e ícones
- Modo de edição quando recebe parâmetros de navegação

**Estados do formulário:**
```javascript
const [name, setName] = useState('');           // Nome da categoria
const [type, setType] = useState('expense');    // Tipo: 'income' ou 'expense'
const [color, setColor] = useState('#007AFF');  // Cor para identificação
const [icon, setIcon] = useState('folder');     // Ícone da categoria
```

## Fluxo de Dados

### 1. Carregamento de Categorias
```
CategoriesScreen → useStore.loadCategories() → database.fetchData() → SQLite
```

### 2. Criação de Nova Categoria
```
AddCategoryScreen → useStore.addCategory() → database.executeQuery() → SQLite
```

### 3. Atualização de Categoria
```
AddCategoryScreen → useStore.updateCategory() → database.executeQuery() → SQLite
```

## Validações Implementadas

### Validação de Nome
- Campo obrigatório
- Mínimo de 2 caracteres
- Máximo de 50 caracteres
- Remove espaços em branco no início e fim

### Validação de Tipo
- Deve ser 'income' (receita) ou 'expense' (despesa)
- Validação no frontend e constraint no banco de dados

### Validação Visual
- Cores predefinidas para consistência visual
- Ícones predefinidos para melhor UX
- Preview em tempo real das escolhas

## Estrutura do Banco de Dados

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- Nome da categoria
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')), -- Tipo com constraint
  color TEXT DEFAULT '#007AFF',          -- Cor em formato hexadecimal
  icon TEXT DEFAULT 'folder',            -- Nome do ícone (Ionicons)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Categorias Padrão

O sistema inclui categorias pré-cadastradas para facilitar o uso inicial:

**Receitas:**
- Salário (#4CAF50, attach-money)
- Freelance (#8BC34A, work)

**Despesas:**
- Alimentação (#FF5722, restaurant)
- Transporte (#2196F3, directions-car)
- Moradia (#9C27B0, home)
- Lazer (#FF9800, movie)

## Integração com Transações

As categorias são referenciadas nas transações através de chave estrangeira:

```sql
-- Na tabela transactions
category_id INTEGER NOT NULL,
FOREIGN KEY (category_id) REFERENCES categories (id)
```

Isso permite:
- Consultas JOIN para buscar nome e cor da categoria
- Análises por categoria
- Relatórios agrupados
- Gráficos de distribuição de gastos

## Padrões de Design

### Cores por Tipo
- **Receitas**: Tons de verde (#4CAF50, #8BC34A)
- **Despesas**: Tons de vermelho/laranja (#F44336, #FF5722)
- **Neutro**: Azul padrão (#007AFF)

### Ícones Semânticos
- `home`: Moradia, Casa
- `car`: Transporte, Veículos
- `restaurant`: Alimentação, Restaurantes
- `medical`: Saúde, Medicina
- `school`: Educação, Estudos
- `briefcase`: Trabalho, Negócios

## Tratamento de Erros

### Erros de Validação
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!name.trim()) {
    newErrors.name = 'Nome da categoria é obrigatório';
  }
  
  return newErrors;
};
```

### Erros de Banco de Dados
- Capturados no store (useStore.js)
- Exibidos via Alert para o usuário
- Logs no console para debug

### Feedback Visual
- Campos com erro ficam com borda vermelha
- Mensagens de erro aparecem abaixo dos campos
- Loading indicators durante operações assíncronas

## Boas Práticas Implementadas

1. **Separação de Responsabilidades**
   - Tela apenas para apresentação
   - Store para lógica de negócio
   - Database para persistência

2. **Validação Dupla**
   - Frontend para UX
   - Banco de dados para integridade

3. **Feedback Imediato**
   - Preview em tempo real
   - Validação durante digitação
   - Estados de loading

4. **Acessibilidade**
   - Cores contrastantes
   - Ícones descritivos
   - Textos legíveis

## Possíveis Melhorias Futuras

1. **Categorias Personalizadas**
   - Upload de ícones próprios
   - Seletor de cores livre
   - Subcategorias

2. **Importação/Exportação**
   - Backup de categorias
   - Compartilhamento entre dispositivos
   - Templates de categorias

3. **Análises Avançadas**
   - Categorias mais usadas
   - Sugestões baseadas em padrões
   - Metas por categoria

