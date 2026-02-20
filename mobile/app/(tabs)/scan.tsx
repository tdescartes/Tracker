import { useState } from "react";
import { View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { receiptApi } from "../../src/lib/api";
import { useRouter } from "expo-router";

export default function ScanScreen() {
    const qc = useQueryClient();
    const router = useRouter();
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<any>(null);

    const pickImage = async (fromCamera: boolean) => {
        const pickerFn = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
        const perm = fromCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!perm.granted) {
            Alert.alert("Permission required", fromCamera ? "Camera access is needed to scan receipts." : "Photo library access is needed.");
            return;
        }

        const picked = await pickerFn({ quality: 0.9, base64: false });
        if (picked.canceled || !picked.assets[0]) return;

        const imageUri = picked.assets[0].uri;
        setScanning(true);
        try {
            const { data } = await receiptApi.upload(imageUri);
            setResult(data);
        } catch {
            Alert.alert("Error", "Could not process receipt. Please try again.");
        } finally {
            setScanning(false);
        }
    };

    const confirmReceipt = async () => {
        if (!result) return;
        try {
            await receiptApi.confirm(result.id, {
                merchant_name: result.merchant_name,
                total_amount: result.total_amount,
                purchase_date: result.purchase_date,
                items: result.items,
            });
            qc.invalidateQueries({ queryKey: ["pantry"] });
            setResult(null);
            Alert.alert("Success!", "Items added to your pantry.", [{ text: "OK", onPress: () => router.push("/(tabs)/pantry") }]);
        } catch {
            Alert.alert("Error", "Could not save items.");
        }
    };

    if (result) {
        return (
            <ScrollView style={s.screen} contentContainerStyle={s.container}>
                <Text style={s.title}>Review & Confirm</Text>
                <Text style={s.merchant}>{result.merchant_name || "Unknown Store"}</Text>
                <Text style={s.meta}>{result.purchase_date || "Today"} · Total: ${parseFloat(result.total_amount || "0").toFixed(2)}</Text>

                <View style={s.itemList}>
                    {(result.items || []).map((item: any, i: number) => (
                        <View key={i} style={s.itemRow}>
                            <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                            <Text style={s.itemPrice}>${parseFloat(item.price).toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                <View style={s.btnRow}>
                    <TouchableOpacity style={s.btnCancel} onPress={() => setResult(null)}>
                        <Text style={s.btnCancelText}>Re-scan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.btnConfirm} onPress={confirmReceipt}>
                        <Text style={s.btnConfirmText}>Add to Pantry</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    return (
        <View style={[s.screen, s.center]}>
            {scanning ? (
                <View style={s.center}>
                    <ActivityIndicator size="large" color="#006994" />
                    <Text style={s.scanningText}>Scanning receipt…</Text>
                </View>
            ) : (
                <>
                    <Text style={s.title}>Scan a Receipt</Text>
                    <Text style={s.subtitle}>Take a photo or pick from your gallery</Text>

                    <TouchableOpacity style={s.bigBtn} onPress={() => pickImage(true)}>
                        <Text style={s.bigBtnIcon}>📷</Text>
                        <Text style={s.bigBtnText}>Take Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[s.bigBtn, s.bigBtnAlt]} onPress={() => pickImage(false)}>
                        <Text style={s.bigBtnIcon}>🖼️</Text>
                        <Text style={[s.bigBtnText, s.bigBtnAltText]}>Choose from Library</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f9fafb" },
    container: { padding: 16 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    title: { fontSize: 22, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 6 },
    subtitle: { fontSize: 14, color: "#708090", textAlign: "center", marginBottom: 32 },
    scanningText: { marginTop: 16, color: "#708090", fontSize: 15 },
    bigBtn: { backgroundColor: "#006994", borderRadius: 14, paddingVertical: 18, paddingHorizontal: 32, width: "100%", alignItems: "center", marginBottom: 12 },
    bigBtnAlt: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#006994" },
    bigBtnIcon: { fontSize: 28, marginBottom: 6 },
    bigBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
    bigBtnAltText: { color: "#006994" },
    merchant: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 2 },
    meta: { fontSize: 13, color: "#708090", marginBottom: 16 },
    itemList: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 20 },
    itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
    itemName: { flex: 1, fontSize: 14, color: "#374151" },
    itemPrice: { fontSize: 14, fontWeight: "600", color: "#111827" },
    btnRow: { flexDirection: "row", gap: 12 },
    btnCancel: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
    btnCancelText: { color: "#374151", fontWeight: "600" },
    btnConfirm: { flex: 1, backgroundColor: "#006994", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
    btnConfirmText: { color: "#fff", fontWeight: "700" },
});
