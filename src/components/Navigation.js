import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Importar as telas
import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import CreditCardsScreen from '../screens/CreditCardsScreen';
import GoalsScreen from '../screens/GoalsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';

// Importar telas de formulários
import AddTransactionScreen from '../screens/AddTransactionScreen';
import AddCategoryScreen from '../screens/AddCategoryScreen';
import AddCreditCardScreen from '../screens/AddCreditCardScreen';
import AddGoalScreen from '../screens/AddGoalScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack Navigator para Transações
function TransactionsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="TransactionsList" 
        component={TransactionsScreen} 
        options={{ title: 'Transações' }}
      />
      <Stack.Screen 
        name="AddTransaction" 
        component={AddTransactionScreen} 
        options={{ title: 'Nova Transação' }}
      />
    </Stack.Navigator>
  );
}

// Stack Navigator para Categorias
function CategoriesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="CategoriesList" 
        component={CategoriesScreen} 
        options={{ title: 'Categorias' }}
      />
      <Stack.Screen 
        name="AddCategory" 
        component={AddCategoryScreen} 
        options={{ title: 'Nova Categoria' }}
      />
    </Stack.Navigator>
  );
}

// Stack Navigator para Cartões de Crédito
function CreditCardsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="CreditCardsList" 
        component={CreditCardsScreen} 
        options={{ title: 'Cartões de Crédito' }}
      />
      <Stack.Screen 
        name="AddCreditCard" 
        component={AddCreditCardScreen} 
        options={{ title: 'Novo Cartão' }}
      />
    </Stack.Navigator>
  );
}

// Stack Navigator para Metas
function GoalsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="GoalsList" 
        component={GoalsScreen} 
        options={{ title: 'Metas Financeiras' }}
      />
      <Stack.Screen 
        name="AddGoal" 
        component={AddGoalScreen} 
        options={{ title: 'Nova Meta' }}
      />
    </Stack.Navigator>
  );
}

// Tab Navigator Principal
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Transactions') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Categories') {
            iconName = focused ? 'folder' : 'folder-outline';
          } else if (route.name === 'CreditCards') {
            iconName = focused ? 'card' : 'card-outline';
          } else if (route.name === 'Goals') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ tabBarLabel: 'Início' }}
      />
      <Tab.Screen 
        name="Transactions" 
        component={TransactionsStack} 
        options={{ tabBarLabel: 'Transações' }}
      />
      <Tab.Screen 
        name="Categories" 
        component={CategoriesStack} 
        options={{ tabBarLabel: 'Categorias' }}
      />
      <Tab.Screen 
        name="CreditCards" 
        component={CreditCardsStack} 
        options={{ tabBarLabel: 'Cartões' }}
      />
      <Tab.Screen 
        name="Goals" 
        component={GoalsStack} 
        options={{ tabBarLabel: 'Metas' }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen} 
        options={{ tabBarLabel: 'Análises' }}
      />
    </Tab.Navigator>
  );
}

// Componente principal de navegação
export default function Navigation() {
  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
}
