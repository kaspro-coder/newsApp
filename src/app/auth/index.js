import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { router, Link } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { auth, db, storage } from '../../lib/firebaseApp';

export default function AuthIndex() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const cacheImageIfNeeded = async (uid, remoteUrl) => {
		if (!remoteUrl) return null;
		const cachePath = `${FileSystem.cacheDirectory}profile_${uid}.jpg`;
		try {
			const info = await FileSystem.getInfoAsync(cachePath);
			if (info.exists) {
				return cachePath;
			}
			const downloadResumable = FileSystem.createDownloadResumable(remoteUrl, cachePath);
			await downloadResumable.downloadAsync();
			return cachePath;
		} catch {
			return null;
		}
	};

	const onLogin = async () => {
		if (!email || !password) {
			Alert.alert('Error', 'Please enter email and password');
			return;
		}
		setIsLoading(true);
		try {
			const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
			const uid = cred.user.uid;
			const userDocRef = doc(db, 'users', uid);
			const snap = await getDoc(userDocRef);
			let profile = snap.exists() ? snap.data() : {};
			// Prefer local cached photo
			let localPhoto = await AsyncStorage.getItem(`profilePhoto:${uid}`);
			if (!localPhoto) {
				// try to download from storage
				if (profile?.photoPath) {
					const url = await getDownloadURL(ref(storage, profile.photoPath));
					localPhoto = await cacheImageIfNeeded(uid, url);
					if (localPhoto) {
						await AsyncStorage.setItem(`profilePhoto:${uid}`, localPhoto);
					}
				}
			}
			// Navigate to home
			router.replace('/home');
		} catch (e) {
			Alert.alert('Login failed', e?.message || 'Unknown error');
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
			<Text style={styles.title}>Login</Text>
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
			<TouchableOpacity style={styles.button} onPress={onLogin} disabled={isLoading}>
				<Text style={styles.buttonText}>{isLoading ? 'Please wait...' : 'Login'}</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.button, styles.guestButton]}
				onPress={() => router.replace('/home')}
				disabled={isLoading}
			>
				<Text style={[styles.buttonText, styles.guestButtonText]}>Continue as guest</Text>
			</TouchableOpacity>
			<Link href="/auth/register" style={styles.link}>Create an account</Link>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		justifyContent: 'center',
	},
	header: {
		position: 'absolute',
		top: 40,
		left: 16,
		flexDirection: 'row',
		alignItems: 'center',
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
	input: {
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.12)',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 12,
	},
	button: {
		backgroundColor: '#0b1221',
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
		marginTop: 4,
	},
	buttonText: {
		color: '#fff',
		fontWeight: '600',
	},
	guestButton: {
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.12)',
		marginTop: 10,
	},
	guestButtonText: {
		color: '#0b1221',
	},
	link: {
		marginTop: 16,
		textAlign: 'center',
		color: '#4169e1',
	}
});

