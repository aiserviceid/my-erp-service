import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const docs = [
  '1_RINGKASAN_PRODUK_AISERVICE.html',
  '2_STRATEGI_KONTEN_AI_30_HARI.html',
  '3_STARTERKIT_PRESENTASI_AFILIASI.html',
  '4_PANDUAN_PENGGUNA_AISERVICE.html',
  '5_PANDUAN_UPGRADE_HOSTING_DOMAIN.html'
];

const docsDir = path.join(__dirname, 'docs');

(async () => {
  console.log('🚀 Memulai konversi HTML ke PDF...\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    for (const doc of docs) {
      const htmlPath = path.join(docsDir, doc);
      const pdfPath = path.join(docsDir, doc.replace('.html', '.pdf'));
      const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

      if (!fs.existsSync(htmlPath)) {
        console.log(`⚠️  File tidak ditemukan: ${doc}`);
        continue;
      }

      console.log(`📄 Mengkonversi: ${doc}`);

      const page = await browser.newPage();
      await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
      });

      await page.close();
      console.log(`   ✅ Selesai: ${doc.replace('.html', '.pdf')}`);
    }

    console.log('\n🎉 Semua PDF berhasil dibuat di folder docs/');
    console.log(`📁 Lokasi: ${docsDir}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    if (browser) await browser.close();
  }
})();
