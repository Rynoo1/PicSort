import { StyleSheet, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { Text } from 'react-native-paper'
import { GalleryItem } from '../types/images'
import { Image } from 'expo-image'

type GalleryDisplayProps = {
    item: GalleryItem;
    view: 'gallery' | 'people';
    showModal: (url: string, id: number) => void;
    showUpload?: () => void;
}

const GalleryDisplay: React.FC<GalleryDisplayProps> = ({ item, showModal, showUpload, view }) => {
  return (
    (item.type === 'header' ? (
            <TouchableOpacity style={[styles.galleryImage, styles.footer]} onPress={showUpload}>
                <View style={styles.overlay}>
                    <Text variant='headlineSmall' style={styles.footerText}>
                        Add Pictures
                    </Text>
                </View>
            </TouchableOpacity>
    ) : (
            <TouchableOpacity style={{ flex: 1 }} onPress={() => showModal(item.url, Number(item.id))}>
                <Image style={view == 'gallery' ? styles.galleryImage : styles.personImage} source={{ uri: item.url }} placeholder={{ blurhash: 'L5H2EC=PM+yV0g-mq.wG9c010J}I' }} />
            </TouchableOpacity>
        )
    )
)}

export default GalleryDisplay

const styles = StyleSheet.create({
    galleryImage: {
        height: 122,
        width: 122,
        marginBottom: 5,
        borderRadius: 10,
    },
    personImage: {
        height: 180,
        width: 180,
        marginBottom: 10,
        borderRadius: 10,
    },
    footer: {
        width: 122,
        height: 122,
        marginBottom: 5,
        borderRadius: 10,
        overflow: 'hidden',
        marginRight: 3,
    },
    footerText: {
        color: '#F2E3D5',
        textAlign: 'center',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.64)',
        justifyContent: 'center',
        alignItems: 'center',
    },
})