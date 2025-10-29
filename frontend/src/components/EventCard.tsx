import { StyleSheet, View, ScrollView, FlatList, TouchableOpacity, ImageBackground } from 'react-native'
import React, { useState } from 'react'
import { overlay, Text } from 'react-native-paper'
import { Eventt } from '../types/event'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types/navigation'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import { EventAPI } from '../api/events'

type EventCardProps = {
    event: Eventt;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const EventCard: React.FC<EventCardProps> = ({ event }) => {
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

    const deleteEvent = async () => {
        Haptics.selectionAsync();
        try {
            console.log('deleting...');
            const res = await EventAPI.deleteEvent(event.id);
            console.log(res.data);
            alert("Event deleted");
        } catch (error) {
            console.error(error);
        }
    }

  return (
      <View style={styles.container} >
        <FlatList
            data={scrollableImages}
            horizontal
            keyExtractor={(item, index) => `${event.id}-img-${index}`}
            renderItem={({ item }) => (
                <View>
                    <TouchableOpacity onPress={handleNavigation}>
                        <Image style={styles.image} source={{ uri: item }} />
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

        <TouchableOpacity onPress={handleNavigation} onLongPress={deleteEvent}><Text variant='headlineMedium' style={styles.title} >{event.name}</Text></TouchableOpacity>

      </View>
  )
}

export default EventCard

const styles = StyleSheet.create({
    image: {
        width: 150,
        height: 150,
        borderRadius: 10,
        marginRight: 10,
    },
    container: {
        marginBottom: 40,
        marginLeft: 5,
    },
    title: {
        color: '#c5efebff',
    },
    footer: {
        width: 150,
        height: 150,
        marginRight: 10,
        borderRadius: 10,
        overflow: 'hidden',
    },
    footerText: {
        color: 'white',
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