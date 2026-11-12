# Smart Finance 💰

Um aplicativo React Native completo para controle financeiro pessoal, desenvolvido com as melhores práticas e tecnologias modernas.

## 📱 Sobre o Projeto

O Smart Finance é uma solução completa para gestão financeira pessoal que permite aos usuários:

- 📊 **Controlar receitas e despesas** por categorias personalizáveis
- 💳 **Gerenciar cartões de crédito** com datas de fechamento e vencimento
- 🎯 **Definir e acompanhar metas financeiras** com cálculos automáticos
- 📈 **Visualizar análises detalhadas** com gráficos interativos
- 💾 **Armazenar dados localmente** com sincronização futura

## 🚀 Tecnologias Utilizadas

### Core
- **React Native** - Framework principal
- **Expo** - Plataforma de desenvolvimento
- **JavaScript/ES6+** - Linguagem de programação

### Gerenciamento de Estado
- **Zustand** - Estado global simples e eficiente

### Banco de Dados
- **SQLite** - Persistência local de dados
- **expo-sqlite** - Interface para SQLite no Expo

### Navegação
- **React Navigation** - Navegação entre telas
- **Bottom Tabs** - Navegação principal
- **Stack Navigator** - Navegação em pilha

### Gráficos e Visualizações
- **react-native-chart-kit** - Gráficos responsivos
- **react-native-svg** - Suporte a SVG

### UI/UX
- **Ionicons** - Ícones consistentes
- **DateTimePicker** - Seleção de datas nativa

## 📁 Estrutura do Projeto

```
smart-finance/
├── 📄 App.js                          # Componente raiz
├── 📄 DOCUMENTATION.md                # Documentação geral
├── 📄 README.md                       # Este arquivo
├── 📁 docs/                           # Documentação detalhada
│   ├── 📄 CATEGORIES_DOCUMENTATION.md
│   ├── 📄 TRANSACTIONS_DOCUMENTATION.md
│   ├── 📄 CREDIT_CARDS_DOCUMENTATION.md
│   ├── 📄 GOALS_DOCUMENTATION.md
│   └── 📄 ANALYTICS_DOCUMENTATION.md
├── 📁 src/
│   ├── 📁 components/
│   │   └── 📄 Navigation.js           # Navegação principal
│   ├── 📁 screens/                    # Telas do aplicativo
│   │   ├── 📄 HomeScreen.js           # Tela inicial
│   │   ├── 📄 TransactionsScreen.js   # Lista de transações
│   │   ├── 📄 AddTransactionScreen.js # Formulário de transações
│   │   ├── 📄 CategoriesScreen.js     # Lista de categorias
│   │   ├── 📄 AddCategoryScreen.js    # Formulário de categorias
│   │   ├── 📄 CreditCardsScreen.js    # Lista de cartões
│   │   ├── 📄 AddCreditCardScreen.js  # Formulário de cartões
│   │   ├── 📄 GoalsScreen.js          # Lista de metas
│   │   ├── 📄 AddGoalScreen.js        # Formulário de metas
│   │   └── 📄 AnalyticsScreen.js      # Dashboard de análises
│   ├── 📁 store/
│   │   └── 📄 useStore.js             # Store Zustand
│   └── 📁 database/
│       └── 📄 database.js             # Configuração SQLite
└── 📁 assets/                         # Recursos estáticos
```

## 🎯 Funcionalidades Principais

### 1. Gestão de Categorias
- ✅ Criar, editar e excluir categorias
- ✅ Separação por tipo (receitas/despesas)
- ✅ Cores e ícones personalizáveis
- ✅ Categorias padrão pré-configuradas

### 2. Controle de Transações
- ✅ Registro de receitas e despesas
- ✅ Associação com categorias
- ✅ Suporte a cartões de crédito
- ✅ Validações completas de formulário
- ✅ Filtros e busca

### 3. Gestão de Cartões de Crédito
- ✅ Cadastro com limite e datas
- ✅ Cálculo de ciclos de faturamento
- ✅ Integração com transações
- ✅ Validações de datas inteligentes

### 4. Metas Financeiras
- ✅ Definição de objetivos com prazos
- ✅ Cálculos automáticos de progresso
- ✅ Valor mensal necessário
- ✅ Associação com categorias
- ✅ Metodologia SMART

### 5. Análises e Relatórios
- ✅ Dashboard interativo
- ✅ Gráficos de pizza e barras
- ✅ Métricas financeiras importantes
- ✅ Seletor de período dinâmico
- ✅ Progresso visual das metas

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js (versão 16 ou superior)
- npm ou yarn
- Expo CLI
- Dispositivo físico ou emulador

