import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  BackHandler,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";

// Default dev server URL for POS Universal SaaS
const DEFAULT_URL = "http://localhost:8082";
// Helper fallback for Android Emulator to connect to localhost
const EMULATOR_URL = "http://10.0.2.2:8082";

export default function App() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serverUrl, setServerUrl] = useState(DEFAULT_URL);
  const [inputUrl, setInputUrl] = useState(DEFAULT_URL);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Handle physical Back Button on Android
  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => backHandler.remove();
  }, [canGoBack]);

  const handleSaveUrl = () => {
    let formatted = inputUrl.trim();
    if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
      formatted = "http://" + formatted;
    }
    setServerUrl(formatted);
    setIsSettingsOpen(false);
    setHasError(false);
    setIsLoading(true);
  };

  return (
    <SafeAreaView style={[styles.container, isLandscape && styles.containerLandscape]}>
      <StatusBar hidden={isLandscape} style="light" backgroundColor="#0f172a" />

      {/* Top Mobile App Header Bar (Shown in Portrait Mode on HP) */}
      {!isLandscape && (
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>POS UNIVERSAL SAAS</Text>
            <Text style={styles.headerSubtitle}>
              {serverUrl.replace("http://", "").replace("https://", "")}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => setIsSettingsOpen(true)}
            >
              <Text style={styles.settingsButtonText}>⚙️ Server</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                Alert.alert(
                  "Keluar Aplikasi",
                  "Apakah Anda yakin ingin keluar dari akun kasir?",
                  [
                    { text: "Batal", style: "cancel" },
                    {
                      text: "Keluar",
                      style: "destructive",
                      onPress: () => {
                        if (webViewRef.current) {
                          const logoutJS = `
                            try {
                              localStorage.removeItem("pos_user");
                              localStorage.removeItem("pos_active_business_type");
                              localStorage.removeItem("pos_active_branch");
                              sessionStorage.clear();
                            } catch(e) {}
                            window.location.href = "/";
                            true;
                          `;
                          webViewRef.current.injectJavaScript(logoutJS);
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.logoutButtonText}>🚪 Keluar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Fullscreen WebView Component */}
      <View style={styles.webviewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: serverUrl }}
          style={styles.webview}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
          }}
          onLoadStart={() => {
            setIsLoading(true);
            setHasError(false);
          }}
          onLoadEnd={() => setIsLoading(false)}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn("WebView error: ", nativeEvent);
            setHasError(true);
            setIsLoading(false);
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Memuat POS Universal SaaS...</Text>
            </View>
          )}
        />

        {/* Error Fallback View */}
        {hasError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>⚠️ Gagal Memuat Server POS</Text>
            <Text style={styles.errorDesc}>
              Pastikan server web POS running di laptop Anda ({serverUrl}) dan HP berada di jaringan Wi-Fi yang sama.
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setHasError(false);
                setIsLoading(true);
                webViewRef.current?.reload();
              }}
            >
              <Text style={styles.retryButtonText}>🔄 Coba Lagi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: "#334155", marginTop: 10 }]}
              onPress={() => setIsSettingsOpen(true)}
            >
              <Text style={styles.retryButtonText}>⚙️ Ganti URL Server</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Settings Modal to Change Host Server URL */}
      <Modal visible={isSettingsOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚙️ Pengaturan URL Server POS</Text>
            <Text style={styles.modalSub}>
              Gunakan IP Local Laptop Anda (misal: http://192.168.1.10:8082) agar HP/Expo Go bisa terhubung.
            </Text>

            <TextInput
              style={styles.urlInput}
              value={inputUrl}
              onChangeText={setInputUrl}
              placeholder="http://192.168.1.x:8082"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.presetContainer}>
              <TouchableOpacity
                style={styles.presetBadge}
                onPress={() => setInputUrl(DEFAULT_URL)}
              >
                <Text style={styles.presetText}>localhost:8082</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetBadge}
                onPress={() => setInputUrl(EMULATOR_URL)}
              >
                <Text style={styles.presetText}>10.0.2.2:8082 (Emulator)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsSettingsOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveUrl}
              >
                <Text style={styles.saveButtonText}>Simpan & Muat Ulang</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingTop: Platform.OS === "android" ? 30 : 0,
  },
  containerLandscape: {
    paddingTop: 0,
  },
  header: {
    height: 48,
    backgroundColor: "#1e293b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: "#38bdf8",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingsButton: {
    backgroundColor: "#334155",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  settingsButtonText: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  logoutButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  webview: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  loadingText: {
    color: "#94a3b8",
    marginTop: 12,
    fontSize: 12,
    fontWeight: "600",
  },
  errorContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 20,
  },
  errorTitle: {
    color: "#f87171",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  errorDesc: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e293b",
    width: "100%",
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 6,
  },
  modalSub: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 14,
  },
  urlInput: {
    backgroundColor: "#0f172a",
    borderColor: "#334155",
    borderWidth: 1,
    color: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 12,
  },
  presetContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  presetBadge: {
    backgroundColor: "#334155",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  presetText: {
    color: "#38bdf8",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: "#334155",
  },
  cancelButtonText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#2563eb",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
});
