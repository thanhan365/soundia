const CryptoJS = require('crypto-js');
const axios = require('axios');

async function run() {
    const res = await axios.get('https://lyric.nct.vn/2025/12/25/3/9/2/2/1766659925677.lrc', { responseType: 'text' });
    const encrypted = res.data.trim();

    // modifyKey from NCT page: 4c845d15d6219cc4ce06a1255ecb1a6e (32 hex = 16 bytes)
    const modifyKey = '4c845d15d6219cc4ce06a1255ecb1a6e';
    // keyDecryptLyric: Lyr1cjust4nct
    const decryptKey = 'Lyr1cjust4nct';

    console.log('Encrypted length:', encrypted.length, '(', encrypted.length / 2, 'bytes)');

    // Maybe the encrypted data needs to be decoded differently  
    // Perhaps it's actually Base64 encoded but looks like hex?
    // Or maybe only part of it is hex

    // Actually 2322 is even — maybe I miscounted before
    // 2322 / 2 = 1161 — indeed odd. BUT some hex strings might have a trailing newline

    // Let's try AES with modifyKey
    const keys = [
        ['modifyKey (hex parsed)', CryptoJS.enc.Hex.parse(modifyKey)],
        ['modifyKey (utf8)', CryptoJS.enc.Utf8.parse(modifyKey)],
        ['keyDecryptLyric (utf8)', CryptoJS.enc.Utf8.parse(decryptKey)],
        ['keyDecryptLyric padded 16', CryptoJS.enc.Utf8.parse(decryptKey.padEnd(16, '\0'))],
    ];

    // Try different ciphertext lengths (maybe drop last byte?)
    const hexTrimmed = encrypted.length % 2 === 0 ? encrypted : encrypted.substring(0, encrypted.length - 1);
    // Also try padding the hex to make it 16-byte aligned
    let hexPadded = hexTrimmed;
    while ((hexPadded.length / 2) % 16 !== 0) {
        hexPadded += '00';
    }

    console.log('Hex padded length:', hexPadded.length / 2, 'bytes');

    for (const [label, keyBytes] of keys) {
        const modes = [
            ['ECB', CryptoJS.mode.ECB, null],
            ['CBC', CryptoJS.mode.CBC, CryptoJS.enc.Hex.parse('00000000000000000000000000000000')],
        ];
        for (const [modeName, mode, iv] of modes) {
            try {
                const ciphertext = CryptoJS.enc.Hex.parse(hexPadded);
                const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });
                const opts = { mode, padding: CryptoJS.pad.NoPadding };
                if (iv) opts.iv = iv;
                const dec = CryptoJS.AES.decrypt(cipherParams, keyBytes, opts);
                // Try to convert — might throw if not valid UTF8
                const raw = dec.toString(CryptoJS.enc.Latin1);
                const hasLRC = raw.includes('[0') || raw.includes('[00:');
                if (hasLRC) {
                    console.log(`\n${label} + ${modeName} => LRC FOUND!`);
                    console.log(raw.substring(0, 500));
                }
            } catch (e) { /* skip */ }
        }
    }

    // Also test: maybe "Lyr1cjust4nct" is used as salt and MD5 derives the key
    try {
        const derivedKey = CryptoJS.MD5(decryptKey);
        const ciphertext = CryptoJS.enc.Hex.parse(hexPadded);
        const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });
        const dec = CryptoJS.AES.decrypt(cipherParams, derivedKey, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.NoPadding
        });
        const raw = dec.toString(CryptoJS.enc.Latin1);
        if (raw.includes('[0') || raw.includes('[00:')) {
            console.log('\nMD5(keyDecrypt) + ECB => LRC FOUND!');
            console.log(raw.substring(0, 500));
        }
    } catch (e) { }

    console.log('\nDone trying all combinations');
}

run().catch(e => console.log('Fatal:', e.message));
