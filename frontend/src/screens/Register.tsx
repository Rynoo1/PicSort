import { StyleSheet, View } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Icon, Text, TextInput } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AuthStackParamList } from '../types/navigation'
import { useAuth } from '../context/AuthContext'

const Register = () => {

    const { register, loading } = useAuth();
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

    const [passwordVisible, setPasswordVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");

    const handleRegister = async () => {
        setError(null);
        try {
            await register(email, password, username);
            console.log("user successfully registered");
        } catch (err: any) {
            console.error("Register error:", err.message);
            setError("Invalid credentials");
        }
    };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.view}>
            <Text variant="headlineLarge" style={styles.heading}> Welcome to PicSort </Text>
            <Text variant="headlineMedium" style={styles.heading} > Register </Text>
            <TextInput style={styles.textInput}
                mode='outlined'
                label="Email"
                keyboardType='email-address'
                selectionColor='black'
                outlineColor='#D5F2EF'
                activeOutlineColor='#D90D1E'
                textColor='black'
                onChangeText={userEmail => setEmail(userEmail)}
            />
            <TextInput style={styles.textInput}
                mode='outlined'
                label="Username"
                onChangeText={userName => setUsername(userName)}
            />
            <TextInput style={styles.textInput}
                label="Password"
                secureTextEntry={!passwordVisible} mode='outlined' right={<TextInput.Icon icon={passwordVisible ? "eye-off" : "eye"} onPress={() => setPasswordVisible(!passwordVisible)} />}
                onChangeText={userPassword => setPassword(userPassword)}
            />
            <Button style={styles.button} mode='contained-tonal' onPress={handleRegister}>Register</Button>
            <Button mode='contained-tonal' style={[styles.button, { margin: 10 }]} onPress={() => navigation.replace("Login")} >Login</Button>
        </View>
    </SafeAreaView>
  )
}

export default Register

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