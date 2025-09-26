import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import Navigation from './src/components/Navigation';
import { initDatabase } from './src/database/database';

export default function App() {
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await initDatabase();
      console.log('Aplicativo inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar aplicativo:', error);
      Alert.alert(
        'Erro de Inicialização',
        'Ocorreu um erro ao inicializar o banco de dados. O aplicativo pode não funcionar corretamente.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <>
      <StatusBar style="light" backgroundColor="#007AFF" />
      <Navigation />
    </>
  );
}
