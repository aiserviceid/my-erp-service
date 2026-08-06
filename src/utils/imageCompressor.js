/**
 * Utility kompresi gambar universal untuk Web & Android WebView (UnitPro)
 * Mengubah file gambar resolusi tinggi dari kamera/galeri HP menjadi Base64 WebP/JPEG ringan (~40-80 KB)
 * agar hemat memori, cepat diunggah, dan tidak membuat WebView crash/freeze.
 */

export async function compressImageFile(file, maxDimension = 900, quality = 0.72) {
  if (!file) return '';

  return new Promise((resolve) => {
    // Fail-safe jika bukan File/Blob atau tidak valid
    if (!(file instanceof Blob)) {
      if (typeof file === 'string') return resolve(file);
      return resolve('');
    }

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();

      img.onload = () => {
        try {
          let { width, height } = img;

          // Resize proporsional dengan batas dimensi maksimum
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d', { alpha: true });
          if (!ctx) {
            // Fallback jika context 2d gagal
            return resolve(readerEvent.target?.result || '');
          }

          // Gambar ke canvas dengan smoothing aktif
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Coba ekspor sebagai image/webp terlebih dahulu
          let result = canvas.toDataURL('image/webp', quality);

          // Jika format webp tidak didukung atau menghasilkan format kosong, fallback ke JPEG
          if (!result || result === 'data:,' || !result.startsWith('data:image/webp')) {
            result = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(result);
        } catch (err) {
          console.warn('Canvas compression error, fallback to raw data:', err);
          resolve(readerEvent.target?.result || '');
        }
      };

      img.onerror = () => {
        console.warn('Image load error, fallback to raw reader output');
        resolve(readerEvent.target?.result || '');
      };

      img.src = readerEvent.target?.result;
    };

    reader.onerror = () => {
      console.warn('FileReader error');
      resolve('');
    };

    reader.readAsDataURL(file);
  });
}
