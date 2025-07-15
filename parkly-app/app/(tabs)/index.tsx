import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#ffffff', dark: '#000000' }}
      headerImage={
        <Image
          source={require('@/assets/images/parkly_header.jpg')}
          style={{ width: '100%', height: 250 }}
          contentFit="cover"
          transition={Platform.OS === 'web' ? undefined : 300}
        />
      }
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title">Hello There!  <HelloWave /> </ThemedText>
        <ThemedText type='subtitle'> Finding a parking spot has never been easier. </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
});