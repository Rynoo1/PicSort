import { StyleSheet, View } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Icon, Text, TextInput } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AuthStackParamList } from '../types/navigation'

const Register = () => {

    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
    const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, flexDirection: 'column', padding: 10, backgroundColor: '#0D0D0D' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text variant="headlineLarge" style={styles.heading}> Welcome to PicSort </Text>
            <Text variant="headlineMedium" style={styles.heading} > Register </Text>
            <TextInput style={{ width: '90%', margin: 10 }}
                mode='outlined'
                label="Email"
                keyboardType='email-address'
                selectionColor='#D5F2EF'
                outlineColor='#D5F2EF'
                activeOutlineColor='#D5F2EF'
                textColor='#D5F2EF'
            />
            <TextInput style={{ width: '90%', margin: 10 }}
                mode='outlined'
                label="Username"
            />
            <TextInput style={{ width: '90%', margin: 10 }}
                label="Password"
                secureTextEntry={!passwordVisible} mode='outlined' right={<TextInput.Icon icon={passwordVisible ? "eye-off" : "eye"} onPress={() => setPasswordVisible(!passwordVisible)} />} 
            />
            <Button style={styles.button} mode='contained-tonal' onPress={() => console.log("pressed")}>Register</Button>
            <Button mode='contained-tonal' style={[styles.button, { margin: 15 }]} onPress={() => navigation.replace("Login")} >Login</Button>
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
    }
})