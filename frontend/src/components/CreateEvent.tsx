import { ScrollView, StyleSheet, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Button, Chip, List, Modal, Portal, Searchbar, Text, TextInput } from 'react-native-paper'
import { useAuth } from '../context/AuthContext';
import { UserAPI } from '../api/users';
import { EventAPI } from '../api/events';

interface CreateEventModalProps {
  visible: boolean;
  onDismiss: () => void;
  mode: 'create' | 'search';
}

type User = {
	id: number;
	username: string;
}

const CreateEvent = ({ visible, onDismiss, mode }: CreateEventModalProps) => {

  const { user: loggedInUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [allUserIds, setAllUserIds] = useState<number[]>(loggedInUser?.id ? [Number(loggedInUser.id)] : []);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [eventName, setEventName] = useState('');

  

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
      setAllUserIds(prev => [...prev, user.id]);
      setSearchQuery('');
      setSearchResults([]);
    }
  }

  const createEvent = async (name: string, ids: number[]) => {
    try {
      console.log("All ids", ids);
      const success = await EventAPI.createEvent(name, ids);
      console.log('success', success.data);
      onDismiss();
    } catch (error) {
      console.error(error);
    }
  }

  return (
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
					<View style={styles.modalView}>
            {mode === 'create' ? (
              <>
                <Text variant='displaySmall' style={{ marginBottom: 10 }}>Create New Event</Text>
                <TextInput mode='outlined' style={{ marginBottom: 15, height: 45, fontSize: 20 }} value={eventName} onChangeText={setEventName} />
              </>
            ) : (
              <Text variant='displaySmall' style={{ marginBottom: 10 }}>Add Users</Text>
            )}

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
													key={user.id.toString()}
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
									<Chip key={user.id.toString()} onClose={() => removeUser(user.id)}>
                    {user.username}
                  </Chip>
								))}
							</View>
						</ScrollView>

						<View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 20 }}>
              <Button onPress={onDismiss} mode='contained'>Cancel</Button>
							<Button onPress={() => createEvent(eventName, allUserIds)} mode='contained'>Create</Button>
						</View>
						
					</View>
				</Modal>
  )
}

export default CreateEvent


const styles = StyleSheet.create({
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
  },
})