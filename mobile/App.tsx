import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { loginEmployee, submitAttendance, testQrMatch } from "./src/lib/api";
import { clearSession, loadSession, saveSession } from "./src/lib/storage";
import type { EmployeeProfile, MovementType } from "./src/types";

const movementMeta: {
  type: MovementType;
  label: string;
  description: string;
  requiresQr: boolean;
}[] = [
  {
    type: "ENTRY",
    label: "Giris",
    description: "QR ve konum kontrolu ile mesai baslatir.",
    requiresQr: true,
  },
  {
    type: "EXIT",
    label: "Cikis",
    description: "QR ve konum kontrolu ile mesaiyi kapatir.",
    requiresQr: true,
  },
  {
    type: "BREAK_START",
    label: "Mola Giris",
    description: "Molayi baslatir, sadece hareket kaydi olusturur.",
    requiresQr: false,
  },
  {
    type: "BREAK_END",
    label: "Mola Cikis",
    description: "Molayi bitirir, sadece hareket kaydi olusturur.",
    requiresQr: false,
  },
  {
    type: "MEAL_START",
    label: "Yemek Giris",
    description: "Yemek molasini baslatir.",
    requiresQr: false,
  },
  {
    type: "MEAL_END",
    label: "Yemek Cikis",
    description: "Yemek molasini bitirir.",
    requiresQr: false,
  },
];

