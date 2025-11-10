import React, { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { File } from 'expo-file-system'
import api from '../api/client';
import axios from 'axios';
import { Button, Modal, Text } from 'react-native-paper';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { handleAxiosError } from '../utils/errorHandler';

interface ImageUploadProps {
    eventId: number;
    userId: number;
    visible: boolean;
    onDismiss: () => void;
    onPersonFound?: (personId: number, personName: string) => void;
    refetch?: () => void;
    mode: 'upload' | 'search';
}

const ImageUploadComponent = ({ eventId, userId, visible, onDismiss, mode, onPersonFound, refetch }: ImageUploadProps) => {
    const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [uploading, setUploading] = useState(false);

    const pickImages = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('Permission needed to access photos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (result.canceled) return;

        const convertedImages = await Promise.all(
            result.assets.map(async (asset) => {
                const context = ImageManipulator.manipulate(asset.uri);
                const render = await context.renderAsync();
                const saved = await render.saveAsync({
                    format: SaveFormat.JPEG,
                    compress: 0.9,
                });

                return {
                    ...asset,
                    uri: saved.uri,
                    mimeType: 'image/jpeg',
                    fileName: asset.fileName?.replace(/\.[^/.]+$/, '.jpg') || `image-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
                };
            })
        );

        setSelectedImages(convertedImages);
    };

    const pickSearch = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            alert('Permission needed to access the camera');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            allowsMultipleSelection: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];

            const context = ImageManipulator.manipulate(asset.uri);
            const render = await context.renderAsync();
            const saved = await render.saveAsync({
                format: SaveFormat.JPEG,
                compress: 0.9,
            });

            const convertedPhoto = {
                ...asset,
                uri: saved.uri,
                mimeType: 'image/jpeg',
                fileName: asset.fileName?.replace(/\.[^/.]+$/, '.jpg') || `image-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
            };
            
            setSelectedImages([convertedPhoto])
        }
    }

    const uploadImagesToS3 = async () => {
        if (selectedImages.length === 0) return;

        try {
            setUploading(true);
            console.log(typeof(userId));
            console.log(typeof(eventId));

            const presignResponse = await api.post('/api/image/upload-url', {
                files: selectedImages.map(img => ({
                    filename: img.fileName || `image-${Date.now()}-${Math.random()}.jpg`,
                    content_type: img.mimeType || 'image/jpeg',
                })),
                prefix: `${eventId}`,
            });

            const presignedData = presignResponse.data.uploads;

            const uploadPromise = selectedImages.map(async (image, index) => {
                const uploadInfo = presignedData[index];
                const presignedUrl = uploadInfo.presigned_url;
                const storageKey = uploadInfo.filename;

                const file = new File(image.uri);
                const byteArray = await file.bytes();

                await axios.put(presignedUrl, byteArray, {
                    headers: {
                        'Content-Type': image.mimeType || 'image/jpeg',
                    },
                    // transformRequest: [(data, headers) => {
                    //     delete headers.common['Authorization'];
                    //     return data;
                    // }],
                });

                return storageKey;
            });

            const storageKeys = await Promise.all(uploadPromise);

            if (mode === 'upload') {
                await api.post('/api/image/processing-batch', {
                    uploaded_by: Number(userId),
                    event_id: eventId,
                    storage_keys: storageKeys,
                });

                console.log('All images uploaded and processing started');
                setSelectedImages([]);
                refetch?.();
                alert('Images uploaded successfully');

            } else if (mode === 'search') {
                const result = await api.post('/api/search', {
                    storage_key: storageKeys[0],
                    event_id: eventId,
                });

                console.log(result.data);
                if (result.data.id == null && result.data.name == null ) {
                    alert("No matches: " + result.data.message);
                } else {
                    onPersonFound?.(result.data.id, result.data.name);
                }
            }

        } catch (error: any) {
            const message = handleAxiosError(error);
            alert(`Upload failed: ${message}`);
            
            console.error('Error uploading images:', message);

        } finally {
            onDismiss();
            setUploading(false);
        }
    };

    const handleCancel = () => {
        setSelectedImages([])
        onDismiss();
    }

    return (
        <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
            <View>
                {mode === 'upload' ? (
                    <>
                        <Text variant='headlineSmall' style={styles.title}>Upload New Photos</Text>
                        <Button mode='outlined' textColor='#F2E3D5' onPress={pickImages} disabled={uploading} icon="image-multiple" style={{ marginTop: 10, borderColor: '#F2E3D5' }}>Select Images</Button>
                    </>
                ) : (
                    <>
                        <Text variant='headlineSmall' style={styles.title}>Search for a Face</Text>
                        <Button mode='outlined' textColor='#F2E3D5' style={{ marginTop: 10, borderColor: '#03A688' }} onPress={pickSearch} disabled={uploading} icon="image">Take a Picture</Button>
                    </>
                )}
                
                {selectedImages.length > 0 && (
                    <>
                        <FlatList
                            data={selectedImages}
                            style={{ marginTop: 7, maxHeight: '65%' }}
                            numColumns={3}
                            inverted={true}
                            keyExtractor={(item, index) => item.fileName ?? item.uri ?? index.toString()}
                            renderItem={({ item }) => (
                                <Image
                                    source={{ uri: item.uri }}
                                    style={styles.thumbnail}
                                />
                            )}
                        />
                        <Text variant='titleSmall' style={{ color: '#F2E3D5', marginVertical: 3 }}> Selected: {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''}</Text>
                        <Button mode='contained' style={{ marginTop: 3 }} buttonColor='#03A688' textColor='#024059' onPress={uploadImagesToS3} disabled={uploading} icon='upload'>{uploading ? 'Uploading...' : 'Upload Images'}</Button>
                    </>
                )}
                <Button mode='outlined' onPress={handleCancel} disabled={uploading} style={{ marginTop: 15, borderColor: '#A61723' }} textColor='#F22233'>Cancel</Button>
            </View>
        </Modal>
    )
}

export default ImageUploadComponent

const styles = StyleSheet.create({
    modalContainer: {
	    backgroundColor: '#024059', 
	    padding: 10,
        margin: 10,
        borderRadius: 10,
        marginBottom: 70,
        borderColor: '#03A688',
        borderWidth: 2,
    },
    title: {
        color: '#03A688',
    },
    thumbnail: {
        height: 100,
        width: 100,
        margin: 4
    },
})