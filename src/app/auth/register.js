import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db, storage } from '../../lib/firebaseApp';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function Register() {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [localPhoto, setLocalPhoto] = useState(null);
	const [isLoading, setIsLoading] = useState(false);

	const pickImage = async () => {
		try {
			const { status, canAskAgain, granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!(granted || status === 'granted')) {
				if (!canAskAgain) {
					Alert.alert('Permission required', 'Enable Photos permission in Settings to pick an image.', [
						{ text: 'Cancel', style: 'cancel' },
						{ text: 'Open Settings', onPress: () => Linking.openSettings() },
					]);
				} else {
					Alert.alert('Permission required', 'Media library permission is needed to select a photo');
				}
				return;
			}
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.8,
			});
			if (!result.canceled) {
				const uri = result.assets?.[0]?.uri;
				if (uri) setLocalPhoto(uri);
			}
		} catch (e) {
			Alert.alert('Picker error', e?.message || 'Unable to open image library');
		}
	};

	const onRegister = async () => {
		if (!firstName || !lastName || !email || !password || !confirmPassword) {
			Alert.alert('Error', 'Please fill all fields');
			return;
		}
		if (password !== confirmPassword) {
			Alert.alert('Error', 'Passwords do not match');
			return;
		}
		setIsLoading(true);
		try {
			const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
			const uid = cred.user.uid;

			// Upload photo to Firebase Storage if present
			let photoPath = null;
			let photoURL = null;
			if (localPhoto) {
				// Use fetch(uri) → blob() method (recommended for Expo)
				// This avoids ArrayBuffer conversion issues
				const response = await fetch(localPhoto);
				const blob = await response.blob();
				photoPath = `profiles/${uid}.jpg`;
				const storageRef = ref(storage, photoPath);
				// Upload blob with explicit contentType
				await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
				photoURL = await getDownloadURL(storageRef);
				// Cache locally with a stable path
				const cachePath = `${FileSystem.cacheDirectory}profile_${uid}.jpg`;
				await FileSystem.copyAsync({ from: localPhoto, to: cachePath });
				await AsyncStorage.setItem(`profilePhoto:${uid}`, cachePath);
			}

			// Update auth displayName and photoURL
			await updateProfile(cred.user, {
				displayName: `${firstName} ${lastName}`,
				photoURL: photoURL || undefined,
			});

			// Save user doc to Firestore
			await setDoc(doc(db, 'users', uid), {
				firstName,
				lastName,
				email: email.trim(),
				photoURL: photoURL || null,
				photoPath: photoPath || null,
				createdAt: Date.now(),
			});

			Alert.alert('Success', 'Account created');
			router.replace('/home');
		} catch (e) {
			Alert.alert('Registration failed', e?.message || 'Unknown error');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Image
					source={require('../../../assets/logo_stayTuned.png')}
					style={styles.headerLogoLeft}
					resizeMode="contain"
				/>
				<Text style={styles.headerDivider}>|</Text>
				<Image
					source={require('../../../assets/logo-JE.png')}
					style={styles.headerLogoRight}
					resizeMode="contain"
				/>
			</View>
			<Text style={styles.title}>Register</Text>
			<View style={styles.row}>
				<TextInput
					style={[styles.input, { flex: 1, marginRight: 8 }]}
					placeholder="First name"
					value={firstName}
					onChangeText={setFirstName}
				/>
				<TextInput
					style={[styles.input, { flex: 1 }]}
					placeholder="Last name"
					value={lastName}
					onChangeText={setLastName}
				/>
			</View>
			<TextInput
				style={styles.input}
				placeholder="Email"
				autoCapitalize="none"
				keyboardType="email-address"
				value={email}
				onChangeText={setEmail}
			/>
			<TextInput
				style={styles.input}
				placeholder="Password"
				secureTextEntry
				value={password}
				onChangeText={setPassword}
			/>
			<TextInput
				style={styles.input}
				placeholder="Confirm password"
				secureTextEntry
				value={confirmPassword}
				onChangeText={setConfirmPassword}
			/>

			<TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
				{localPhoto ? (
					<View style={{ position: 'relative' }}>
						<Image source={{ uri: localPhoto }} style={styles.avatar} />
						<TouchableOpacity
							activeOpacity={0.8}
							style={styles.removeBtn}
							onPress={() => {
								setLocalPhoto(null);
							}}
						>
							<MaterialIcons name="cancel" size={20} color="#0b1221" />
						</TouchableOpacity>
					</View>
				) : (
					<Text style={styles.photoText}>Pick profile photo</Text>
				)}
			</TouchableOpacity>
			<TouchableOpacity style={styles.button} onPress={onRegister} disabled={isLoading}>
				<Text style={styles.buttonText}>{isLoading ? 'Please wait...' : 'Create account'}</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		paddingTop: 40,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 70,
	},
	headerLogoLeft: {
		height: 30,
		width: 100,
		transform: [{ scale: 5 }],
	},
	headerDivider: {
		marginHorizontal: 8,
		color: '#c0c4cc',
		fontSize: 18,
	},
	headerLogoRight: {
		height: 32,
		width: 32,
		borderRadius: 8,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		marginBottom: 16,
		textAlign: 'center',
	},
	row: {
		flexDirection: 'row',
		marginBottom: 12,
	},
	input: {
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.12)',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 12,
	},
	photoPicker: {
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.12)',
		borderRadius: 60,
		height: 120,
		width: 120,
		alignSelf: 'center',
		marginVertical: 12,
		backgroundColor: '#e9eef4',
	},
	avatar: {
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.12)',
		borderRadius: 60,
		height: 120,
		width: 120,
		alignSelf: 'center',
		marginVertical: 12,
		overflow: 'hidden',
		backgroundColor: '#e9eef4',
	},
	removeBtn: {
		position: 'absolute',
		top: 1,
		right: -10,
		height: 28,
		width: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffffff',
		borderWidth: 1,
		borderColor: '#fff',
	},
	removeBtnText: {
		color: '#fff',
		fontSize: 20,
		lineHeight: 20,
		marginTop: -2,
	},
	photoText: {
		color: '#60708a',
	},
	button: {
		backgroundColor: '#0b1221',
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
		marginTop: 8,
	},
	buttonText: {
		color: '#fff',
		fontWeight: '600',
	},
});