function parseQrToken(rawValue: string) {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as { qrToken?: string; token?: string };
    if (parsed.qrToken) {
      return parsed.qrToken;
    }

    if (parsed.token) {
      return parsed.token;
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

export default function App() {
  const [, requestCameraPermission] = useCameraPermissions();
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("ahmet@demosirketi.com");
  const [password, setPassword] = useState("Personel123!");
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [scanTarget, setScanTarget] = useState<MovementType | null>(null);
  const [qrTestInput, setQrTestInput] = useState("");

  useEffect(() => {
    let active = true;

    loadSession()
      .then((session) => {
        if (!active) {
          return;
        }

        if (session.token && session.profile) {
          setToken(session.token);
          setProfile(session.profile);
        }
      })
      .finally(() => {
        if (active) {
          setCheckingSession(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const employeeName = useMemo(() => {
    if (!profile) {
      return "";
    }

    return `${profile.firstName} ${profile.lastName}`.trim();
  }, [profile]);

  async function handleLogin() {
    try {
      setBusy(true);
      setMessage(null);

      const response = await loginEmployee(email, password);
      await saveSession(response.token, response.employee);

      setToken(response.token);
      setProfile(response.employee);
      setMessage("Mobil oturum acildi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Giris basarisiz.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await clearSession();
    setToken(null);
    setProfile(null);
    setMessage("Oturum kapatildi.");
  }

  async function submitSimpleMovement(type: MovementType) {
    if (!token) {
      return;
    }

    try {
      setBusy(true);
      setMessage(null);
      await submitAttendance({ token, type });
      const matchedMovement = movementMeta.find((item) => item.type === type);
      const movementLabel = matchedMovement ? matchedMovement.label : type;
      setMessage(`${movementLabel} kaydi basarili.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hareket kaydi basarisiz.");
    } finally {
      setBusy(false);
    }
  }

  async function handleQrTest() {
    if (!token) {
      return;
    }

    try {
      setBusy(true);
      setMessage(null);

      const result = await testQrMatch(token, qrTestInput.trim());
      setQrTestInput("");
      setMessage(
        `QR eslesmesi basarili. ${result.deviceName} icin token hemen yenilendi: ${result.nextQrToken}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "QR testi basarisiz.");
    } finally {
      setBusy(false);
    }
  }

  async function requestScan(type: MovementType) {
    const permissionResult = await requestCameraPermission();

    if (!permissionResult.granted) {
      Alert.alert("Kamera izni gerekli", "Giris ve cikis hareketleri icin kamera izni vermelisin.");
      return;
    }

    const locationPermission = await Location.requestForegroundPermissionsAsync();

    if (!locationPermission.granted) {
      Alert.alert("Konum izni gerekli", "Giris ve cikis hareketleri icin konum izni vermelisin.");
      return;
    }

    setScanTarget(type);
    setMessage(null);
  }

  async function handleQrScanned(rawValue: string) {
    if (!token || !scanTarget || busy) {
      return;
    }

    try {
      setBusy(true);
      setScanTarget(null);
      const qrToken = parseQrToken(rawValue);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const result = await submitAttendance({
        token,
        type: scanTarget,
        qrToken,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const matchedMovement = movementMeta.find((item) => item.type === scanTarget);
      const movementLabel = matchedMovement ? matchedMovement.label : scanTarget;
      const nextQrToken = result.nextQrToken ? result.nextQrToken : "-";

      setMessage(
        `${movementLabel} basarili. Yeni QR token hazirlandi: ${nextQrToken}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "QR islemi basarisiz.");
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#36d7ff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      {scanTarget ? (
        <Modal transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {(movementMeta.find((item) => item.type === scanTarget) || { label: scanTarget }).label} icin QR okut
              </Text>
              <Text style={styles.modalText}>
                Cihaz ekranindaki guncel QR kodu okut. Basarili kayittan sonra backend yeni UUID uretecek.
              </Text>

              <View style={styles.cameraFrame}>
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                  }}
                  onBarcodeScanned={({ data }) => {
                    void handleQrScanned(data);
                  }}
                />
              </View>

              <Pressable style={styles.cancelButton} onPress={() => setScanTarget(null)}>
                <Text style={styles.cancelButtonText}>Vazgec</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}

      {!token || !profile ? (
        <ScrollView contentContainerStyle={styles.authWrap}>
          <View style={styles.authCard}>
            <Text style={styles.eyebrow}>CheckInQR Mobile</Text>
            <Text style={styles.title}>Personel Girisi</Text>
            <Text style={styles.subtitle}>
              Firma admininin tanimladigi mobil hesapla giris yap. Giris ve cikista QR ile konum dogrulamasi aktif.
            </Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-posta"
              placeholderTextColor="#8393ae"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Sifre"
              placeholderTextColor="#8393ae"
              secureTextEntry
              style={styles.input}
            />

            <Pressable style={styles.primaryButton} onPress={() => void handleLogin()} disabled={busy}>
              <Text style={styles.primaryButtonText}>
                {busy ? "Giris Yapiliyor..." : "Giris Yap"}
              </Text>
            </Pressable>

            {message ? <Text style={styles.messageText}>{message}</Text> : null}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.appWrap}>
          <View style={styles.headerCard}>
            <View>
              <Text style={styles.eyebrow}>Aktif Personel</Text>
              <Text style={styles.title}>{employeeName}</Text>
              <Text style={styles.subtitle}>
                {profile.companyName} · {profile.department}
              </Text>
            </View>

            <Pressable style={styles.secondaryButton} onPress={() => void handleLogout()}>
              <Text style={styles.secondaryButtonText}>Cikis</Text>
            </Pressable>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Faz 3 Mobil Akis</Text>
            <Text style={styles.infoText}>
              Giris ve cikis hareketleri QR ve konum dogrulamasi ister. Mola ve yemek hareketleri direkt attendance API sistemine kayit dusurur.
            </Text>
          </View>

          <View style={styles.testCard}>
            <Text style={styles.testTitle}>Kamerasiz QR Testi</Text>
            <Text style={styles.testText}>
              PC'de webcam olmadigi icin once QR eslesmesini ayri test ediyoruz. Alan bos kalirsa sistem firmanin guncel aktif QR tokenini kullanir ve basarili olursa ESP32 QR hemen yenilenir.
            </Text>
            <TextInput
              value={qrTestInput}
              onChangeText={setQrTestInput}
              placeholder="Opsiyonel: manuel QR token"
              placeholderTextColor="#8393ae"
              autoCapitalize="none"
              style={styles.input}
            />
            <Pressable style={styles.testButton} onPress={() => void handleQrTest()} disabled={busy}>
              <Text style={styles.testButtonText}>
                {busy ? "QR Test Ediliyor..." : "QR Eslesmesini Test Et"}
              </Text>
            </Pressable>
          </View>

          {message ? <Text style={styles.messageText}>{message}</Text> : null}

          <View style={styles.grid}>
            {movementMeta.map((item) => (
              <Pressable
                key={item.type}
                style={styles.movementCard}
                onPress={() =>
                  item.requiresQr
                    ? void requestScan(item.type)
                    : void submitSimpleMovement(item.type)
                }
                disabled={busy}
              >
                <Text style={styles.movementTitle}>{item.label}</Text>
                <Text style={styles.movementDesc}>{item.description}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.footerBox}>
            <Text style={styles.footerText}>API baglantisi: backend URL uygulama icindeki app.json dosyasindan okunur.</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#07111f",
  },
  centeredScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#07111f",
  },
  authWrap: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  appWrap: {
    padding: 20,
    gap: 16,
  },
  authCard: {
    backgroundColor: "#0f1c2d",
    borderRadius: 24,
    padding: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerCard: {
    backgroundColor: "#0f1c2d",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  infoCard: {
    backgroundColor: "#10253d",
    borderRadius: 20,
    padding: 18,
  },
  infoTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  infoText: {
    color: "#b9c8dd",
    lineHeight: 22,
  },
  testCard: {
    backgroundColor: "#15231b",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(142,231,168,0.22)",
    gap: 12,
  },
  testTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  testText: {
    color: "#bfe7ca",
    lineHeight: 21,
  },
  testButton: {
    backgroundColor: "#29b765",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  testButtonText: {
    color: "#04100a",
    fontSize: 15,
    fontWeight: "800",
  },
  eyebrow: {
    color: "#36d7ff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#b9c8dd",
    marginTop: 8,
    lineHeight: 22,
  },
  input: {
    backgroundColor: "#16263b",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  primaryButton: {
    backgroundColor: "#1a8fff",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  grid: {
    gap: 12,
  },
  movementCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#0f1c2d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  movementTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  movementDesc: {
    color: "#b9c8dd",
    lineHeight: 20,
  },
  messageText: {
    color: "#8ee7a8",
    marginTop: 4,
    lineHeight: 22,
  },
  footerBox: {
    marginTop: 6,
    paddingBottom: 20,
  },
  footerText: {
    color: "#7f91ab",
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3,7,13,0.85)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#0f1c2d",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  modalText: {
    color: "#b9c8dd",
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 16,
  },
  cameraFrame: {
    height: 340,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  cancelButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cancelButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
