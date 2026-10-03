import { statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const file = process.argv[2];
if (!file) throw new Error('Provide APK path');
if (statSync(file).size > 20 * 1024 * 1024) throw new Error('APK exceeds 20 MB; inspect embedded assets before publishing.');
execFileSync('python3', ['-c', `import sys,zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
 nested=[n for n in z.namelist() if n.lower().endswith('.apk')]
 if nested: raise SystemExit('Nested APK files: '+', '.join(nested))
 print('APK size and embedded assets verified')`, file], { stdio: 'inherit' });
