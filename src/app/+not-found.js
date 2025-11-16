import { View, Text } from 'react-native';

export default function NotFound() {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 24 }}>404 - Not Found</Text>
        </View>
    );
}