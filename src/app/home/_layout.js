// app/home/_layout.js
import { Stack } from 'expo-router';

export default function HomeLayout() {
  return (
    // Pas d'options ici, il hérite du parent
    <Stack>
      <Stack.Screen name="index" options={{headerShown : false}}/>
      <Stack.Screen name="profile" />
    </Stack>
  );
}