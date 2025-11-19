import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { incrementArticlesRead, addReadingTime, incrementTopicCount } from '../../utils/readingStats';

const getArticleImageUrl = (article) => {
	const candidates = [
		article?.image,
		article?.imageUrl,
		article?.image_url,
		article?.image?.url,
		article?.imageUrlLarge,
		article?.imageUrlSmall,
	];
	for (const candidate of candidates) {
		if (typeof candidate === 'string') {
			const value = candidate.trim();
			if (value && value.toLowerCase() !== 'null' && value.toLowerCase() !== 'none' && /^https?:\/\//i.test(value)) {
				return value;
			}
		}
	}
	return null;
};

const formatDate = (dateString) => {
	if (!dateString) return '';
	try {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now - date;
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
		if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
		if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

		const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
		return date.toLocaleDateString('en-US', options);
	} catch {
		return dateString;
	}
};

const formatAuthors = (authors) => {
	if (!authors || !Array.isArray(authors) || authors.length === 0) return null;
	if (authors.length === 1) return authors[0]?.name || authors[0] || 'Unknown author';
	if (authors.length === 2) {
		const a1 = authors[0]?.name || authors[0] || 'Unknown';
		const a2 = authors[1]?.name || authors[1] || 'Unknown';
		return `${a1} and ${a2}`;
	}
	const first = authors[0]?.name || authors[0] || 'Unknown';
	return `${first} and ${authors.length - 1} other${authors.length - 1 > 1 ? 's' : ''}`;
};

export default function DetailsIndex() {
	const params = useLocalSearchParams();
	const startTimeRef = useRef(null);
	const hasTrackedRef = useRef(false);

	const article = useMemo(() => {
		try {
			const raw = typeof params?.item === 'string' ? params.item : '';
			// Expo Router encodes params; try decode and parse
			const decoded = decodeURIComponent(raw);
			return JSON.parse(decoded);
		} catch {
			return {};
		}
	}, [params]);

	const imageUrl = getArticleImageUrl(article);
	const title = article?.title ?? 'No title';
	const dateString = article?.dateTimePub ?? article?.dateTime ?? article?.date ?? '';
	const formattedDate = formatDate(dateString);
	const authors = formatAuthors(article?.authors);
	const sourceTitle = article?.source?.title || article?.source?.uri || null;
	const body =
		article?.body ??
		article?.text ??
		article?.summary ??
		article?.description ??
		'';

	// Track reading statistics
	useEffect(() => {
		// Record article opened
		const trackArticleOpen = async () => {
			if (hasTrackedRef.current) return;
			hasTrackedRef.current = true;

			try {
				// Increment articles read counter
				await incrementArticlesRead();

				// Get the last selected category from storage (set by home screen)
				const lastCategory = await AsyncStorage.getItem('lastSelectedCategory');
				const topic = lastCategory || 'general';
				await incrementTopicCount(topic);
			} catch (error) {
				console.error('Error tracking article open:', error);
			}
		};

		// Start reading time timer
		startTimeRef.current = Date.now();
		trackArticleOpen();

		// Cleanup: stop timer and record reading time when component unmounts
		return () => {
			if (startTimeRef.current) {
				const readingTime = Date.now() - startTimeRef.current;
				if (readingTime > 0) {
					addReadingTime(readingTime).catch((error) => {
						console.error('Error tracking reading time:', error);
					});
				}
			}
		};
	}, []);

	return (
		<ScrollView contentContainerStyle={styles.container}>
			{imageUrl ? (
				<Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
			) : null}
			<View style={styles.content}>
				<Text style={styles.title}>{title}</Text>
				{authors && <Text style={styles.author}>By {authors}</Text>}
				{formattedDate && <Text style={styles.date}>{formattedDate}</Text>}
				{!!body && <Text style={styles.body}>{body}</Text>}
				{sourceTitle && (
					<View style={styles.sourceContainer}>
						<Text style={styles.sourceLabel}>Source:</Text>
						<Text style={styles.sourceText}>{sourceTitle}</Text>
					</View>
				)}
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingBottom: 24,
	},
	image: {
		width: '100%',
		height: 240,
		backgroundColor: '#e9eef4',
	},
	content: {
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: '#0b1221',
		marginBottom: 8,
	},
	author: {
		fontSize: 14,
		color: '#60708a',
		fontStyle: 'italic',
		marginBottom: 4,
	},
	date: {
		fontSize: 12,
		color: '#60708a',
		marginBottom: 12,
	},
	body: {
		fontSize: 16,
		lineHeight: 22,
		color: '#0b1221',
		marginBottom: 20,
	},
	sourceContainer: {
		marginTop: 20,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: 'rgba(0,0,0,0.08)',
		flexDirection: 'row',
		alignItems: 'center',
	},
	sourceLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#60708a',
		marginRight: 6,
	},
	sourceText: {
		fontSize: 14,
		color: '#0b1221',
		flex: 1,
	},
});
