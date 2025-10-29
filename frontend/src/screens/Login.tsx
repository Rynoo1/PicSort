import { StyleSheet, View } from 'react-native'
import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types/navigation';

const Login = () => {

  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleLogin = async () => {
    setError(null);
    try {
      await login(email, password);
      console.log("logged in successfully");
    } catch (err: any) {
      console.error("Login error:", err.message);
      setError("Invalid email or password");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.view}>
            <Text variant="headlineLarge" style={styles.heading}> Welcome to PicSort </Text>
            <Text variant="headlineMedium" style={styles.heading} > Login </Text>
            <TextInput style={styles.textInput}
                mode='outlined'
                label="Email"
                keyboardType='email-address'
                selectionColor='#D5F2EF'
                outlineColor='#D5F2EF'
                activeOutlineColor='#D5F2EF'
                textColor='black'
                onChangeText={userEmail => setEmail(userEmail)}
            />
            <TextInput style={styles.textInput}
                label="Password"
                onChangeText={userPassword => setPassword(userPassword)}
                secureTextEntry={!passwordVisible} mode='outlined' right={<TextInput.Icon icon={passwordVisible ? "eye-off" : "eye"} onPress={() => setPasswordVisible(!passwordVisible)} />} 
            />
            <Button style={styles.button} mode='contained-tonal' onPress={handleLogin}>Login</Button>
            <Button style={[styles.button, { margin: 10 }]} mode='contained-tonal' onPress={() => navigation.replace("Register")}>Register</Button>
        </View>
    </SafeAreaView>
  )
}

export default Login

const styles = StyleSheet.create({
  button: {
      backgroundColor: '#D5F2EF',
  },
  heading: {
      color: '#D90D1E'
  },
  container: {
      flex: 1,
      flexDirection: 'column',
      padding: 10,
      backgroundColor: '#0D0D0D',
  },
  view: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  textInput: {
      width: '90%',
      margin: 10,
  },
})