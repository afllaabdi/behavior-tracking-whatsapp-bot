const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const HABITS_FILE = 'habits.json';
const DB_FILE = 'database.json';

// --- INITIALIZATION ---
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}');
// Pastikan habits.json punya struktur dasar jika file baru
if (!fs.existsSync(HABITS_FILE)) {
    const baseHabits = { sessions: { pagi: [], siang: [], malam: [] } };
    fs.writeFileSync(HABITS_FILE, JSON.stringify(baseHabits, null, 2));
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// --- HELPERS ---
const loadDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
const getToday = () => new Date().toISOString().slice(0, 10);

client.on('qr', qr => {
    console.log('SCAN QR DI BAWAH INI:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => console.log('🚀 HabitBot aktif dan siap digunakan!'));

client.on('message', async msg => {
    // Reload habitsData setiap ada pesan agar data selalu fresh
    let habitsData = JSON.parse(fs.readFileSync(HABITS_FILE));
    const text = msg.body.trim().toLowerCase();
    const sessions = habitsData.sessions;

    // Gabungkan habit untuk referensi index universal
    const allHabits = [
        ...sessions.pagi,
        ...sessions.siang,
        ...sessions.malam
    ];

    // --- EXIT / BACK TO MENU ---
    if (text === "exit" || text === "0") {
        return msg.reply("🏠 *Kembali ke Menu Utama.*\nKetik *menu* untuk melihat opsi.");
    }

    // --- MENU UTAMA ---
    if (["halo", "menu", "hi", "p"].includes(text)) {
        return msg.reply(
`╔════════════════╗
   ✨ *HABIT TRACKER BOT*
╚════════════════╝

1️⃣ *Daftar Habit* (Cek list)
2️⃣ *Checklist* (Isi progres)
3️⃣ *Statistik* (Lihat skor)
4️⃣ *Bantuan* (Cara pakai)
5️⃣ *Kelola Habit* (Edit list)

Ketik angka menu yang diinginkan.
Ketik *exit* kapan saja untuk batal.`
        );
    }

    // --- 1. DAFTAR HABIT ---
    if (text === "1") {
        let res = `📋 *DAFTAR HABIT ANDA*\n\n`;
        res += `🌅 *PAGI*\n${sessions.pagi.map((h, i) => `${i + 1}. ${h}`).join('\n') || '-'}\n\n`;
        res += `☀️ *SIANG*\n${sessions.siang.map((h, i) => `${sessions.pagi.length + i + 1}. ${h}`).join('\n') || '-'}\n\n`;
        res += `🌙 *MALAM*\n${sessions.malam.map((h, i) => `${sessions.pagi.length + sessions.siang.length + i + 1}. ${h}`).join('\n') || '-'}`;
        res += `\n\n_Ketik *0* untuk kembali_`;
        return msg.reply(res);
    }

    // --- 2. CHECKLIST ---
    if (text === "2") {
        let res = `✅ *CHECKLIST HARIAN*\n\n`;
        let count = 1;
        for (const [name, list] of Object.entries(sessions)) {
            res += `*${name.toUpperCase()}*\n`;
            list.forEach(h => res += `[ ${count++} ] ${h}\n`);
            res += `\n`;
        }
        res += `_Balas angka habit yang selesai (Contoh: 1 3)_\n_Ketik *0* untuk kembali_`;
        return msg.reply(res);
    }

    // --- 3. STATISTIK ---
    if (text === "3") {
        const db = loadDB();
        const t = getToday();
        const doneList = db[t] ? Object.keys(db[t]) : [];
        const total = allHabits.length;
        const score = total > 0 ? Math.round((doneList.length / total) * 100) : 0;

        const barTotal = 10;
        const barDone = Math.round((score / 100) * barTotal);
        const bar = "🟢".repeat(barDone) + "⚪".repeat(barTotal - barDone);

        let res = `📊 *PROGRES HARI INI*\n`;
        res += `_Tanggal: ${t}_\n\n`;
        res += `${bar} *${score}%*\n\n`;
        res += `✅ Selesai: *${doneList.length}/${total}*\n`;
        if (doneList.length > 0) res += `\n*Detail:* \n_` + doneList.join(", ") + `_`;
        
        res += `\n\n_Ketik *0* untuk kembali_`;
        return msg.reply(res);
    }

    // --- 4. BANTUAN ---
    if (text === "4") {
        return msg.reply(
`💡 *PANDUAN SINGKAT*

1. Ketik *menu*
2. Pilih *2* (Checklist)
3. Balas dengan angka habit yang selesai.
   Contoh: *1 2 4* (artinya nomor 1, 2, dan 4 selesai)

4. Untuk tambah: *tambah pagi baca buku*
5. Untuk hapus: *hapus 3*`
        );
    }

    // --- 5. KELOLA HABIT (INSTRUKSI) ---
    if (text === "5") {
        return msg.reply(
`⚙️ *KELOLA HABIT*

➕ *Tambah Habit:*
Ketik: _tambah [sesi] [nama]_
Contoh: *tambah pagi meditasi*

❌ *Hapus Habit:*
Ketik: _hapus [nomor]_
Contoh: *hapus 3*

_Nomor habit bisa dilihat di menu 1 atau 2._`
        );
    }

    // --- LOGIKA TAMBAH ---
    if (text.startsWith("tambah ")) {
        const parts = msg.body.split(" "); // Gunakan msg.body asli agar case sensitif untuk nama habit
        if (parts.length < 3) return msg.reply("❌ Format salah. Contoh: *tambah pagi lari*");

        const sesi = parts[1].toLowerCase();
        const habitName = parts.slice(2).join(" ");

        if (!sessions[sesi]) return msg.reply("❌ Sesi salah! Pilih: pagi, siang, atau malam.");

        sessions[sesi].push(habitName);
        fs.writeFileSync(HABITS_FILE, JSON.stringify(habitsData, null, 2));
        return msg.reply(`✅ *${habitName}* berhasil ditambahkan ke sesi ${sesi}.`);
    }

    // --- LOGIKA HAPUS ---
    if (text.startsWith("hapus ")) {
        const index = parseInt(text.split(" ")[1]) - 1;
        if (isNaN(index) || index < 0 || index >= allHabits.length) {
            return msg.reply("❌ Nomor tidak valid. Cek daftar nomor di menu 1.");
        }

        const habitToRemove = allHabits[index];
        
        // Hapus dari struktur asli
        for (const sesi in sessions) {
            const i = sessions[sesi].indexOf(habitToRemove);
            if (i > -1) {
                sessions[sesi].splice(i, 1);
                break;
            }
        }

        fs.writeFileSync(HABITS_FILE, JSON.stringify(habitsData, null, 2));
        return msg.reply(`🗑️ Habit *${habitToRemove}* telah dihapus.`);
    }

    // --- INPUT CHECKLIST (ANGKA) ---
    if (/^[0-9 ]+$/.test(text) && text !== "0") {
        const numbers = [...new Set(text.split(/\s+/))];
        const db = loadDB();
        const t = getToday();
        if (!db[t]) db[t] = {};

        let added = [];
        numbers.forEach(n => {
            const idx = parseInt(n) - 1;
            const h = allHabits[idx];
            if (h) {
                db[t][h] = true;
                added.push(h);
            }
        });

        if (added.length > 0) {
            saveDB(db);
            return msg.reply(
`🌟 *PROGRES DICATAT!*

${added.map(a => `> - ${a}`).join("\n")}

_Ketik *3* untuk statistik atau *0* untuk menu._`
            );
        }
    }
});

client.initialize();