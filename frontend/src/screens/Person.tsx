import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'
import React, { useState } from 'react'
import { Appbar, Modal, PaperProvider, Portal, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context';
import GalleryDisplay from '../components/GalleryDisplay';
import { GalleryItem } from '../types/images';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import RenamePerson from '../components/RenamePerson';

type PersonProps = {
    personId: number;
    personName: string;
    personImages: GalleryItem[];
}

const Person = ({ personId, personName, personImages }: PersonProps) => {

    const navigation = useNavigation<NavigationProp<RootStackParamList>>();

    const [visible, setVisible] = useState(false);
    const [imageSource, setImageSource] = useState('');
    const [oldName, setOldName] = useState('');
    const [rename, setRename] = useState(false);
    const [renameId, setRenameId] = useState<number>();

    const showModal = (url: string) => {
        Haptics.selectionAsync();
        setImageSource(url);
        setVisible(true);
    }

    const hideModal = () => {
        Haptics.selectionAsync();
        setVisible(false);
        setRename(false);
    }

    const showRename = (personID: number, oldName: string) => {
        setOldName(oldName);
        setRenameId(personID);
        setRename(true);
        Haptics.selectionAsync();
    }

  return (
    <PaperProvider>
        <View style={styles.container}>
            <Portal>
                <Modal visible={visible} onDismiss={hideModal}>
                    <TouchableOpacity onPress={hideModal} style={{ width: '100%', height: '100%', padding: 3, }}>
                        <Image source={{ uri: imageSource }} style={{ width: '100%', height: '100%' }} contentFit='contain' cachePolicy="disk" />
                    </TouchableOpacity>
                </Modal>
                <RenamePerson visible={rename} onDismiss={hideModal} personId={renameId!} personName={oldName} mode='person' />
            </Portal>
            <Appbar.Header style={{ backgroundColor: '#024059', }}>
                <Appbar.BackAction color='#F2E3D5' onPress={() => navigation.goBack()} />
                <Appbar.Content color='#F2E3D5' title={personName} />
                <Appbar.Action color='#f2668bff' icon='pencil' onPress={() => showRename(personId, personName)} />
            </Appbar.Header>
            <FlatList
                style={{ padding: 5, marginBottom: '70%', }}
                data={personImages}
                numColumns={3}
                inverted={true}
                horizontal={false}
                keyExtractor={(item, index) => item.type === 'image' ? item.id : `header-${index}`}
                renderItem={({ item }) => (
                    <GalleryDisplay item={item} showModal={showModal} view='gallery' />
                )}
            />

        </View>
    </PaperProvider>
  )
}

export default Person

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#024059',
        paddingHorizontal: 3,
        flex: 1,
    },
    title: {
        color: '#F2E3D5',
        padding: 10,
    }
})