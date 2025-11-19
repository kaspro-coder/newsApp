import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
	ARTICLES_READ: 'readingStats:articlesRead',
	TOTAL_READING_TIME: 'readingStats:totalReadingTime',
	TOPIC_COUNTS: 'readingStats:topicCounts',
};

/**
 * Get all reading statistics
 */
export const getReadingStats = async () => {
	try {
		const [articlesRead, totalReadingTime, topicCountsJson] = await Promise.all([
			AsyncStorage.getItem(STORAGE_KEYS.ARTICLES_READ),
			AsyncStorage.getItem(STORAGE_KEYS.TOTAL_READING_TIME),
			AsyncStorage.getItem(STORAGE_KEYS.TOPIC_COUNTS),
		]);

		const articlesReadCount = articlesRead ? parseInt(articlesRead, 10) : 0;
		const totalTime = totalReadingTime ? parseInt(totalReadingTime, 10) : 0;
		const topicCounts = topicCountsJson ? JSON.parse(topicCountsJson) : {};

		return {
			articlesRead: articlesReadCount,
			totalReadingTime: totalTime,
			topicCounts,
		};
	} catch (error) {
		console.error('Error loading reading stats:', error);
		return {
			articlesRead: 0,
			totalReadingTime: 0,
			topicCounts: {},
		};
	}
};

/**
 * Increment articles read counter
 */
export const incrementArticlesRead = async () => {
	try {
		const current = await AsyncStorage.getItem(STORAGE_KEYS.ARTICLES_READ);
		const newCount = (current ? parseInt(current, 10) : 0) + 1;
		await AsyncStorage.setItem(STORAGE_KEYS.ARTICLES_READ, newCount.toString());
		return newCount;
	} catch (error) {
		console.error('Error incrementing articles read:', error);
	}
};

/**
 * Add reading time (in milliseconds)
 */
export const addReadingTime = async (timeMs) => {
	try {
		const current = await AsyncStorage.getItem(STORAGE_KEYS.TOTAL_READING_TIME);
		const newTime = (current ? parseInt(current, 10) : 0) + Math.round(timeMs);
		await AsyncStorage.setItem(STORAGE_KEYS.TOTAL_READING_TIME, newTime.toString());
		return newTime;
	} catch (error) {
		console.error('Error adding reading time:', error);
	}
};

/**
 * Increment topic count
 * @param {string} topic - Topic name (e.g., 'sport', 'technology', 'politics')
 */
export const incrementTopicCount = async (topic) => {
	try {
		if (!topic || typeof topic !== 'string') return;

		const topicKey = topic.toLowerCase().trim();
		if (!topicKey) return;

		const currentJson = await AsyncStorage.getItem(STORAGE_KEYS.TOPIC_COUNTS);
		const topicCounts = currentJson ? JSON.parse(currentJson) : {};
		topicCounts[topicKey] = (topicCounts[topicKey] || 0) + 1;
		await AsyncStorage.setItem(STORAGE_KEYS.TOPIC_COUNTS, JSON.stringify(topicCounts));
		return topicCounts;
	} catch (error) {
		console.error('Error incrementing topic count:', error);
	}
};

/**
 * Get top N topics by count
 * @param {number} topN - Number of top topics to return (default: 3)
 */
export const getTopTopics = async (topN = 3) => {
	try {
		const stats = await getReadingStats();
		const topicCounts = stats.topicCounts;

		// Sort topics by count (descending)
		const sortedTopics = Object.entries(topicCounts)
			.sort(([, countA], [, countB]) => countB - countA)
			.slice(0, topN)
			.map(([topic]) => topic);

		return sortedTopics;
	} catch (error) {
		console.error('Error getting top topics:', error);
		return [];
	}
};

/**
 * Format reading time from milliseconds to minutes
 */
export const formatReadingTime = (timeMs) => {
	const minutes = Math.round(timeMs / 60000);
	return minutes;
};

