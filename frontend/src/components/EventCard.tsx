import { StyleSheet, View, ScrollView, FlatList, TouchableOpacity, ImageBackground } from 'react-native'
import React, { useState } from 'react'
import { Button, IconButton, overlay, Text } from 'react-native-paper'
import { Eventt } from '../types/event'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types/navigation'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import { EventAPI } from '../api/events'

type EventCardProps = {
    event: Eventt;
    deleteEvent: (id: number) => void;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const EventCard: React.FC<EventCardProps> = ({ event, deleteEvent }) => {
    const navigation = useNavigation<NavigationProp>();
    const scrollableImages = event.images.slice(0, 3);
    const lastImage = event.images[3];

    const handleNavigation = () => {
        Haptics.selectionAsync();
        navigation.navigate('Event', {
            eventId: event.id,
            eventName: event.name,
        });
    };

    // const deleteEvent = async () => {
    //     Haptics.selectionAsync();
    //     try {
    //         console.log('deleting...');
    //         const res = await EventAPI.deleteEvent(event.id);
    //         console.log(res.data);
    //         alert("Event deleted");
    //     } catch (error) {
    //         console.error(error);
    //     }
    // }

  return (
      <View style={styles.container}>
        <FlatList
            data={scrollableImages}
            horizontal
            style={{ borderRadius: 10, }}
            keyExtractor={(item, index) => `${event.id}-img-${index}`}
            renderItem={({ item }) => (
                <View>
                    <TouchableOpacity onPress={handleNavigation}>
                        <Image style={styles.image} source={{ uri: item }} placeholder={{ blurhash: 'L5H2EC=PM+yV0g-mq.wG9c010J}I' }} />
                    </TouchableOpacity>
                </View>
            )}
            ListFooterComponent={
                <TouchableOpacity style={styles.footer} onPress={handleNavigation}>
                    <Image style={styles.footerImage} source={{ uri: lastImage }} />
                    <View style={styles.overlay}>
                        <Text variant='headlineSmall' style={styles.footerText}>View Event</Text>
                    </View>
                </TouchableOpacity>
            }
            showsHorizontalScrollIndicator={false}
        />

        <View style={{ flexDirection: 'row', alignItems: 'baseline', }}>
            <TouchableOpacity onPress={handleNavigation} style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', paddingRight: 48 }}>
                <Text variant='headlineMedium' numberOfLines={1} ellipsizeMode='tail' style={styles.title} >{event.name}</Text>
                <Text variant='bodyLarge' style={{ color: '#F2E3D5', marginStart: 10, }}>{event.userCount} Users</Text>
            </TouchableOpacity>
            <IconButton icon="delete" size={24} iconColor='#f2668bea' style={{ marginEnd: 6 }} onPress={() => {console.log('delete ', event.id); deleteEvent(event.id) }} />
        </View>

      </View>
  )
}
//024059
export default EventCard

const styles = StyleSheet.create({
    image: {
        width: 150,
        height: 150,
        borderRadius: 10,
        marginRight: 10,
    },
    container: {
        marginBottom: 30,
        paddingHorizontal: 9,
        paddingTop: 8,
        borderRadius: 15,
        // borderWidth: 2,
        // borderColor: '#03A688',
        backgroundColor: '#026773',
        flexDirection: 'column'
    },
    title: {
        color: '#F2E3D5',
        flex: 1,
    },
    footer: {
        width: 150,
        height: 150,
        borderRadius: 10,
        overflow: 'hidden',
    },
    footerText: {
        color: '#F2E3D5',
        textAlign: 'center',
        justifyContent: 'center',
    },
    footerImage: {
        width: '100%',
        height: '100%',
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