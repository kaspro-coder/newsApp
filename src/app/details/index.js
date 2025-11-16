import React, { useMemo } from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

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

export default function DetailsIndex() {
	const params = useLocalSearchParams();
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
	const title = article?.title ?? '';
	const date = article?.dateTimePub ?? article?.date ?? '';
	const body =
		article?.body ??
		article?.text ??
		article?.summary ??
		article?.description ??
		'';

	return (
		<ScrollView contentContainerStyle={styles.container}>
			{imageUrl ? (
				<Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
			) : null}
			<View style={styles.content}>
				<Text style={styles.title}>{title}</Text>
				{!!date && <Text style={styles.date}>{date}</Text>}
				{!!body && <Text style={styles.body}>{body}</Text>}
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
	date: {
		fontSize: 12,
		color: '#60708a',
		marginBottom: 12,
	},
	body: {
		fontSize: 16,
		lineHeight: 22,
		color: '#0b1221',
	},
});
