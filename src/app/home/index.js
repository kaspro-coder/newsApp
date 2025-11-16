import { View, Text } from 'react-native';

const NEWS_ITEMS = [
	{ id: '1', title: 'Nouvelle fonctionnalité lancée', date: '2025-11-12' },
	{ id: '2', title: 'Mise à jour de sécurité', date: '2025-11-10' },
	{ id: '3', title: 'Événement communautaire', date: '2025-11-05' },
];

export default function Index() {
	return (
		<View>
			{NEWS_ITEMS.map((item) => (
				<View key={item.id}>
					<Text>{item.title}</Text>
					<Text>{item.date}</Text>
				</View>
			))}
		</View>
	);
}
