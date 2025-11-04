import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Icon, Text, TextInput } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AuthStackParamList } from '../types/navigation'
import { useAuth } from '../context/AuthContext'
import { ImageBackground } from 'expo-image'

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
    <ImageBackground source={require("../../background/canvas.png")} style={{ flex: 1, justifyContent: 'center' }} contentFit='fill'>
      <View style={styles.container}>
          <View style={styles.view}>
              <Text variant="headlineLarge" style={styles.heading}> Welcome to <Text variant='headlineLarge' style={styles.subHeading}>PicSort</Text> </Text>
              <Text variant="headlineMedium" style={styles.subHeading} > Register </Text>
              <TextInput style={{ marginBottom: 7, width: '90%' }}
                  mode='outlined'
                  label="Email"
                  keyboardType='email-address'
                  outlineColor='#f2e3d5ff'
                  activeOutlineColor='#f2668bdb'
                  textColor='black'
                  onChangeText={userEmail => setEmail(userEmail)}
              />
              <TextInput style={{ marginBottom: 7, width: '90%' }}
                  mode='outlined'
                  label="Username"
                  outlineColor='#f2e3d5ff'
                  activeOutlineColor='#f2668bdb'
                  onChangeText={userName => setUsername(userName)}
              />
              <TextInput style={{ marginBottom: 10, width: '90%' }}
                  label="Password"
                  outlineColor='#f2e3d5ff'
                  activeOutlineColor='#f2668bdb'
                  secureTextEntry={!passwordVisible} mode='outlined' right={<TextInput.Icon icon={passwordVisible ? "eye-off" : "eye"} onPress={() => setPasswordVisible(!passwordVisible)} />}
                  onChangeText={userPassword => setPassword(userPassword)}
              />
              <Button style={styles.Button} buttonColor='#03A688' textColor='#F2E3D5' mode='contained' onPress={handleRegister}>Register</Button>
              <Text variant='headlineSmall' style={{ color: '#F2E3D5' }}>Already have an account?</Text>
              <Button style={[styles.Button, { borderColor: '#03A688', borderWidth: 2, marginTop: 4, }]} textColor='#03A688' mode='outlined' onPress={() => navigation.replace("Login")}>Login</Button>
          </View>
      </View>
    </ImageBackground>
  )
}

export default Register

const styles = StyleSheet.create({
  heading: {
    color: '#f2668bdb',
  },
  subHeading: {
    color: '#03A688',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    width: '90%',
    margin: 10,
  },
  Button: {
    borderRadius: 7,
    marginBottom: 3,
  },
})