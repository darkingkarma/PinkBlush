import { StyleSheet,Text,View, Image } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/Pink Blush Fashion Logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.subtitle}>
        Garment Order and Production Management
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf9f8',
    paddingHorizontal: 30,
  },
  logo: {
    width: 280,
    height: 140,
  },
  subtitle: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#555',
    textAlign: 'center',
    marginTop: 14,
  },
});