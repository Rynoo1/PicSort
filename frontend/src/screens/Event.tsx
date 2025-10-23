import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Button, Modal, PaperProvider, Portal, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RouteProp, useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { EventAPI } from '../api/events';
import { Image } from 'expo-image';
import { getCachedEvent, isCacheValid, setCachedEvent } from '../utils/CacheUtils';
import CreateEvent from '../components/CreateEvent';
import * as Haptics from 'expo-haptics'
import ImageUploadComponent from '../components/ImageUpload';
import { useAuth } from '../context/AuthContext';
import { GalleryItem } from '../types/images';
import GalleryDisplay from '../components/GalleryDisplay';

type EventPeople = {
    id: number;
    name: string;
    imageUrl?: string;
};

type EventImages = {
    id: string;
    url: string;
    people: [];
    expires?: string;
}

type EventRouteProp = RouteProp<RootStackParamList, 'Event'>;

type EventData = {
    id: number;
    name: string;
    people: EventPeople[];
    images: EventImages[];
};

const Event = () => {
    const route = useRoute<EventRouteProp>();
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const { eventId, eventName } = route.params;
    const { user } = useAuth();

    const [eventData, setEventData] = useState<EventData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);
    const [usersModal, setUsersModal] = useState(false);
    const [upload, setUpload] = useState(false);
    const [uploadMode, setUploadMode] = useState<'upload' | 'search' >('upload');
    const [imageSource, setImageSource] = useState<string>('');
    const [photoMap, setPhotoMap] = useState<Map<string, { id: number; url: string; personIds: number[] }>>(new Map());

    const hideModal = () => {
        setVisible(false);
        setUsersModal(false);
        setUpload(false);
        setImageSource("");
        Haptics.selectionAsync();
    }
    const showModal = (url: string) => {
        setImageSource(url);
        setVisible(true);
    }
    const showUsers = () => {
        setUsersModal(true);
        Haptics.selectionAsync();
    }
    const showUpload = () => {
        setUpload(true);
        Haptics.selectionAsync();
    }
    const showImageSearch = () => {
        setUploadMode('search');
        setUpload(true);
        Haptics.selectionAsync();
    }

    useEffect(() => {
        navigation.setOptions({ title: eventName });
    }, [eventName, navigation]);

    useEffect(() => {
        fetchEventDetails();
    }, [eventId]);

    // const findPeoplePhotos = async ( personId: number ) => {
    //     const urls: string[] = [];

    //     for (const [, photo] of photoMap.entries()) {
    //         if (photo.personIds.includes(personId)) {
    //             urls.push(photo.url);
    //         }
    //     }
    //     console.log(urls);
    // }

    const updateName = async ( personId: number ) => {
        try {
            const update = await EventAPI.updatePersonName(personId, "Ryno");
            console.log('success')
        } catch (error) {
            console.log('error updating name');
        }
    }

    const navigatePerson = ( personId: number, personName: string ) => {
        Haptics.selectionAsync();

        const personImages = Array.from(photoMap.entries())
            .filter(([_, photo]) => photo.personIds.includes(personId))
            .map(([_, photo]) => ({
                type: 'image' as const,
                id: String(photo.id),
                url: photo.url,
            }));

        navigation.navigate('Person', {
            personId,
            personName,
            personImages,
        });
    }

    const fetchEventDetails = async () => {
        try {
            setLoading(true);
            setError(null);

            const cached = await getCachedEvent(eventId);
            const meta = await EventAPI.getEventMeta(eventId);

            if (cached) {
                
                if (meta.data.updatedAt === cached.updatedAt && isCacheValid(cached)) {
                    console.log('Using cached event data');
                    setEventData(cached.data);

                    const cachedPhotoMap = new Map<string, { id: number, url: string; personIds: number[] }>(
                        cached.data.images?.map((img: any) => [
                            String(img.id),
                            {
                                id: img.id,
                                url: img.url,
                                personIds: Array.isArray(img.people)
                                    ? img.people.map((p: any) => Number(p.id)).filter((id: number) => !isNaN(id))
                                    : [],
                            },
                        ]) || []
                    );
                    setPhotoMap(cachedPhotoMap);

                    setLoading(false);
                    return;
                }
            }
            console.log('fetching fresh event data');

            const response = await EventAPI.returnEventData(eventId);
            const data = response.data;

            const photoMapMap = new Map<string, { id: number; url: string; personIds: number[] }>(
                data.images?.map((img: any) => [
                    String(img.id), 
                    {
                        id: img.id,
                        url: img.url, 
                        personIds: Array.isArray(img.image_people)
                            ? img.image_people.map((p: any) => Number(p.id)).filter((id: number) => !isNaN(id))
                            : [],
                    },
                ]) || []
            );

            setPhotoMap(photoMapMap);

            const formattedData: EventData = {
                id: eventId || data.event_id?.toString(),
                name: eventName,
                people: data.people?.map((person: any) => ({
                    id: person.person_id.toString(),
                    name: person.person_name,
                    imageUrl: photoMapMap.get(String(person.photo_id))?.url || null,
                })) || [],
                images: data.images?.map((img: any) => ({
                    id: img.id?.toString(),
                    url: img.url,
                    people: img.image_people,
                    expires: img.expires,
                })) || [],
            };

            await setCachedEvent(eventId, {
                eventId,
                data: formattedData,
                updatedAt: meta.data.updatedAt,
                cachedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
            });

            // const galleryData: GalleryItem[] = [
            //     { type: 'header' },
            //     ...(formattedData.images?.map(img => ({
            //         type: 'image' as const,
            //         id: img.id,
            //         url: img.url,
            //         expires: img.expires || '',
            //     })) || []),
            // ]

            setEventData(formattedData);
        } catch (err: any) {
            console.error('Error fetching event details:', err);
            setError(err.response?.data?.message || err.message || 'failed to load event details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView>
                <ActivityIndicator size='large' />
            </SafeAreaView>
        );
    }

    if (error || !eventData) {
        return (
            <SafeAreaView>
                <Text>{error || 'failed to load event'}</Text>
            </SafeAreaView>
        )
    }

    const galleryData: GalleryItem[] = [
        { type: 'header' },
        ...(eventData.images?.map(img => ({
            type: 'image' as const,
            id: img.id,
            url: img.url,
            expires: img.expires || '',
        })) || []),
    ];

  return (
    <PaperProvider>
        <SafeAreaView style={styles.container}>
            <Portal>
                <Modal visible={visible} onDismiss={hideModal}>
                    <TouchableOpacity onPress={hideModal} style={{ width: '100%', height: '100%' }}>
                        <Image source={{ uri: imageSource }} style={{ width: '100%', height: '100%' }} contentFit='contain' cachePolicy="disk" />
                    </TouchableOpacity>
                </Modal>
                <CreateEvent visible={usersModal} onDismiss={hideModal} mode='search' />
                <ImageUploadComponent visible={upload} onDismiss={hideModal} eventId={eventId} userId={user?.id ?? 0} mode={uploadMode} />
            </Portal>
            <View style={styles.topContainer}>
                <Text style={{ color: 'black' }} variant='headlineLarge'> {eventName} </Text>
                <FlatList
                    style={{ padding: 5 }}
                    data={galleryData}
                    numColumns={3}
                    horizontal={false}
                    inverted={true}
                    keyExtractor={(item, index) => item.type === 'image' ? item.id : `header-${index}`}
                    renderItem={({ item }) => (
                        <GalleryDisplay item={item} showModal={showModal} showUpload={showUpload} view='gallery' />
                    )}
                />
            </View>
            <View style={styles.bottomContainer}>
                <Text style={{ color: 'black' }} variant='headlineLarge'> People </Text>
                <FlatList
                    data={eventData.people}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginLeft: 5 }}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.personItem} onPress={() => navigatePerson(Number(item.id), item.name)} onLongPress={() => console.log(item.id)}>
                            <Image style={styles.personThumbnail} source={{ uri: item.imageUrl }} />
                            <Text variant='titleLarge'>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 5 }}>
                    <Button mode='contained' onPress={showUsers}>Add Users</Button>
                    <Button mode='contained' onPress={showImageSearch}>Find a Face</Button>
                </View>
            </View>
        </SafeAreaView>
    </PaperProvider>
  )
}

export default Event

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: 'wheat',
    },
    topContainer: {
        flex: 2,
    },
    bottomContainer: {
        flex: 1.1,
    },
    personItem: {
        alignItems: 'center',
        marginTop: 15,
        marginRight: 15,
    },
    personThumbnail: {
        height: 120,
        width: 120, 
        borderRadius: 10,
    },
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