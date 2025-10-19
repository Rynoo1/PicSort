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

const Events: Eventt[] = [
  {
    id: 1,
    name: 'Birthday Party',
    images: [
      'https://picsum.photos/400/300?random=1',
      'https://picsum.photos/400/300?random=2',
      'https://picsum.photos/400/300?random=3',
	  'https://picsum.photos/400/300?random=14',
    ],
  },
  {
    id: 2,
    name: 'Music Festival',
    images: [
      'https://picsum.photos/400/300?random=5',
      'https://picsum.photos/400/300?random=6',
      'https://picsum.photos/400/300?random=13',
	  'https://picsum.photos/400/300?random=15',
    ],
  },
  {
    id: 3,
    name: 'New Years Party',
    images: [
      'https://picsum.photos/400/300?random=9',
      'https://picsum.photos/400/300?random=10',
      'https://picsum.photos/400/300?random=11',
	  'https://picsum.photos/400/300?random=16',
    ],
  },
];

type User = {
	id: number;
	username: string;
}

const Main = () => {
	const [events, setEvents] = useState<Eventt[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<User[]>([]);
	const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	const [isSearching, setIsSearching] = useState(false);

	const { user: loggedInUser } = useAuth();

	const showResults = isSearchFocused && searchQuery.trim().length >= 2;

	useEffect(() => {
		if (searchQuery.trim().length < 2) {
			setSearchResults([]);
			setIsSearching(false);
			return;
		}

		setIsSearching(true);

		const timer = setTimeout(async () => {
			await searchUsers(searchQuery);
		}, 800);

		return () => {
			clearTimeout(timer);
		};
	}, [searchQuery]);

	const searchUsers = async (query: string) => {
		try {
			const response = await UserAPI.searchUsers(query);
			console.log(loggedInUser);
			
			const filteredResults = response.data.filter(
				(user: User) => 
					user.id !== Number(loggedInUser?.id) &&
					!selectedUsers.find(selected => selected.id === user.id)
			);
			console.log(filteredResults);

			setSearchResults(filteredResults);
		} catch (error) {
			console.error('Error searching users', error);
			setSearchResults([]);
		} finally {
			setIsSearching(false);
		}
	}

	const removeUser = (userId: number) => {
		setSelectedUsers(prev => prev.filter(user => user.id !== userId));
	}

	const addUser = (user: User) => {
		if (!selectedUsers.find(u => u.id === user.id)) {
			setSelectedUsers(prev => [...prev, user]);
			setSearchQuery('');
			setSearchResults([]);
		}
	};

	const [visible, setVisible] = useState(false);

	const showModal = () => setVisible(true);
	const hideModal = () => setVisible(false);

	useEffect(() => {
		fetchAllEvents();
	}, []);

	const fetchAllEvents = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await EventAPI.returnAllEvents();

			const formattedEvents: Eventt[] = response.data.map((event: any) => ({
				id: event.id,
				name: event.name,
				images: event.images?.map((img: any) => img.url || img) || [],
			}));

			setEvents(formattedEvents);
		} catch (error: any) {
			console.error('Error fetching events: ', error);
			setError(error.response?.data?.message || error.message || 'failed to load events');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<SafeAreaView>
				<ActivityIndicator size='large' color='#D94E5A' />
			</SafeAreaView>
		)
	}

	if (error) {
		return (
			<SafeAreaView>
				<Text>{error}</Text>
			</SafeAreaView>
		)
	}

  return (
	<PaperProvider>
		<SafeAreaView style={styles.container}>
			<Portal>
				<Modal visible={visible} contentContainerStyle={styles.modalContainer}>
					<View style={styles.modalView}>
						<Text variant='displaySmall' style={{ marginBottom: 10 }}>Create New Event</Text>
						<TextInput
							mode='outlined'
							style={{ marginBottom: 15, height: 45, fontSize: 20 }}
						/>
						<View style={styles.searchContainer}>
							<Searchbar 
								style={styles.searchBar} 
								inputStyle={styles.searchInput} 
								placeholder='Search'
								value={searchQuery} 
								onChangeText={setSearchQuery} 
								onFocus={() => setIsSearchFocused(true)} 
								onBlur={() => setTimeout(() => setIsSearchFocused(false), 800)} 
								loading={isSearching}
							/>
								{showResults && (
									<View style={styles.searchOverlay}>
										<ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
											{isSearching ? (
												<ActivityIndicator style={{ padding: 20 }} />
											) : searchResults.length > 0 ? (
												searchResults.map((user) => (
												<List.Item
													key={user.id}
													title={user.username}
													onPress={() => addUser(user)}
													left={props => <List.Icon {...props} icon="account" />}
												/>
											))
										) : (
											<Text variant='titleLarge'>No users Found</Text>
										)}
										</ScrollView>
									</View>
								
								)}
						</View>

						<ScrollView style={styles.chipScrollContainer}>
							<View style={styles.chipsWrapper}>
								{selectedUsers.map((user) => (
									<Chip key={user.id} onClose={() => removeUser(user.id)}>{user.username}</Chip>
								))}
							</View>
						</ScrollView>
						<View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 20 }}>
							<Button onPress={hideModal} mode='contained'>Press to Hide</Button>
							<Button onPress={hideModal} mode='contained'>Press to Hide</Button>
						</View>
						
					</View>
				</Modal>			
			</Portal>
			<Text variant='headlineLarge' style={styles.heading}>All Events</Text>
			<FlatList
				style={styles.list}
				data={events}
				keyExtractor={(item) => item.id.toString()}
				renderItem={({ item }) => <EventCard event={item} />}
				refreshing={loading}
				onRefresh={fetchAllEvents}
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
	marginLeft: 5,
	marginBottom: 10,
	color: '#D94E5A',
  },
  fab: {
	position: 'absolute',
	margin: 16,
	right: 20,
	bottom: 50,
  },
  modalContainer: {
	backgroundColor: 'white', 
	padding: 20,
  },
  modalView: {
	flexDirection: 'column',
  },
  chipScrollContainer: {
	maxHeight: 120,
	marginTop: 15,
  },
  chipsWrapper: {
	flexDirection: 'row',
	flexWrap: 'wrap',
	gap: 8,
  },
  searchBar: {
	height: 45,
  },
  searchInput: {
	minHeight: 0,
  },
  searchOverlay: {
	position: 'absolute',
	top: '100%',
	left: 0,
	right: 0,
	backgroundColor: 'white',
	maxHeight: 120,
	borderRadius: 8,
	elevation: 4,
	shadowColor: '#000',
	shadowOffset: { width: 0, height: 2 },
	shadowOpacity: 0.25,
	shadowRadius: 3.84,
	marginTop: 4,
  },
  searchContainer: {
	position: 'relative',
	zIndex: 10,
	marginBottom: 16,
  }
})