### Passos para instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/smart-finance.git
cd smart-finance
```

2. **Instale as dependências**
```bash
npm install
```

3. **Inicie o projeto**
```bash
npm start
# ou
expo start
```

4. **Execute no dispositivo**
- Escaneie o QR code com o app Expo Go (Android/iOS)
- Ou use um emulador configurado

### Configurando a URL da API

O app usa `EXPO_PUBLIC_API_URL` se a variável estiver definida; caso contrário, usa `http://localhost:8083`.

No PowerShell, defina a URL antes de iniciar o Expo:

```powershell
$env:EXPO_PUBLIC_API_URL="http://localhost:8083"
npm start
```

`localhost` funciona quando o app e a API compartilham o mesmo computador (por exemplo, Expo Web ou simulador iOS). No emulador Android, use `http://10.0.2.2:8083`. Em um aparelho físico, use o endereço IP local do computador que executa a API, por exemplo `http://192.168.1.10:8083`, e conecte ambos à mesma rede.

## 📊 Banco de Dados

O aplicativo utiliza SQLite para armazenamento local com as seguintes tabelas:

### Categorias
```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT DEFAULT '#007AFF',
  icon TEXT DEFAULT 'folder',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Transações
```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id INTEGER NOT NULL,
  credit_card_id INTEGER NULL,
  transaction_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories (id),
  FOREIGN KEY (credit_card_id) REFERENCES credit_cards (id)
);
```

### Cartões de Crédito
```sql
CREATE TABLE credit_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  limit_amount REAL DEFAULT 0,
  closing_day INTEGER NOT NULL,
  due_day INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Metas Financeiras
```sql
CREATE TABLE financial_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL DEFAULT 0,
  category_id INTEGER NOT NULL,
  target_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories (id)
);
```

## 🎨 Design e UX

### Paleta de Cores
- **Primária**: #007AFF (Azul iOS)
- **Receitas**: #4CAF50 (Verde)
- **Despesas**: #F44336 (Vermelho)
- **Neutro**: #666666 (Cinza)
- **Fundo**: #F5F5F5 (Cinza claro)

### Princípios de Design
- **Simplicidade**: Interface limpa e intuitiva
- **Consistência**: Padrões visuais uniformes
- **Feedback**: Respostas visuais para ações
- **Acessibilidade**: Cores contrastantes e textos legíveis

## 📚 Documentação

Cada módulo possui documentação detalhada na pasta `docs/`:

- **CATEGORIES_DOCUMENTATION.md** - Sistema de categorias
- **TRANSACTIONS_DOCUMENTATION.md** - Sistema de transações
- **CREDIT_CARDS_DOCUMENTATION.md** - Sistema de cartões
- **GOALS_DOCUMENTATION.md** - Sistema de metas
- **ANALYTICS_DOCUMENTATION.md** - Sistema de análises

## 🧪 Testes

### Testes Manuais Realizados
- ✅ Navegação entre telas
- ✅ Formulários e validações
- ✅ Persistência de dados
- ✅ Cálculos financeiros
- ✅ Responsividade

### Testes Futuros
- [ ] Testes unitários com Jest
- [ ] Testes de integração
- [ ] Testes E2E com Detox
- [ ] Testes de performance

## 🚀 Deploy e Distribuição

### Desenvolvimento
```bash
npm start          # Inicia o servidor de desenvolvimento
npm run android    # Executa no Android
npm run ios        # Executa no iOS
```

### Produção
```bash
expo build:android  # Build para Android
expo build:ios      # Build para iOS
```

## 🔮 Roadmap Futuro

### Versão 2.0
- [ ] Sincronização na nuvem
- [ ] Backup automático
- [ ] Notificações push
- [ ] Modo escuro
- [ ] Múltiplas moedas

### Versão 3.0
- [ ] Integração bancária
- [ ] Importação de extratos
- [ ] Relatórios avançados
- [ ] Compartilhamento familiar
- [ ] IA para insights

## 🤝 Contribuição

Este projeto foi desenvolvido como portfólio educacional. Contribuições são bem-vindas!

### Como contribuir
1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

Desenvolvido com ❤️ para demonstrar habilidades em React Native e desenvolvimento mobile.

**Tecnologias demonstradas:**
- React Native & Expo
- Gerenciamento de estado (Zustand)
- Banco de dados local (SQLite)
- Navegação complexa
- Gráficos e visualizações
- Validações de formulário
- Arquitetura escalável

---

## 📞 Contato

Para dúvidas ou sugestões sobre o projeto, entre em contato!

**Smart Finance** - Seu controle financeiro na palma da mão 💰📱
