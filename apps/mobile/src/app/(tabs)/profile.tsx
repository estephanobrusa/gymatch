import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/hooks/use-auth";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => void signOut()}
      >
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  title: {
    color: "#fafafa",
    fontSize: 22,
    fontWeight: "700",
  },
  email: {
    color: "#71717a",
    fontSize: 15,
  },
  button: {
    marginTop: 12,
    backgroundColor: "#18181b",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: "#fafafa",
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.8,
  },
});