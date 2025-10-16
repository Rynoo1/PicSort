import { StyleSheet, View, Image, ScrollView } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text } from 'react-native-paper'

const Gallery = () => {
  return (
    <View>
      <View style={{ backgroundColor: 'black' }}>
        <ScrollView horizontal={true}>
          <Image 
            style={{ width: 200, height: 200, flex: 1 }}
            source={{
              uri: 'https://reactnative.dev/img/tiny_logo.png',
            }}
          />
          <Image 
            style={{ width: 200, height: 200, flex: 1 }}
            source={{
              uri: 'https://reactnative.dev/img/tiny_logo.png',
            }}
          />
        </ScrollView>

        {/* <View style={{ flexDirection: 'row', backgroundColor: 'blue' }}>

        </View> */}

        <Text variant='headlineMedium' style={{ color: 'red', backgroundColor: 'wheat' }} >Event Name</Text>
      </View>

    </View>
  )
}

export default Gallery

const styles = StyleSheet.create({})