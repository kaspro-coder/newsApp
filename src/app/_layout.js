import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <Stack
                screenOptions={{ contentStyle: { backgroundColor: '#fff' } }} // This is the screen options of the app
            >
                <Stack.Screen name="home" options={{headerShown: false}}/> 
                <Stack.Screen name="auth" /> 
                <Stack.Screen name="details" />
                <Stack.Screen name="+not-found" />
            </Stack >
        </SafeAreaView>
    );
}