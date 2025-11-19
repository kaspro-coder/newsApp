import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { auth, db, storage } from '../../lib/firebaseApp';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getReadingStats, formatReadingTime, getTopTopics } from '../../utils/readingStats';

export default function Profile() {
	const [userData, setUserData] = useState(null);
	const [profilePhoto, setProfilePhoto] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [readingStats, setReadingStats] = useState({
		articlesRead: 0,
		totalReadingTime: 0,
		topTopics: [],
	});

	const loadUserData = async () => {
		try {
			const user = auth.currentUser;
			if (!user) {
				router.replace('/auth');
				return;
			}

			const uid = user.uid;
			
			// 1. Try to get photo from phone storage first (priority)
			let localPhoto = await AsyncStorage.getItem(`profilePhoto:${uid}`);
			if (localPhoto) {
				// Verify the file still exists
				const fileInfo = await FileSystem.getInfoAsync(localPhoto);
				if (fileInfo.exists) {
					setProfilePhoto({ uri: localPhoto });
				} else {
					// Remove invalid cache entry
					await AsyncStorage.removeItem(`profilePhoto:${uid}`);
					localPhoto = null;
				}
			}

			// 2. Get user data from Firestore
			const userDocRef = doc(db, 'users', uid);
			const snap = await getDoc(userDocRef);
			const data = snap.exists() ? snap.data() : {};
			setUserData({
				email: user.email || data.email || 'N/A',
				firstName: data.firstName || 'N/A',
				lastName: data.lastName || 'N/A',
				displayName: user.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
				createdAt: data.createdAt || null,
				photoURL: data.photoURL || null,
				photoPath: data.photoPath || null,
			});

			// 3. If no local photo, try Firebase Storage
			if (!localPhoto && data.photoPath) {
				try {
					const url = await getDownloadURL(ref(storage, data.photoPath));
					// Cache it locally
					const cachePath = `${FileSystem.cacheDirectory}profile_${uid}.jpg`;
					const downloadResumable = FileSystem.createDownloadResumable(url, cachePath);
					const result = await downloadResumable.downloadAsync();
					if (result?.uri) {
						await AsyncStorage.setItem(`profilePhoto:${uid}`, result.uri);
						setProfilePhoto({ uri: result.uri });
					} else {
						setProfilePhoto({ uri: url });
					}
				} catch (error) {
					console.error('Error downloading photo from Firebase:', error);
					// Fallback to photoURL if available
					if (data.photoURL) {
						setProfilePhoto({ uri: data.photoURL });
					}
				}
			} else if (!localPhoto && data.photoURL) {
				setProfilePhoto({ uri: data.photoURL });
			}
		} catch (error) {
			console.error('Error loading user data:', error);
			Alert.alert('Error', 'Failed to load profile data');
		} finally {
			setIsLoading(false);
		}
	};

	const handleLogout = async () => {
		Alert.alert(
			'Logout',
			'Are you sure you want to logout?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Logout',
					style: 'destructive',
					onPress: async () => {
						setIsLoggingOut(true);
						try {
							await signOut(auth);
							router.replace('/auth');
						} catch (error) {
							console.error('Logout error:', error);
							Alert.alert('Error', 'Failed to logout');
						} finally {
							setIsLoggingOut(false);
						}
					},
				},
			]
		);
	};

	const loadReadingStats = async () => {
		try {
			const stats = await getReadingStats();
			const topTopics = await getTopTopics(3);
			setReadingStats({
				articlesRead: stats.articlesRead,
				totalReadingTime: formatReadingTime(stats.totalReadingTime),
				topTopics,
			});
		} catch (error) {
			console.error('Error loading reading stats:', error);
		}
	};

	useEffect(() => {
		loadUserData();
	}, []);

	// Refresh reading stats when screen comes into focus
	useFocusEffect(
		useCallback(() => {
			loadReadingStats();
		}, [])
	);

	if (isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#0b1221" />
			</View>
		);
	}

	const formatDate = (timestamp) => {
		if (!timestamp) return 'N/A';
		const date = new Date(timestamp);
		return date.toLocaleDateString('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
			<View style={styles.header}>
				<Text style={styles.title}>Profile</Text>
			</View>

			<View style={styles.profileSection}>
				{profilePhoto ? (
					<Image source={profilePhoto} style={styles.avatar} />
				) : (
					<View style={styles.avatarPlaceholder}>
						<MaterialIcons name="person" size={60} color="#60708a" />
					</View>
				)}
			</View>

			<View style={styles.dataSection}>
				<View style={styles.dataRow}>
					<Text style={styles.label}>Email</Text>
					<Text style={styles.value}>{userData?.email}</Text>
				</View>

				<View style={styles.separator} />

				<View style={styles.dataRow}>
					<Text style={styles.label}>First Name</Text>
					<Text style={styles.value}>{userData?.firstName}</Text>
				</View>

				<View style={styles.separator} />

				<View style={styles.dataRow}>
					<Text style={styles.label}>Last Name</Text>
					<Text style={styles.value}>{userData?.lastName}</Text>
				</View>

				<View style={styles.separator} />

				<View style={styles.dataRow}>
					<Text style={styles.label}>Display Name</Text>
					<Text style={styles.value}>{userData?.displayName}</Text>
				</View>

				<View style={styles.separator} />

				<View style={styles.dataRow}>
					<Text style={styles.label}>Account Created</Text>
					<Text style={styles.value}>{formatDate(userData?.createdAt)}</Text>
				</View>
			</View>

			<View style={styles.statsSection}>
				<Text style={styles.statsTitle}>Reading Statistics</Text>
				
				<View style={styles.statsRow}>
					<MaterialIcons name="article" size={20} color="#0b1221" style={styles.statsIcon} />
					<Text style={styles.statsLabel}>Articles read:</Text>
					<Text style={styles.statsValue}>{readingStats.articlesRead}</Text>
				</View>

				<View style={styles.separator} />

				<View style={styles.statsRow}>
					<MaterialIcons name="schedule" size={20} color="#0b1221" style={styles.statsIcon} />
					<Text style={styles.statsLabel}>Total reading time:</Text>
					<Text style={styles.statsValue}>{readingStats.totalReadingTime} min</Text>
				</View>

				<View style={styles.separator} />

				<View style={styles.statsRow}>
					<MaterialIcons name="category" size={20} color="#0b1221" style={styles.statsIcon} />
					<Text style={styles.statsLabel}>Top topics:</Text>
					<Text style={styles.statsValue}>
						{readingStats.topTopics.length > 0
							? readingStats.topTopics.map((topic, index) => (
									<Text key={topic}>
										{index > 0 && ', '}
										{topic.charAt(0).toUpperCase() + topic.slice(1)}
									</Text>
							  ))
							: 'None yet'}
					</Text>
				</View>
			</View>

			<TouchableOpacity
				style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
				onPress={handleLogout}
				disabled={isLoggingOut}
			>
				{isLoggingOut ? (
					<ActivityIndicator size="small" color="#fff" />
				) : (
					<>
						<MaterialIcons name="logout" size={20} color="#fff" style={styles.logoutIcon} />
						<Text style={styles.logoutButtonText}>Logout</Text>
					</>
				)}
			</TouchableOpacity>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	contentContainer: {
		paddingBottom: 32,
	},
	header: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 24,
		alignItems: 'center',
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		color: '#0b1221',
	},
	profileSection: {
		alignItems: 'center',
		marginBottom: 32,
	},
	avatar: {
		width: 120,
		height: 120,
		borderRadius: 60,
		borderWidth: 3,
		borderColor: '#e9eef4',
		backgroundColor: '#e9eef4',
	},
	avatarPlaceholder: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: '#e9eef4',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 3,
		borderColor: '#e9eef4',
	},
	dataSection: {
		backgroundColor: '#fff',
		marginHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.08)',
		paddingVertical: 8,
	},
	dataRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	label: {
		fontSize: 16,
		fontWeight: '600',
		color: '#60708a',
		flex: 1,
	},
	value: {
		fontSize: 16,
		color: '#0b1221',
		flex: 1,
		textAlign: 'right',
	},
	separator: {
		height: 1,
		backgroundColor: 'rgba(0,0,0,0.08)',
		marginHorizontal: 16,
	},
	logoutButton: {
		backgroundColor: '#b00020',
		borderRadius: 8,
		paddingVertical: 14,
		marginHorizontal: 16,
		marginTop: 32,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	logoutButtonDisabled: {
		opacity: 0.6,
	},
	logoutIcon: {
		marginRight: 8,
	},
	logoutButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	statsSection: {
		backgroundColor: '#fff',
		marginHorizontal: 16,
		marginTop: 24,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.08)',
		paddingVertical: 8,
	},
	statsTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#0b1221',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0,0,0,0.08)',
	},
	statsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	statsIcon: {
		marginRight: 12,
	},
	statsLabel: {
		fontSize: 16,
		fontWeight: '600',
		color: '#60708a',
		flex: 1,
	},
	statsValue: {
		fontSize: 16,
		color: '#0b1221',
		fontWeight: '500',
	},
});

