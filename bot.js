const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const HABITS_FILE = './habits.json';
const DB_FILE = './database.json';

// --- INITIALIZATION ---
const initFile = (path, defaultData) => {
    if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify(defaultData, null, 2));
};

initFile(DB_FILE, {});
initFile(HABITS_FILE, { sessions: { pagi: [], siang: [], malam: [] } });

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// --- HELPERS ---
const loadData = (path) => {
    try {
        return JSON.parse(fs.readFileSync(path));
    } catch (e) {
        return path === DB_FILE ? {} : { sessions: { pagi: [], siang: [], malam: [] } };
    }
};

const saveData = (path, data) => fs.writeFileSync(path, JSON.stringify(data, null, 2));
const getToday = () => new Date().toISOString().slice(0, 10);

client.on('qr', qr => {
    console.log('SCAN QR DI BAWAH INI:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => console.log('🚀 HabitBot aktif dan siap digunakan!'));

client.on('message', async msg => {
    const habitsData = loadData(HABITS_FILE);
    const text = msg.body.trim().toLowerCase();
    const { sessions } = habitsData;

    // Flatten habits dengan metadata untuk identifikasi unik
    const allHabits = [];
    ['pagi', 'siang', 'malam'].forEach(s => {
        sessions[s].forEach(name => allHabits.push({ name, session: s }));
    });

    // --- 0. EXIT / MENU ---
    if (text === "0" || text === "exit") {
        return msg.reply("🏠 *Kembali ke Menu Utama.*\nKetik *menu* untuk melihat opsi.");
    }

    if (["halo", "menu", "hi", "p", "help"].includes(text)) {
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
Ketik *0* kapan saja untuk batal.`
        );
    }

    // --- 1. DAFTAR HABIT ---
    if (text === "1") {
        let res = `📋 *DAFTAR HABIT ANDA*\n\n`;
        let globalIdx = 1;
        ['pagi', 'siang', 'malam'].forEach(s => {
            const icons = { pagi: '🌅', siang: '☀️', malam: '🌙' };
            res += `${icons[s]} *${s.toUpperCase()}*\n`;
            if (sessions[s].length === 0) res += `_Belum ada habit_\n`;
            sessions[s].forEach(h => res += `${globalIdx++}. ${h}\n`);
            res += `\n`;
        });
        res += `_Ketik *0* untuk kembali_`;
        return msg.reply(res);
    }

    // --- 2. CHECKLIST ---
    if (text === "2") {
        let res = `✅ *CHECKLIST HARIAN*\n_Balas angka yang selesai (Contoh: 1 3)_\n\n`;
        let globalIdx = 1;
        ['pagi', 'siang', 'malam'].forEach(s => {
            if (sessions[s].length > 0) {
                res += `*${s.toUpperCase()}*\n`;
                sessions[s].forEach(h => res += `[ ${globalIdx++} ] ${h}\n`);
                res += `\n`;
            }
        });
        return msg.reply(res + `_Ketik *0* untuk kembali_`);
    }

    // --- 3. STATISTIK ---
    if (text === "3") {
        const db = loadData(DB_FILE);
        const t = getToday();
        const doneList = db[t] ? Object.keys(db[t]) : [];
        const total = allHabits.length;
        const score = total > 0 ? Math.round((doneList.length / total) * 100) : 0;

        const barTotal = 10;
        const barDone = Math.round((score / 100) * barTotal);
        const bar = "🟢".repeat(barDone) + "⚪".repeat(barTotal - barDone);

        let res = `📊 *PROGRES HARI INI*\n_Tanggal: ${t}_\n\n`;
        res += `${bar} *${score}%*\n\n`;
        res += `✅ Selesai: *${doneList.length}/${total}*\n`;
        if (doneList.length > 0) res += `\n*Detail:* \n_` + doneList.join(", ") + `_`;
        
        return msg.reply(res + `\n\n_Ketik *0* untuk kembali_`);
    }

    // --- 5. KELOLA (INSTRUCTIONS) ---
    if (text === "5") {
        return msg.reply(
`⚙️ *KELOLA HABIT*

➕ *Tambah:* _tambah [sesi] [nama]_
Contoh: *tambah pagi meditasi*

❌ *Hapus:* _hapus [nomor]_
Contoh: *hapus 3*

_Lihat nomor di menu 1._`
        );
    }

    // --- LOGIKA TAMBAH ---
    if (text.startsWith("tambah ")) {
        const parts = msg.body.split(" ");
        if (parts.length < 3) return msg.reply("❌ Format: *tambah pagi lari*");

        const sesi = parts[1].toLowerCase();
        const habitName = parts.slice(2).join(" ");

        if (!['pagi', 'siang', 'malam'].includes(sesi)) {
            return msg.reply("❌ Sesi harus: pagi, siang, atau malam.");
        }

        habitsData.sessions[sesi].push(habitName);
        saveData(HABITS_FILE, habitsData);
        return msg.reply(`✅ *${habitName}* ditambahkan ke ${sesi}.`);
    }

    // --- LOGIKA HAPUS ---
    if (text.startsWith("hapus ")) {
        const idx = parseInt(text.split(" ")[1]) - 1;
        if (isNaN(idx) || !allHabits[idx]) return msg.reply("❌ Nomor tidak valid.");

        const target = allHabits[idx];
        // Hapus spesifik pada sesi dan index yang benar
        const sessionList = habitsData.sessions[target.session];
        const localIdx = sessionList.indexOf(target.name);
        
        if (localIdx > -1) {
            sessionList.splice(localIdx, 1);
            saveData(HABITS_FILE, habitsData);
            return msg.reply(`🗑️ *${target.name}* dihapus.`);
        }
    }

    // --- INPUT CHECKLIST (ANGKA) ---
    if (/^[0-9 ]+$/.test(text) && text !== "0") {
        const numbers = [...new Set(text.split(/\s+/))];
        const db = loadData(DB_FILE);
        const t = getToday();
        if (!db[t]) db[t] = {};

        let added = [];
        numbers.forEach(n => {
            const item = allHabits[parseInt(n) - 1];
            if (item) {
                db[t][item.name] = true;
                added.push(item.name);
            }
        });

        if (added.length > 0) {
            saveData(DB_FILE, db);
            return msg.reply(`🌟 *DICATAT!*\n${added.map(a => `> - ${a}`).join("\n")}\n\n_Ketik 3 untuk skor._`);
        }
    }
});

client.initialize();