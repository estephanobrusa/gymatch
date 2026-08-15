import { StyleSheet, Text, View } from "react-native";

export default function MatchesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Matches</Text>
      <Text style={styles.subtitle}>Pendiente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    color: "#fafafa",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: "#71717a",
    fontSize: 15,
  },
});