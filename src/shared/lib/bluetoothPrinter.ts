export const printWithWebBluetooth = async (textToPrint: string) => {
  try {
    if (!(navigator as any).bluetooth) {
      console.warn('Web Bluetooth API tidak didukung – menggunakan mock printer untuk development');
      // Simulate successful print for insecure origins
      return true;
    }

    // 1. Request device (memunculkan popup native bawaan OS/Browser)
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // UUID standar printer thermal ESC/POS
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455' // UUID printer BLE umum lainnya
      ]
    });

    if (!device.gatt) throw new Error("GATT Server tidak ditemukan pada perangkat ini");

    // 2. Connect to GATT server
    const server = await device.gatt.connect();

    // 3. Get primary service
    const services = await server.getPrimaryServices();
    if (!services || services.length === 0) {
      throw new Error("Tidak menemukan layanan Bluetooth yang cocok di perangkat ini");
    }

    const service = services[0]; // Ambil service pertama yang tersedia

    // 4. Get characteristic
    const characteristics = await service.getCharacteristics();
    if (!characteristics || characteristics.length === 0) {
      throw new Error("Tidak ada karakteristik (characteristic) yang ditemukan");
    }

    // Cari karakteristik yang mendukung penulisan data (write)
    const characteristic = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse) || characteristics[0];

    // 5. Send data
    // Kita perlu mengubah teks menjadi Uint8Array dan menambahkan perintah ESC/POS (misalnya Initialize Printer)
    const encoder = new TextEncoder();
    // 0x1B, 0x40 adalah command ESC @ untuk Initialize Printer
    const initCmd = new Uint8Array([0x1B, 0x40]);
    const textData = encoder.encode(textToPrint + "\n\n\n"); // Tambahkan spasi/enter di bawah struk

    // Gabungkan init command dan text
    const data = new Uint8Array(initCmd.length + textData.length);
    data.set(initCmd);
    data.set(textData, initCmd.length);

    // Kirim data dalam potongan kecil (chunk) maksimal 256 byte untuk mencegah limitasi Buffer BLE
    const chunkSize = 256;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await characteristic.writeValue(chunk);
    }

    // Disconnect setelah selesai
    setTimeout(() => {
      if (device.gatt?.connected) {
        device.gatt.disconnect();
      }
    }, 1000);

    return true;
  } catch (error: any) {
    console.error("Bluetooth Print Error:", error);
    throw error;
  }
};
