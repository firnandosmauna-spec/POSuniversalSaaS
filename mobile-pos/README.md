# 📱 POS Universal SaaS - Mobile App (Expo WebView Shell)

Aplikasi Mobile Kasir Handheld Multi-Tenant Universal SaaS POS berbasis **Expo (React Native)**. Memuat seluruh antarmuka 12 domain bisnis POS (F&B, Percetakan, Laundry, Retail, Apotek, Bengkel, dll.) dan Superadmin SaaS secara mulus dalam tampilan Mobile App Layar Penuh (*Fullscreen Mobile Native Experience*).

---

## 🚀 Fitur Utama Mobile App
- 📱 **Fullscreen WebView Integration:** Tampilan 100% mulus tanpa address bar browser.
- 📲 **Expo Go Ready:** Tinggal scan QR Code dari HP Android / iOS untuk preview langsung tanpa install APK.
- ⚙️ **Dynamic Host Server Switcher:** Fitur tombol `⚙️ Server` untuk mengubah URL target server (`localhost`, IP Wi-Fi laptop `192.168.x.x`, atau server cloud).
- 🔙 **Android Hardware Back Button:** Integrasi tombol kembali fisik HP Android untuk navigasi kasir.
- ☁️ **EAS Cloud Build Ready:** Siap di-build menjadi file `.APK` Android di cloud Expo secara gratis.

---

## 🛠️ Cara Menjalankan & Preview di HP

### 1. Pastikan Server Web POS Berjalan
Di direktori utama proyek (`POSuniversalSaaS`), pastikan server dev web berjalan:
```bash
npm run dev
# Running di http://localhost:8082
```

### 2. Jalankan Expo Server
Buka terminal baru di folder `mobile-pos`:
```bash
cd mobile-pos
npm install
npx expo start
```

### 3. Preview di HP Fisik (via Expo Go)
1. Install aplikasi **Expo Go** dari Google Play Store (Android) atau App Store (iOS).
2. Hubungkan HP dan Laptop ke jaringan **Wi-Fi yang sama**.
3. Buka kamera HP atau aplikasi Expo Go -> Scan **QR Code** yang muncul di terminal laptop.
4. Klik tombol **`⚙️ Server`** di bagian atas aplikasi HP, lalu masukkan IP Laptop Anda (contoh: `http://192.168.1.15:8082`).

### 4. Preview di Android Emulator
Tekan tombol **`a`** di terminal Expo untuk langsung membuka Android Studio Emulator.

---

## 📦 Cara Membuat File Installer `.APK` Android (Gratis via Cloud)

Anda **tidak memerlukan Android Studio** untuk membuat file `.APK`. Expo dapat membuatkan file `.APK` di cloud secara gratis:

```bash
# 1. Install EAS CLI (jika belum)
npm install -g eas-cli

# 2. Login akun Expo (gratis di expo.dev)
eas login

# 3. Jalankan Build APK di Cloud
eas build -p android --profile preview
```
Setelah proses selesai, link download file **`.APK`** akan diberikan untuk langsung di-install pada HP Kasir / Mesin POS Handheld Android Anda!
