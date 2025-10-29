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
                <Image style={styles.galleryImage} source={{ uri: item.url }} />
            </TouchableOpacity>        
        )
    )
)}

export default GalleryDisplay

const styles = StyleSheet.create({
    galleryImage: {
        height: 125,
        width: 125,
        marginBottom: 5,
        borderRadius: 10,
    },
    footer: {
        width: 125,
        height: 125,
        marginBottom: 5,
        borderRadius: 10,
        overflow: 'hidden',
        marginRight: 3,
    },
    footerText: {
        color: 'white',
        textAlign: 'center',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
})