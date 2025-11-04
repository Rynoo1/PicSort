import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types/navigation';
import { ImageBackground } from 'expo-image';

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
    <ImageBackground source={require("../../background/canvas.png")} style={{ flex: 1, justifyContent: 'center' }} contentFit='fill'>
      <View style={styles.container} >
        <View style={styles.view}>
            <Text variant="headlineLarge" style={[styles.heading, { marginBottom: 3 }]}> Welcome to <Text variant='headlineLarge' style={styles.subHeading}>PicSort</Text> </Text>
            <Text variant="headlineMedium" style={[styles.subHeading, { marginBottom: 3 }]} > Login </Text>
            <TextInput style={{ marginBottom: 7, width: '90%' }}
                mode='outlined'
                label="Email"
                keyboardType='email-address'
                outlineColor='#f2e3d5ff'
                activeOutlineColor='#f2668bdb'
                textColor='black'
                onChangeText={userEmail => setEmail(userEmail)}
            />
            <TextInput style={{ marginBottom: 10, width: '90%' }}
                label="Password"
                outlineColor='#f2e3d5ff'
                activeOutlineColor='#f2668bdb'
                onChangeText={userPassword => setPassword(userPassword)}
                secureTextEntry={!passwordVisible} mode='outlined' right={<TextInput.Icon icon={passwordVisible ? "eye-off" : "eye"} onPress={() => setPasswordVisible(!passwordVisible)} />} 
            />
            <Button style={styles.Button} buttonColor='#03A688' textColor='#F2E3D5' mode='contained' onPress={handleLogin}>Login</Button>
            <Text variant='headlineSmall' style={{ color: '#F2E3D5' }}>Don't have an account yet?</Text>
            <Button style={[styles.Button, { borderColor: '#03A688', borderWidth: 2, marginTop: 4, }]} textColor='#03A688' mode='outlined' onPress={() => navigation.replace("Register")}>Sign Up</Button>
        </View>
      </View>
    </ImageBackground>
  )
}

export default Login

const styles = StyleSheet.create({
  heading: {
    color: '#03A688',
  },
  subHeading: {
    color: '#f2668bdb',
  },
  container: {
    flexDirection: 'row',
    margin: 15,
    paddingHorizontal: 5,
    paddingVertical: 20,
    borderRadius: 20,
    backgroundColor: '#024059bc',
  },
  view: {
    flex: 1,
    alignItems: 'center',
  },
  Button: {
    borderRadius: 7,
    marginBottom: 3,
  },
})