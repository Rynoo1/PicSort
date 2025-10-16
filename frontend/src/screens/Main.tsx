import { FlatList, StyleSheet } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import EventCard from '../components/EventCard'
import { Eventt } from '../types/event'
import { ActivityIndicator, FAB, Text } from 'react-native-paper'
import { EventAPI } from '../api/events'

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
]

const Main = () => {
	const [events, setEvents] = useState<Eventt[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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
	<SafeAreaView style={styles.container}>
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
		  onPress={() => console.log('Pressed')}
		/>
    </SafeAreaView>
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
  }
})