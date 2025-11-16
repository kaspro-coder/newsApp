import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Button, FlatList, ActivityIndicator, Image, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';

const EVENT_API_KEY = process.env.EXPO_PUBLIC_EVENTREGISTRY_API_KEY;
const EVENT_API_URL = 'https://eventregistry.org/api/v1/article/getArticles';
const PAGE_SIZE = 50;

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

export default function Index() {
	const [articles, setArticles] = useState([]);
	const [error, setError] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [searchInput, setSearchInput] = useState('');
	const [activeQuery, setActiveQuery] = useState('');
	const inputRef = useRef(null);

	const fetchArticles = useCallback(async ({ reset = false, term } = {}) => {
		const targetPage = reset ? 1 : page;
		if (reset) {
			setIsLoading(true);
		} else {
			setIsLoadingMore(true);
		}
		try {
			const keyword = typeof term === 'string' ? term : activeQuery;
			const queryPayload = {
				query: {
					$query: {
						$and: [
							...(keyword
								? [
										{
											$or: [
												{ keyword: keyword, keywordLoc: 'body' },
												{ keyword: keyword, keywordLoc: 'title' },
											],
										},
								  ]
								: []),
							{
								$or: [{ lang: 'eng' }, { lang: 'fra' }],
							},
						],
					},
					$filter: {
						forceMaxDataTimeWindow: '31',
						startSourceRankPercentile: 0,
						endSourceRankPercentile: 40,
						isDuplicate: 'skipDuplicates',
					},
				},
				resultType: 'articles',
				articlesSortBy: 'date',
				articlesCount: PAGE_SIZE,
				articlesPage: targetPage,
				apiKey: EVENT_API_KEY,
			};
			const response = await fetch(EVENT_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(queryPayload),
			});

			const contentType = response.headers?.get?.('content-type') || '';
			const rawText = await response.text();
			let data = null;

			data = contentType.includes('application/json') ? JSON.parse(rawText) : JSON.parse(rawText);
		
			const results = data?.articles?.results ?? [];
			setHasMore(results.length >= PAGE_SIZE);
			if (reset || targetPage === 1) {
				setArticles(results);
			} else {
				setArticles((prev) => [...prev, ...results]);
			}
			setPage(targetPage + 1);
			setError(null);
		} catch (error) {
			console.error('Erreur lors de la récupération des articles:', error);
			const message = (error?.message || '').includes('Network request failed')
				? 'Network error. Please connect to the internet and try again.'
				: (error?.message || 'Unknown error');
			setError(message);
		} finally {
			if (reset) {
				setIsLoading(false);
			} else {
				setIsLoadingMore(false);
			}
		}
	}, [page, activeQuery]);

	useEffect(() => {
		fetchArticles({ reset: true });
	}, []);
	return (
		<View style={{ flex: 1 }}>
			<FlatList
				contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 12, paddingBottom: 96 }}
				data={articles}
				keyExtractor={(item, index) => item.uri ?? item.id ?? item.title ?? String(index)}
				renderItem={({ item }) => {
					const imageUrl = getArticleImageUrl(item);
					return (
						<TouchableOpacity
							activeOpacity={0.8}
							onPress={() => {
								try {
									const payload = encodeURIComponent(JSON.stringify(item));
									router.push({ pathname: '/details', params: { item: payload } });
								} catch {
									// fallback: push without params
									router.push('/details');
								}
							}}
						>
							<View style={styles.card}>
								{imageUrl ? (
									<Image
										source={{ uri: imageUrl }}
										style={styles.thumbnail}
										resizeMode="cover"
									/>
								) : null}
								<View style={styles.cardBody}>
									<Text style={styles.title} numberOfLines={2}>
										{item.title}
									</Text>
									<Text style={styles.date}>
										{item.dateTimePub ?? item.date ?? ''}
									</Text>
								</View>
							</View>
						</TouchableOpacity>
					);
				}}
				ItemSeparatorComponent={() => <View style={styles.separator} />}
				refreshing={isLoading}
				onRefresh={() => {
					setActiveQuery('');
					setSearchInput('');
					setIsSearchOpen(false);
					fetchArticles({ reset: true, term: '' });
				}}
				onEndReachedThreshold={0.5}
				onEndReached={() => {
				 if (!isLoading && !isLoadingMore && hasMore) {
						fetchArticles({ reset: false });
					}
				}}
				ListHeaderComponent={() => (
					<View>
						<View style={styles.header}>
							<Image
								source={require('../../../assets/logo_stayTuned.png')}
								style={styles.headerLogo}
								resizeMode="contain"
							/>
						</View>
						{error ? (
							<View style={styles.errorContainer}>
								<Text style={styles.errorText}>{error}</Text>
								<Button title={isLoading ? 'Retrying...' : 'Retry'} onPress={() => fetchArticles({ reset: true })} disabled={isLoading} />
							</View>
						) : null}
					</View>
				)}
				ListFooterComponent={
					isLoadingMore ? (
						<View style={styles.footer}>
							<ActivityIndicator />
						</View>
					) : null
				}
				ListEmptyComponent={
					!isLoading && !error ? (
						<View style={styles.empty}>
							<Text style={styles.emptyText}>No news yet.</Text>
						</View>
					) : null
				}
			/>
			{isSearchOpen && (
				<View style={styles.searchBarContainer}>
					<TextInput
						ref={inputRef}
						style={styles.searchInput}
						placeholder="Search news..."
						placeholderTextColor="#97A0AE"
						value={searchInput}
						onChangeText={setSearchInput}
						returnKeyType="search"
						onSubmitEditing={() => {
							const term = (searchInput || '').trim();
							setActiveQuery(term);
							fetchArticles({ reset: true, term });
						}}
					/>
				</View>
			)}
			<TouchableOpacity
				activeOpacity={0.8}
				style={styles.fabRight}
				onPress={() => {
					setIsSearchOpen((prev) => !prev);
					setTimeout(() => {
						if (inputRef.current) {
							inputRef.current.focus();
						}
					}, 50);
				}}
			>
				<Feather name="search" size={22} color="#0b1221" />
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#fff',
		borderRadius: 10,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.06)',
	},
	thumbnail: {
		width: '100%',
		height: 180,
		backgroundColor: '#e9eef4',
	},
	cardBody: {
		padding: 10,
	},
	title: {
		fontSize: 16,
		fontWeight: '600',
		color: '#0b1221',
		marginBottom: 4,
	},
	date: {
		fontSize: 12,
		color: '#60708a',
	},
	separator: {
		height: 10,
	},
	errorContainer: {
		paddingHorizontal: 12,
		paddingBottom: 8,
	},
	errorText: {
		color: '#b00020',
		marginBottom: 6,
	},
	footer: {
		paddingVertical: 16,
	},
	empty: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		color: '#60708a',
	},
	header: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 8,
		paddingBottom: 12,
	},
	headerLogo: {
		height: 30,
		width: 180,
		transform: [{ scale: 5 }], // visually larger without increasing header height
	},
	fabRight: {
		position: 'absolute',
		right: 16,
		bottom: 16,
		backgroundColor: '#fff',
		borderRadius: 22,
		width: 44,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.08)',
		elevation: 2,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 3,
		shadowOffset: { width: 0, height: 1 },
	},
	searchBarContainer: {
		position: 'absolute',
		left: 12,
		right: 12,
		bottom: 76,
		backgroundColor: '#fff',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.08)',
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	searchInput: {
		height: 40,
		fontSize: 16,
		color: '#0b1221',
	}
});
