import { StyleSheet, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Button, Modal, Text, TextInput } from 'react-native-paper'
import { EventAPI } from '../api/events';
import { handleAxiosError } from '../utils/errorHandler';

interface RenameProps {
    personName: string;
    personId: number;
    visible: boolean;
    refreshEvent?: () => void;
    onDismiss: () => void;
    mode: 'person' | 'event';
}

const RenamePerson = ({ personName, visible, onDismiss, personId, refreshEvent, mode }: RenameProps) => {

    const [newName, setNewName] = useState(personName);

    useEffect(() => {
        setNewName(personName);
    }, [personName]);

    const updateName = async () => {
        try {
            await EventAPI.updatePersonName(personId, newName);
            alert('Name successfully changed');

            await refreshEvent?.();

            onDismiss();
        } catch (error) {
            const message = handleAxiosError(error);
            alert(message);
        }
    }

    // const updateEvent = async () => {
    //     try {
    //         await 
    //     } catch (error) {
            
    //     }
    // }

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <View>
            <Text style={{ color: '#F2E3D5', marginBottom: 10, }} variant='displaySmall'>Rename Person</Text>
            <TextInput 
                mode='outlined'
                style={styles.textInput}
                value={newName}
                onChangeText={newName => setNewName(newName)}
                outlineColor='#03A688'
                activeOutlineColor='#03A688'
            />
            <View style={{ flexDirection: 'row', gap: 15 }}>
                <Button  mode='outlined' style={[styles.button, { borderColor: '#A61723', borderWidth: 1.5, }]} textColor='#F22233' onPress={onDismiss}>Cancel</Button>
                <Button mode='contained' style={styles.button} buttonColor='#03A688' textColor='#F2E3D5' onPress={updateName}>Change Name</Button>
                {/* <Button mode='contained' style={styles.button} buttonColor='#03A688' textColor='#F2E3D5' onPress={mode == 'person' ? updateName : updateEvent}>Change Name</Button> */}
            </View>
        </View>
    </Modal>
  )
}

export default RenamePerson

const styles = StyleSheet.create({
    modalContainer: {
        backgroundColor: '#024059',
        padding: 10,
        margin: 10,
        borderRadius: 10,
        paddingBottom: 15,
        borderColor: '#03A688',
        borderWidth: 2,
    },
    button: {
        marginTop: 10,
        flex: 1,
        borderRadius: 10,
    },
    textInput: {
        marginBottom: 10,
        height: 45,
        fontSize: 20,
    }
})