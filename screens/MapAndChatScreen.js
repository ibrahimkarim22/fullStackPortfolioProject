import { useEffect, useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import socketIOClient from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_KEY } from '@env';
import { useRoute } from '@react-navigation/native';

const serverKey = CLOUD_KEY;

let socket;

const getSocket = () => {
  if (!socket) {
    socket = socketIOClient(serverKey);
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }
  return socket;
};

const MapScreen = ({ route }) => {
  const { groupId: routeGroupId, groupName: routeGroupName, members: routeMembers } = route.params || {};
  const [currentLocation, setCurrentLocation] = useState(null);
  const [userLocations, setUserLocations] = useState({});
  const [localUserId, setLocalUserId] = useState(null);
  const [groupId, setGroupId] = useState(routeGroupId || '');
  const [groupName, setGroupName] = useState(routeGroupName || '');
  const [members, setMembers] = useState(routeMembers || []);
 
  
  useEffect(() => {
    const fetchGroupDetails = async () => {
      if (!routeGroupId) {
        const storedGroupId = await AsyncStorage.getItem('groupId');
        const storedLocalUserId = await AsyncStorage.getItem('userId');
        const storedGroupName = await AsyncStorage.getItem('groupName');
        const storedMembers = await AsyncStorage.getItem('members');
        const members = storedMembers ? JSON.parse(storedMembers) : [];

        console.log('Stored Group ID:', storedGroupId);
        console.log('Stored Local User ID:', storedLocalUserId);

        setLocalUserId(storedLocalUserId);
        setGroupId(storedGroupId);
        setGroupName(storedGroupName);
        setMembers(members);
  
      }
    };

    fetchGroupDetails();
  }, [routeGroupId, routeGroupName, routeMembers]); 

useEffect(() => {
  const fetchUserId = async () => {
    const userId = await AsyncStorage.getItem("userId");
    if (userId) {
      setLocalUserId(userId);
      console.log("local user id:", userId);
    } else {
      setLocalUserId(null);
      console.log("no local user id");
    }
  };
  fetchUserId();
}, []);

  useEffect(() => {
    const socket = getSocket();
    if (groupId && localUserId) {
      socket.emit('joinGroup', { accessKey: groupId, userId: localUserId});
      
      socket.on('groupJoined', ({ groupId, groupName, members }) => {
        setGroupId(groupId);
        setGroupName(groupName);
        setMembers(members);
     
      });

      socket.on('error', ({ message }) => {
        Alert.alert('Error', message);
      });

    socket.on('locationUpdated', data => {
      console.log('Received location update:', data);
      setUserLocations(prevLocations => ({
        ...prevLocations,
        [data.userId]: data.coordinates,
      }));
    });

    return () => {
      socket.off('locationUpdated');
      socket.off('groupJoined');
    };
  }
  }, [localUserId, groupId]); 

    const getLocationFromDevice = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access location was denied');
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      console.log(`Current location: ${latitude}, ${longitude}`);
      return { latitude, longitude };
    } catch (error) {
      console.error('Error fetching location:', error);
      Alert.alert('Error', 'Failed to fetch location. Please try again.');
      return null;
    }
  };

  useEffect(() => {
    let locationSubscription;

    const fetchLocation = async () => {
      const location = await getLocationFromDevice();
      if (location) {
        setCurrentLocation(location);
        const socket = getSocket();
        console.log('emitting location event', { userId: localUserId, coordinates: [location.latitude, location.longitude] });
        socket.emit('updateLocation', { userId: localUserId, coordinates: [location.latitude, location.longitude] });

        locationSubscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: .1 },
          (location) => {
            const { latitude, longitude } = location.coords;
            setCurrentLocation({ latitude, longitude });
            console.log('emitting location update', { userId: localUserId, coordinates: [latitude, longitude] });
            socket.emit('updateLocation', { userId: localUserId, coordinates: [latitude, longitude] });
          }
        );
      }
    };
    if (localUserId) {
      fetchLocation();
    }

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [localUserId, groupId]);

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.groupInfo}>{groupName}</Text>
      {currentLocation ? (
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}>
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="My Location"
            description="My first tracked location"
          />
          {Object.keys(userLocations).map(key => (
            <Marker
              key={key}
              coordinate={{
                latitude: userLocations[key][0],
                longitude: userLocations[key][1],
              }}
              title={`User ${key}`}
              description={`Location of user ${key}`}
            />
          ))}
        </MapView>
      ) : (
        <Text>Loading...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  groupInfo: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'green',
  },
});

export default MapScreen;
