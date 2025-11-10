import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Appbar, Button, Dialog, IconButton, Modal, PaperProvider, Portal, Text } from 'react-native-paper'
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
import RenamePerson from '../components/RenamePerson';

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
    const [eventPeople, setEventPeople] = useState<EventPeople[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);
    const [usersModal, setUsersModal] = useState(false);
    const [upload, setUpload] = useState(false);
    const [rename, setRename] = useState(false);
    const [renameId, setRenameId] = useState<number | null>(null);
    const [oldName, setOldName] = useState("");
    const [uploadMode, setUploadMode] = useState<'upload' | 'search' >('upload');
    const [imageSource, setImageSource] = useState<string>('');
    const [activeId, setActiveId] = useState<number | null>(null);
    const [photoMap, setPhotoMap] = useState<Map<string, { id: number; url: string; personIds: number[] }>>(new Map());
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const hideModal = () => {
        setVisible(false);
        setUsersModal(false);
        setUpload(false);
        setImageSource("");
        setActiveId(null);
        setRename(false);
        setRenameId(null);
        setConfirmDelete(false);
        Haptics.selectionAsync();
    }
    const showModal = (url: string, id: number) => {
        setImageSource(url);
        setActiveId(id);
        setVisible(true);
    }
    const showUsers = () => {
        setUsersModal(true);
        Haptics.selectionAsync();
    }
    const showUpload = () => {
        setUploadMode('upload');
        setUpload(true);
        Haptics.selectionAsync();
    }
    const showImageSearch = () => {
        setUploadMode('search');
        setUpload(true);
        Haptics.selectionAsync();
    }
    const showRename = (personId: number, oldName: string) => {
        setOldName(oldName);
        setRenameId(personId);        
        setRename(true);
        Haptics.selectionAsync();
    }

    useEffect(() => {
        navigation.setOptions({ title: eventName });
    }, [eventName, navigation]);

    useEffect(() => {
        fetchEventDetails();
    }, [eventId]);

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

            setEventData(formattedData);
        } catch (err: any) {
            console.error('Error fetching event details:', err);
            setError(err.response?.data?.message || err.message || 'failed to load event details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!eventData || photoMap.size === 0) return;

        const people = eventData.people.filter(person => {
            const photoCount = Array.from(photoMap.values())
                .filter(photo => photo.personIds.includes(Number(person.id))).length;
            
            return photoCount > 2;
        });

        setEventPeople(people);
    }, [eventData, photoMap]);

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { paddingTop: 70 }]}>
                <ActivityIndicator color='#f2668bff' size='large' />
            </SafeAreaView>
        );
    }

    if (error || !eventData) {
        return (
            <SafeAreaView style={styles.container}>
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

    const deletePhoto = async (photoId: number) => {
        setDeleting(true);
        try {
            console.log('deleting...');
            await EventAPI.deletePhoto(photoId);
            fetchEventDetails();
            alert("Success");
            setDeleting(false);
            hideModal();
        } catch (error) {
            console.error(error);
            setDeleting(false);
            alert("error:" + error);
        }
    }

  return (
    <PaperProvider>
        <View style={styles.container}>
            <Portal>
                <Modal visible={visible} onDismiss={hideModal} style={{ padding: 3, }}>
                    {/* <Button mode='contained' style={{ width: '60%' }} onPress={() => setConfirmDelete(true)}>{deleting ? ('Deleting...') : ('Delete')}</Button> */}
                    {/* <IconButton icon="delete" size={25} iconColor='#f2668bea' containerColor='#024059' style={{ marginEnd: 6 }} onPress={() => setConfirmDelete(true)} /> */}
                    <TouchableOpacity onPress={hideModal} style={{ width: '100%', height: '90%' }}>
                        <Image source={{ uri: imageSource }} style={{ width: '100%', height: '100%' }} contentFit='contain' cachePolicy="disk" />
                    </TouchableOpacity>
                    <IconButton icon="delete" size={37} iconColor='#f2668bea' containerColor='#024059' style={{ left: '75%' }} disabled={deleting} onPress={() => setConfirmDelete(true)} />
                </Modal>
                <Dialog visible={confirmDelete} onDismiss={hideModal} style={{ backgroundColor: '#024059', borderColor: '#03A688' }}>
                    <Dialog.Title>Are you sure?</Dialog.Title>
                    <Dialog.Content>
                        <Text variant='bodyMedium'>Confirm delete</Text>
                        <Dialog.Actions>
                            <Button onPress={() => deletePhoto(activeId!)}>Confirm</Button>
                            <Button onPress={hideModal}>Cancel</Button>
                        </Dialog.Actions>
                    </Dialog.Content>
                </Dialog>
                <CreateEvent visible={usersModal} onDismiss={hideModal} mode='search' eventId={eventId} />
                <ImageUploadComponent visible={upload} onDismiss={hideModal} eventId={eventId} userId={user?.id ?? 0} mode={uploadMode} onPersonFound={navigatePerson} refetch={fetchEventDetails} />
                <RenamePerson visible={rename} onDismiss={hideModal} personId={renameId!} refreshEvent={fetchEventDetails} personName={oldName} mode='person' />
            </Portal>
            <View style={styles.topContainer}>
                <Appbar.Header style={{ backgroundColor: '#024059', }}>
                    <Appbar.BackAction color='#F2E3D5' onPress={() => navigation.goBack()} />
                    <Appbar.Content color='#03A688' title={eventName} />
                    <Appbar.Action icon="account-plus" color='#f2668bff' onPress={showUsers} />
                </Appbar.Header>
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
                <Text style={{ color: '#F2E3D5', marginTop: 12 }} variant='headlineLarge'> People </Text>
                <FlatList
                    data={eventPeople}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginLeft: 5 }}
                    keyExtractor={(item) => item.id.toString()}
                    ListHeaderComponent={(
                        <TouchableOpacity style={[styles.personItem, styles.personThumbnail, { justifyContent: 'center', borderColor: '#03A688', borderWidth: 2 }]} onPress={showImageSearch}>
                            <Text variant='titleLarge' style={{ color: '#f2668bff', textAlign: 'center' }}>Find{"\n"}a{"\n"}Face</Text>
                        </TouchableOpacity>
                    )}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.personItem} onPress={() => navigatePerson(Number(item.id), item.name)} onLongPress={() => showRename(Number(item.id), item.name)}>
                            <Image style={styles.personThumbnail} source={{ uri: item.imageUrl }} cachePolicy='disk' />
                            <Text variant='titleLarge' style={{ color: '#F2E3D5' }} >{item.name}</Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={(
                        <Text variant='headlineMedium' style={{ marginTop: '13%', marginLeft: 10, color: '#F2E3D5' }}>No People yet</Text>
                    )}
                />
            </View>
        </View>
    </PaperProvider>
  )
}

export default Event
// 2c3950
const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: '#024059',
        paddingHorizontal: 3,
    },
    topContainer: {
        flex: 2,
    },
    bottomContainer: {
        flex: 1,
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