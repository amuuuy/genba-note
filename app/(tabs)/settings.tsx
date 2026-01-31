import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>設定画面</Text>
      <Text style={styles.hint}>ここに会社情報・単価設定が表示されます</Text>

      <View style={styles.linkContainer}>
        <Link href="/paywall" asChild>
          <Pressable style={styles.link}>
            <Text style={styles.linkText}>Proプランを見る</Text>
          </Pressable>
        </Link>

        <Link href="/data-handling" asChild>
          <Pressable style={styles.link}>
            <Text style={styles.linkText}>データ取扱説明</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  placeholder: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  linkContainer: {
    gap: 12,
  },
  link: {
    padding: 12,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
  },
});
