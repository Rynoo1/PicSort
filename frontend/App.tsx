import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NavigationContainer, RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Register from './src/screens/Register';
import Login from './src/screens/Login';
import Main from './src/screens/Main';
import Event from './src/screens/Event';
import { ActivityIndicator } from 'react-native-paper';
import ImageUploadComponent from './src/components/ImageUpload';
import Person from './src/screens/Person';
import { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator();

function RootNavigator() {

  const { user, token, loading } = useAuth()!;

  if (loading) {
    return (
      <ActivityIndicator size='large' />
    )
  }

  return (
    <NavigationContainer>
      {!token || !user ? (
        <Stack.Navigator>
          <Stack.Screen options={{ headerShown: false }} name='Login' component={Login} />
          <Stack.Screen options={{ headerShown: false }} name='Register' component={Register} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator>
          <Stack.Screen options={{ headerShown: false }} name='Home' component={Main} />
          <Stack.Screen options={{ headerShown: false }} name='Event' component={Event} />
          <Stack.Screen options={{ headerShown: false }} name='Person'>
            {({ route }) => {
              const params = route.params as RootStackParamList['Person'] | undefined;

              if (!params) {
                return (
                  <View>
                    <Text>No person data provided</Text>
                  </View>
                );
              }
              return <Person {...(route.params) as any} />;
            }}
          </Stack.Screen>
        </Stack.Navigator>
      )}

    </NavigationContainer>
  )
}

export default function App() {
  return (
    <AuthProvider>
        <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
