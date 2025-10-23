import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'
import React, { useState } from 'react'
import { Modal, PaperProvider, Portal, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context';
import GalleryDisplay from '../components/GalleryDisplay';
import { GalleryItem } from '../types/images';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

type PersonProps = {
    personId: number;
    personName: string;
    personImages: GalleryItem[];
}

const Person = ({ personId, personName, personImages }: PersonProps) => {
    const [visible, setVisible] = useState(false);
    const [imageSource, setImageSource] = useState('');

    const showModal = (url: string) => {
        Haptics.selectionAsync();
        setImageSource(url);
        setVisible(true);
    }

    const hideModal = () => {
        Haptics.selectionAsync();
        setVisible(false);
    }

  return (
    <PaperProvider>
        <SafeAreaView>
            <Portal>
                <Modal visible={visible} onDismiss={hideModal}>
                    <TouchableOpacity onPress={hideModal} style={{ width: '100%', height: '100%' }}>
                        <Image source={{ uri: imageSource }} style={{ width: '100%', height: '100%' }} contentFit='contain' cachePolicy="disk" />
                    </TouchableOpacity>
                </Modal>
            </Portal>
            <Text variant='headlineLarge'>{personName}</Text>
            <FlatList
                style={{ padding: 5 }}
                data={personImages}
                numColumns={3}
                horizontal={false}
                keyExtractor={(item, index) => item.type === 'image' ? item.id : `header-${index}`}
                renderItem={({ item }) => (
                    <GalleryDisplay item={item} showModal={showModal} view='gallery' />
                )}
            />

        </SafeAreaView>
    </PaperProvider>
  )
}

export default Person

const styles = StyleSheet.create({})