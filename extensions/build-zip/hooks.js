'use strict';
// Hook onAfterBuild: zip toàn bộ thư mục build (vd build/web-mobile) -> build/<tên>_DDMMYY.zip
// Zip nằm cạnh thư mục platform nên lần build sau (xoá thư mục platform) không làm mất zip cũ.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function walk(dir, base, out) {
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const st = fs.statSync(full);
        if (st.isDirectory()) walk(full, base, out);
        else out.push({ full, rel: path.relative(base, full).split(path.sep).join('/'), mtime: st.mtime });
    }
    return out;
}

function dosTime(d) {
    return {
        time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
        date: (Math.max(d.getFullYear() - 1980, 0) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    };
}

function zipDir(srcDir, zipPath) {
    const files = walk(srcDir, srcDir, []);
    const parts = [];
    const central = [];
    let offset = 0;
    for (const f of files) {
        const data = fs.readFileSync(f.full);
        const deflated = zlib.deflateRawSync(data);
        const useDeflate = deflated.length < data.length;
        const body = useDeflate ? deflated : data;
        const name = Buffer.from(f.rel, 'utf8');
        const crc = crc32(data);
        const { time, date } = dosTime(f.mtime);
        const method = useDeflate ? 8 : 0;

        const lh = Buffer.alloc(30);
        lh.writeUInt32LE(0x04034b50, 0);
        lh.writeUInt16LE(20, 4);
        lh.writeUInt16LE(0x0800, 6); // UTF-8 filename
        lh.writeUInt16LE(method, 8);
        lh.writeUInt16LE(time, 10);
        lh.writeUInt16LE(date, 12);
        lh.writeUInt32LE(crc, 14);
        lh.writeUInt32LE(body.length, 18);
        lh.writeUInt32LE(data.length, 22);
        lh.writeUInt16LE(name.length, 26);
        lh.writeUInt16LE(0, 28);
        parts.push(lh, name, body);

        const ch = Buffer.alloc(46);
        ch.writeUInt32LE(0x02014b50, 0);
        ch.writeUInt16LE(20, 4);
        ch.writeUInt16LE(20, 6);
        ch.writeUInt16LE(0x0800, 8);
        ch.writeUInt16LE(method, 10);
        ch.writeUInt16LE(time, 12);
        ch.writeUInt16LE(date, 14);
        ch.writeUInt32LE(crc, 16);
        ch.writeUInt32LE(body.length, 20);
        ch.writeUInt32LE(data.length, 24);
        ch.writeUInt16LE(name.length, 28);
        ch.writeUInt32LE(offset, 42);
        central.push(ch, name);

        offset += 30 + name.length + body.length;
    }
    const cdBuf = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(files.length, 8);
    end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(cdBuf.length, 12);
    end.writeUInt32LE(offset, 16);
    fs.writeFileSync(zipPath, Buffer.concat([...parts, cdBuf, end]));
    return files.length;
}

function ddmmyy(d) {
    const p = (n) => String(n).padStart(2, '0');
    return p(d.getDate()) + p(d.getMonth() + 1) + p(d.getFullYear() % 100);
}

exports.onAfterBuild = async function (options, result) {
    try {
        const dest = result.dest; // thư mục build thực tế (vd .../build/web-mobile)
        if (!dest || !fs.existsSync(dest)) return;
        const name = (options.name || options.outputName || path.basename(dest)).replace(/[\/:*?"<>|\s]+/g, '_');
        const zipPath = path.join(path.dirname(dest), `${name}_${ddmmyy(new Date())}.zip`);
        const n = zipDir(dest, zipPath);
        console.log(`[build-zip] ${n} files -> ${zipPath}`);
    } catch (e) {
        console.error('[build-zip] lỗi khi zip:', e);
    }
};
