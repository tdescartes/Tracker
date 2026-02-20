import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useAuthStore();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            await login(email, password);
            router.replace("/(tabs)");
        } catch {
            Alert.alert("Error", "Invalid email or password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={s.container}>
            <Text style={s.logo}>Tracker</Text>
            <Text style={s.subtitle}>Sign in to your household</Text>

            <TextInput
                style={s.input}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={s.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
                <Text style={s.btnText}>{loading ? "Signing in…" : "Sign In"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                <Text style={s.link}>Don't have an account? Create one</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const s = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: "#f9fafb", justifyContent: "center", padding: 24 },
    logo: { fontSize: 32, fontWeight: "800", color: "#006994", textAlign: "center", marginBottom: 4 },
    subtitle: { fontSize: 15, color: "#708090", textAlign: "center", marginBottom: 32 },
    input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, fontSize: 15 },
    btn: { backgroundColor: "#006994", borderRadius: 10, paddingVertical: 14, marginTop: 4 },
    btnText: { color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 16 },
    link: { color: "#006994", textAlign: "center", marginTop: 20, fontSize: 14 },
});
