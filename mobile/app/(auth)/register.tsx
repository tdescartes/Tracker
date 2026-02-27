import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";

export default function RegisterScreen() {
    const router = useRouter();
    const { register } = useAuthStore();
    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        company_name: "",
    });
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        setLoading(true);
        try {
            await register({
                name: form.company_name || `${form.first_name}'s Home`,
                email: form.email,
                admin_first_name: form.first_name,
                admin_last_name: form.last_name,
                admin_email: form.email,
                admin_password: form.password,
            });
            router.replace("/(tabs)");
        } catch {
            Alert.alert("Error", "Could not create account. Email may already be in use.");
        } finally {
            setLoading(false);
        }
    };

    const fields = [
        { key: "first_name", placeholder: "First Name", keyboard: "default" as const },
        { key: "last_name", placeholder: "Last Name", keyboard: "default" as const },
        { key: "email", placeholder: "Email", keyboard: "email-address" as const },
        { key: "password", placeholder: "Password (min 8 characters)", keyboard: "default" as const, secure: true },
        { key: "company_name", placeholder: "Household Name (e.g. Smith Family)", keyboard: "default" as const },
    ];

    return (
        <ScrollView contentContainerStyle={s.container}>
            <Text style={s.logo}>Tracker</Text>
            <Text style={s.subtitle}>Create your household account</Text>

            {fields.map((f) => (
                <TextInput
                    key={f.key}
                    style={s.input}
                    placeholder={f.placeholder}
                    keyboardType={f.keyboard}
                    autoCapitalize="none"
                    secureTextEntry={f.secure}
                    value={form[f.key as keyof typeof form]}
                    onChangeText={(v) => setForm({ ...form, [f.key]: v })}
                />
            ))}

            <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
                <Text style={s.btnText}>{loading ? "Creating account…" : "Create Account"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text style={s.link}>Already have an account? Sign in</Text>
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
