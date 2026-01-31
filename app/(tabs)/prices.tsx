import { View, Text, StyleSheet } from 'react-native';

export default function UnitPricesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>単価表画面</Text>
      <Text style={styles.hint}>ここによく使う工事項目と単価が表示されます</Text>
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
  },
});
