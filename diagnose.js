/**
 * SCRIPT DIAGNOSTIK - Jalankan ini di Console Browser (F12 → Console)
 * untuk mengetahui penyebab data menghilang
 */
(async function diagnose() {
  console.group('🔍 POS DIAGNOSTIK - Data Hilang');
  
  // 1. Cek user yang sedang aktif
  const activeUser = localStorage.getItem('pos_active_user');
  const user = activeUser ? JSON.parse(activeUser) : null;
  console.log('👤 User aktif:', user ? `${user.name} (ID: ${user.id})` : 'TIDAK ADA');
  
  // 2. Cek branches
  const branchesRaw = localStorage.getItem('pos_tenant_branches');
  const branches = branchesRaw ? JSON.parse(branchesRaw) : [];
  console.log('🏪 Branches tersimpan:', branches.map(b => `${b.name} (ID: ${b.id})`));
  
  // 3. Cek activeBranchId
  const activeBranchId = localStorage.getItem('pos_active_branch_id');
  console.log('📍 Active Branch ID:', activeBranchId || 'KOSONG (ini masalah!)');
  
  // 4. Cek semua staff keys
  const staffKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('_staff')) {
      const val = localStorage.getItem(key);
      const count = val ? JSON.parse(val).length : 0;
      staffKeys.push({ key, count });
    }
  }
  console.log('👥 Staff localStorage keys:', staffKeys);
  
  if (user) {
    const expectedKey = `pos_tenant_${user.id}_staff`;
    console.log('🔑 Expected staff key:', expectedKey);
    const hasExpectedKey = staffKeys.some(s => s.key === expectedKey);
    if (!hasExpectedKey) {
      console.warn('⚠️ MASALAH: Staff tidak ditemukan di kunci yang benar!');
      if (staffKeys.length > 0) {
        console.warn('   Staff ada di kunci lain:', staffKeys.map(s => s.key));
        console.warn('   → Data staf disimpan dengan ID lama sebelum login Supabase dikonfirmasi');
      }
    } else {
      console.log('✅ Staff ditemukan di kunci yang benar');
    }
  }
  
  // 5. Cek apakah activeBranchId kosong (root cause)
  if (!activeBranchId) {
    console.warn('⚠️ MASALAH UTAMA: pos_active_branch_id KOSONG!');
    console.warn('   Ini menyebabkan semua transaksi tersaring habis (filter branch)');
    console.warn('   SOLUSI: Coba logout dan login ulang, atau jalankan:');
    console.warn('   localStorage.setItem("pos_active_branch_id", "all")');
  }
  
  // 6. Cek date filter warning
  console.warn('💡 PERHATIAN: Default filter tanggal di Riwayat Penjualan = "Hari Ini"');
  console.warn('   Transaksi kemarin atau lebih lama tidak muncul sampai filter diubah ke "Semua"');
  
  console.groupEnd();
  
  // 7. Offer quick fix
  if (!activeBranchId || activeBranchId === '') {
    console.group('🔧 AUTO-FIX: Mengeset activeBranchId ke "all"...');
    localStorage.setItem('pos_active_branch_id', 'all');
    console.log('✅ Done! Silakan refresh halaman.');
    console.groupEnd();
  }
})();
