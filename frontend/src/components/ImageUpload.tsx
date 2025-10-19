import React, { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { File } from 'expo-file-system'
import api from '../api/client';
import axios from 'axios';
import { Button, Text } from 'react-native-paper';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ImageManipulator, SaveFormat, useImageManipulator } from 'expo-image-manipulator';


const ImageUploadComponent = ({ eventId, userId }: { eventId: number, userId: number }) => {
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

    const uploadImagesToS3 = async () => {
        if (selectedImages.length === 0) return;

        try {
            setUploading(true);

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

            await api.post('/api/image/processing-batch', {
                uploaded_by: userId,
                event_id: eventId,
                storage_keys: storageKeys,
            });

            console.log('All images uploaded and processing started');
            setSelectedImages([]);
            alert('Images uploaded successfully');

        } catch (error: any) {
            console.error('Error uploading images: ', error);
            alert('Failed to upload images');
        } finally {
            setUploading(false);
        }
    };

    return (
        <SafeAreaView>
            <Button mode='contained' onPress={pickImages} disabled={uploading} icon="image-multiple">Select Images</Button>

            {selectedImages.length > 0 && (
                <>
                    <Text> Selected: {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''}</Text>
                    <Button mode='contained' onPress={uploadImagesToS3} disabled={uploading} icon='upload'>{uploading ? 'Uploading...' : 'Upload Images'}</Button>
                </>
            )}
        </SafeAreaView>
    )
}

export default ImageUploadComponent