import { FlatList, ScrollView, StyleSheet, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import EventCard from '../components/EventCard'
import { Eventt } from '../types/event'
import { ActivityIndicator, Appbar, Button, Chip, Dialog, FAB, IconButton, List, Modal, PaperProvider, Portal, Searchbar, Text, TextInput } from 'react-native-paper'
import { EventAPI } from '../api/events'
import CreateEvent from '../components/CreateEvent'
import { UserAPI } from '../api/users'
import { useAuth } from '../context/AuthContext'
import * as Haptics from 'expo-haptics'
import { ImageBackground } from 'expo-image'

type User = {
	id: number;
	username: string;
}

const Main = () => {

	const { logout } = useAuth();

	const [events, setEvents] = useState<Eventt[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [visible, setVisible] = useState(false);
	const [selectedId, setSelectedId] = useState<number>();
	const [deleteCon, setDeleteCon] = useState(false);
	const [deleteState, setDeleteState] = useState({ visible: false, id: 0 });
	
	const showModal = () => {
		Haptics.selectionAsync();
		setVisible(true);
	};

	const hideModal = () => {
		Haptics.selectionAsync();
		setVisible(false);
		setDeleteState({ visible: false, id: 0 })
	};

	useEffect(() => {
		fetchAllEvents();
	}, []);

	const fetchAllEvents = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await EventAPI.returnAllEvents();
			// console.log(response.data[1].user_count);
			
			if (response.data.length < 1 ) {
				setEvents([]);
			} else {

			const formattedEvents: Eventt[] = response.data.map((event: any) => ({
				id: event.id,
				name: event.name,
				images: event.images?.map((img: any) => img.storage_key || img) || [],
				userCount: event.user_count,
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

	const deleteEvent = async (id: number) => {
		Haptics.selectionAsync();
		setDeleteState({ visible: true, id })
	};

	const confirmDelete = async () => {
		Haptics.selectionAsync();
		if (deleteState.id !== 0) {
			try {
				console.log('deleting...');
				const res = await EventAPI.deleteEvent(deleteState.id);
				console.log(res.data);
				alert("Event deleted");
				hideModal();
				fetchAllEvents();
			} catch (error) {
				console.error(error);
				hideModal();
			}
		} else {
			alert("No event selected");
		}
	};

	if (loading) {
		return (
			<SafeAreaView style={[styles.container, { paddingTop: 70 }]}>
				<ActivityIndicator size='large' color='#f2668bff' />
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
					<Dialog visible={deleteState.visible} onDismiss={hideModal}>
						<Dialog.Title>Are you sure?</Dialog.Title>
						<Dialog.Content>
							<Text variant='bodyMedium'>Confirm delete</Text>
							<Dialog.Actions>
								<Button onPress={confirmDelete}>Confirm</Button>
								<Button onPress={hideModal}>Cancel</Button>
							</Dialog.Actions>
						</Dialog.Content>
					</Dialog>
				</Portal>
				<View style={{ flexDirection: 'row' }}>
					<Text variant='displaySmall' style={styles.heading}>All Events</Text>
					<IconButton size={30} iconColor='#f2668bff' icon='account-arrow-right' style={{ flex: 1, alignItems: 'flex-end', marginEnd: 20 }} onPress={logout} />
				</View>
				<FlatList
					style={styles.list}
					data={events}
					keyExtractor={(item) => item.id.toString()}
					renderItem={({ item }) => <EventCard event={item} deleteEvent={() => deleteEvent(item.id)} />}
					refreshing={loading}
					onRefresh={fetchAllEvents}
					ListEmptyComponent={(
						<Text variant='headlineLarge' style={{ color: "#f2668bff", marginLeft: 20 }}>No Events Yet</Text>
					)}
				/>
				<FAB 
				icon='plus'
				color='#f2668bdb'
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
    backgroundColor: '#024059',
    flex: 1,
	paddingHorizontal: 7,
	
  },
  list: {
    marginTop: 10,
	marginBottom: 70,
  },
  heading: {
	marginTop: 7,
	marginLeft: 10,
	marginBottom: 10,
	color: '#03A688',
	flex: 1,
  },
  fab: {
	position: 'absolute',
	margin: 16,
	right: 20,
	bottom: 50,
	backgroundColor: '#025E73',
  },
})