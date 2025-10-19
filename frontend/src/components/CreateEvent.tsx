import { StyleSheet, View } from 'react-native'
import React, { useState } from 'react'
import { Button, Searchbar, Text, TextInput } from 'react-native-paper'

const CreateEvent = () => {
    const [searchText, setSearchText] = useState('');
  return (
    <View style={styles.container}>
        <Text variant='displaySmall'>Create New Event</Text>
        <TextInput
            mode='outlined'
        />
        <Searchbar placeholder='Search' value={searchText} onChangeText={setSearchText} />
    </View>
  )
}

export default CreateEvent

const styles = StyleSheet.create({
    container: {
    }
})