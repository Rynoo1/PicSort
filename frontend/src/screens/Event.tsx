import { FlatList, ScrollView, StyleSheet, TouchableOpacity, View, Platform } from 'react-native'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Button, Modal, PaperProvider, Portal, Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { EventAPI } from '../api/events';
import { Image } from 'expo-image';
import { getCachedEvent, isCacheValid, setCachedEvent } from '../utils/CacheUtils';

type EventPeople = {
    id: number;
    name: string;
    imageUrl?: string;
};

type EventImages = {
    id: string;
    url: string;
    expires?: string;
}

// const People: EventPeople[] = [
//     {
//         id: '1',
//         name: 'Person1',
//         image: 'https://picsum.photos/400/300?random=17',
//     },
//     {
//         id: '2',
//         name: 'Person2',
//         image: 'https://picsum.photos/400/300?random=18',
//     },
//     {
//         id: '3',
//         name: 'Person3',
//         image: 'https://picsum.photos/400/300?random=19',
//     },
//     {
//         id: '4',
//         name: 'Person4',
//         image: 'https://picsum.photos/400/300?random=20',
//     },
// ]

// const Images: EventImages[] = [
//     {
//         id: '1',
//         url: 'https://picsum.photos/400/300?random=21',
//     },
//     {
//         id: '2',
//         url: 'https://picsum.photos/400/300?random=22',
//     },
//     {
//         id: '3',
//         url: 'https://picsum.photos/400/300?random=23',
//     },
//     {
//         id: '4',
//         url: 'https://picsum.photos/400/300?random=24',
//     },
//     {
//         id: '5',
//         url: 'https://picsum.photos/400/300?random=25',
//     },
//     {
//         id: '6',
//         url: 'https://picsum.photos/400/300?random=26',
//     },
//     {
//         id: '7',
//         url: 'https://picsum.photos/400/300?random=27',
//     },
//     {
//         id: '8',
//         url: 'https://picsum.photos/400/300?random=28',
//     },
//     {
//         id: '9',
//         url: 'https://picsum.photos/400/300?random=29',
//     },
//     {
//         id: '10',
//         url: 'https://picsum.photos/400/300?random=30',
//     },
//     {
//         id: '11',
//         url: 'https://picsum.photos/400/300?random=31',
//     },
//     {
//         id: '12',
//         url: 'https://picsum.photos/400/300?random=32',
//     },
//     {
//         id: '13',
//         url: 'https://picsum.photos/400/300?random=33',
//     },
//     {
//         id: '14',
//         url: 'https://picsum.photos/400/300?random=34',
//     },
// ]

type EventRouteProp = RouteProp<RootStackParamList, 'Event'>;

type EventData = {
    id: number;
    name: string;
    people: EventPeople[];
    images: EventImages[];
};

const Event = () => {
    const route = useRoute<EventRouteProp>();
    const navigation = useNavigation();
    const { eventId, eventName } = route.params;

    const [eventData, setEventData] = useState<EventData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);
    const [imageSource, setImageSource] = useState<string>('');

    const hideModal = () => {
        setVisible(false);
        setImageSource("");
    }
    const showModal = (url: string) => {
        setImageSource(url);
        setVisible(true);
    }

    useEffect(() => {
        navigation.setOptions({ title: eventName });
    }, [eventName, navigation]);

    useEffect(() => {
        fetchEventDetails();
    }, [eventId]);

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
                    setLoading(false);
                    return;
                }
            }

            console.log('fetching fresh event data');

            const response = await EventAPI.returnEventData(eventId);
            const data = response.data;

            const photoMap = new Map(
                data.images?.map((img: any) => [img.id, img.url]) || []
            );

            const formattedData: EventData = {
                id: eventId || data.event_id?.toString(),
                name: eventName,
                people: data.people?.map((person: any) => ({
                    id: person.person_id.toString(),
                    name: person.person_name,
                    imageUrl: photoMap.get(person.photo_id),
                })) || [],
                images: data.images?.map((img: any) => ({
                    id: img.id?.toString(),
                    url: img.url,
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
    
    // const people = People;
    // const images = Images;
  return (
    <PaperProvider>
        <SafeAreaView style={styles.container}>
            <Portal>
                <Modal visible={visible} onDismiss={hideModal}>
                    <TouchableOpacity onPress={hideModal} style={{ width: '100%', height: '100%' }}>
                        <Image source={{ uri: imageSource }} style={{ width: '100%', height: '100%' }} resizeMode='contain' />
                    </TouchableOpacity>
                    
                </Modal>
            </Portal>
            <View style={styles.topContainer}>
                <Text style={{ color: 'black' }} variant='headlineLarge'> {eventData.name} </Text>
                <FlatList
                    style={{ padding: 5 }}
                    data={eventData.images}
                    numColumns={3}
                    horizontal={false}
                    inverted={true}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => showModal(item.url)}>
                            <Image style={styles.galleryImage} source={{ uri: item.url }} />
                        </TouchableOpacity>
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
                        <TouchableOpacity style={styles.personItem}>
                            <Image style={styles.personThumbnail} source={{ uri: item.imageUrl }} />
                            <Text variant='titleLarge'>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 5 }}>
                    <Button mode='contained'>Add Users</Button>
                    <Button mode='contained'>Upload Images</Button>
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
    }
})