import { WebView } from 'react-native-webview';
import { SafeAreaView, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ uri: 'https://spontaneous-fenglisu-be914c.netlify.app' }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});