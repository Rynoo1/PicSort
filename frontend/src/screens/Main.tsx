import { FlatList, ScrollView, StyleSheet, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import EventCard from '../components/EventCard'
import { Eventt } from '../types/event'
import { ActivityIndicator, Button, Chip, FAB, List, Modal, PaperProvider, Portal, Searchbar, Text, TextInput } from 'react-native-paper'
import { EventAPI } from '../api/events'
import CreateEvent from '../components/CreateEvent'
import { UserAPI } from '../api/users'
import { useAuth } from '../context/AuthContext'
import * as Haptics from 'expo-haptics'

type User = {
	id: number;
	username: string;
}

const Main = () => {
	const [events, setEvents] = useState<Eventt[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [visible, setVisible] = useState(false);
	
	const showModal = () => {
		Haptics.selectionAsync();
		setVisible(true);
	};

	const hideModal = () => {
		Haptics.selectionAsync();
		setVisible(false);
	};

	useEffect(() => {
		fetchAllEvents();
	}, []);

	const fetchAllEvents = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await EventAPI.returnAllEvents();
			
			if (response.data.length < 1 ) {
				setEvents([]);
			} else {

			const formattedEvents: Eventt[] = response.data.map((event: any) => ({
				id: event.id,
				name: event.name,
				images: event.images?.map((img: any) => img.storage_key || img) || [],
			}));

			setEvents(formattedEvents);
		}
		} catch (error: any) {
			console.error('Error fetching events: ', error);
			setError(error.response?.data?.message || error.message || 'failed to load events');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<ActivityIndicator size='large' color='#D94E5A' />
			</SafeAreaView>
		)
	}

	if (error) {
		return (
			<SafeAreaView style={styles.container}>
				<Text variant='headlineLarge' style={styles.heading}>{error}</Text>
			</SafeAreaView>
		)
	}

  return (
	<PaperProvider>
		<SafeAreaView style={styles.container}>
			<Portal>
				<CreateEvent visible={visible} onDismiss={hideModal} mode='create' reFetch={fetchAllEvents} />
			</Portal>
			<Text variant='headlineLarge' style={styles.heading}>All Events</Text>
			<FlatList
				style={styles.list}
				data={events}
				keyExtractor={(item) => item.id.toString()}
				renderItem={({ item }) => <EventCard event={item} />}
				refreshing={loading}
				onRefresh={fetchAllEvents}
				ListEmptyComponent={(
					<Text variant='headlineLarge' style={{ color: "#D94E5A", marginLeft: 20 }}>No Events Yet</Text>
				)}
			/>
			<FAB 
			icon='plus'
			customSize={60}
			style={styles.fab}
			onPress={showModal}
			/>
		</SafeAreaView>
	</PaperProvider>

  )
}

export default Main

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d0d0df4',
    flex: 1,
  },
  list: {
    marginTop: 20,
  },
  heading: {
	marginTop: 15,
	marginLeft: 10,
	marginBottom: 10,
	color: '#D94E5A',
  },
  fab: {
	position: 'absolute',
	margin: 16,
	right: 20,
	bottom: 50,
  },
})