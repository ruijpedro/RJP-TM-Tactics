import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const android = path.join(root,'android');
if (!fs.existsSync(android)) throw new Error('Falta o projeto Android. Executa: npx cap add android');
const pkg = 'pt/rjp/tmtactics';
const dst = path.join(android,'app/src/main/java',pkg);
fs.mkdirSync(dst,{recursive:true});
for (const file of ['MainActivity.java','TMBridgePlugin.java','TmBrowserActivity.java']) {
  fs.copyFileSync(path.join(root,'android-custom',pkg,file),path.join(dst,file));
}

// Insere o navegador Android e proíbe tráfego HTTP sem encriptação.
const manifestPath=path.join(android,'app/src/main/AndroidManifest.xml');
let manifest=fs.readFileSync(manifestPath,'utf8');
if (!manifest.includes('TmBrowserActivity')) {
  const marker='</application>';
  if (!manifest.includes(marker)) throw new Error('Manifest Android incompatível.');
  manifest=manifest.replace(marker,`<activity android:name=".TmBrowserActivity" android:exported="false" android:configChanges="orientation|screenSize" />\n    ${marker}`);
}
manifest=manifest.replace(/android:usesCleartextTraffic="true"/g,'android:usesCleartextTraffic="false"');
fs.writeFileSync(manifestPath,manifest);

// Substitui o ícone genérico do Capacitor por um desenho RJP próprio.
for (const density of ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi']) {
  const folder=path.join(android,'app/src/main/res','mipmap-'+density);
  fs.mkdirSync(folder,{recursive:true});
  for (const icon of ['ic_launcher','ic_launcher_round','ic_launcher_foreground']) {
    fs.copyFileSync(path.join(root,'android-custom/icons',density+'-'+icon+'.png'),path.join(folder,icon+'.png'));
  }
}

// Usa versionCode crescente em cada execução do workflow, para permitir atualizações
// quando a APK for assinada com a mesma chave entre versões.
const gradleFile=path.join(android,'app/build.gradle');
let gradle=fs.readFileSync(gradleFile,'utf8');
const buildNumber=Number.parseInt(process.env.GITHUB_RUN_NUMBER||'1',10);
const versionName=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const parts=/^(\d+)\.(\d+)\.(\d+)$/.exec(versionName);
if (!parts) throw new Error('Versão da APP deve usar semver simples X.Y.Z.');
const [,major,minor,patch]=parts.map(Number);
if (major>19 || minor>99 || patch>99) throw new Error('Versão superior ao intervalo admitido para versionCode Android.');
const versionCode=major*100000000 + minor*1000000 + patch*10000 + (Number.isSafeInteger(buildNumber)?Math.max(1,buildNumber%10000):1);
// Evita uma atualização recusada por código decrescente ao mudar de workflow. 
if (!/\bversionCode\s+\d+/.test(gradle) || !/\bversionName\s+["'][^"']+["']/.test(gradle)) {
  throw new Error('Gradle sem versionCode/versionName: rever template Capacitor.');
}
gradle=gradle.replace(/\bversionCode\s+\d+/,`versionCode ${versionCode}`);
gradle=gradle.replace(/\bversionName\s+["'][^"']+["']/,`versionName "${versionName}"`);
fs.writeFileSync(gradleFile,gradle);
console.log(`✓ Integração TM, ícones personalizados, APK ${versionName} (código ${versionCode}) prontos.`);
