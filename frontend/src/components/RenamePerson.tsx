import { StyleSheet, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Button, Modal, Text, TextInput } from 'react-native-paper'
import { EventAPI } from '../api/events';
import { handleAxiosError } from '../utils/errorHandler';

interface RenameProps {
    personName: string;
    personId: number;
    visible: boolean;
    refreshEvent: () => void;
    onDismiss: () => void;
}

const RenamePerson = ({ personName, visible, onDismiss, personId, refreshEvent }: RenameProps) => {

    const [newName, setNewName] = useState(personName);

    useEffect(() => {
        setNewName(personName);
    }, [personName]);

    const updateName = async () => {
        try {
            await EventAPI.updatePersonName(personId, newName);
            alert('Name successfully changed');

            await refreshEvent();

            onDismiss();
        } catch (error) {
            const message = handleAxiosError(error);
            alert(message);
        }
    }

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <View>
            <Text variant='headlineLarge'>Rename Person</Text>
            <TextInput 
                mode='outlined'
                value={newName}
                onChangeText={newName => setNewName(newName)} 
            />
            <View style={{ flexDirection: 'row', gap: 15 }}>
                <Button  mode='contained' style={styles.button} onPress={onDismiss}>Cancel</Button>
                <Button mode='contained' style={styles.button} onPress={updateName}>Change Name</Button>
            </View>
        </View>
    </Modal>
  )
}

export default RenamePerson

const styles = StyleSheet.create({
    modalContainer: {
        backgroundColor: 'white',
        padding: 20,
    },
    button: {
        marginTop: 10,
        flex: 1,
    },
})