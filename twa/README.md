# Empaquetado TWA de Cope AI

Cope AI es una PWA. Este directorio deja preparada la configuración para envolverla
como Trusted Web Activity (TWA) y publicarla en Google Play. **El APK/AAB no se
puede compilar en la máquina de desarrollo original** porque no hay Android SDK
ni Gradle instalados. Ese paso queda pendiente.

## Requisitos

- Node.js 22+
- JDK 17 o 21
- Android SDK (compilar, `platform-tools`, build tools)
- Una URL HTTPS pública de Cope AI (por ejemplo, el deployment de Vercel)
- Cuenta de Google Play Console para publicar
- Un keystore de firma propio (no lo commitees)

## Pasos

1. Reemplazá `cope-ai.example.com` por tu dominio real en `twa-manifest.json`.
2. Ajustá `packageId` si querés otro identificador. **No lo cambies después de
   publicar la primera versión.**
3. Desplegá la PWA y verificá que `https://TU_DOMINIO/manifest.webmanifest`
   responda correctamente.
4. Instalá Bubblewrap:

   ```bash
   npm install --global @bubblewrap/cli
   ```

5. Inicializá el proyecto TWA:

   ```bash
   bubblewrap init --manifest https://TU_DOMINIO/manifest.webmanifest
   ```

   Bubblewrap puede tomar los valores de `twa-manifest.json` o volver a
   preguntarlos. Usá `com.traderxael.copeai` como package id y el mismo nombre.

6. Generá el keystore y firmá:

   ```bash
   bubblewrap build
   ```

7. Publicá el archivo `assetlinks.json` en
   `https://TU_DOMINIO/.well-known/assetlinks.json`, reemplazando el placeholder
   de `assetlinks.example.json` por el SHA-256 real del certificado de firma:

   ```bash
   keytool -list -v -keystore android.keystore -alias android
   ```

   El archivo debe servirse con `Content-Type: application/json`, sin
   redirecciones, y coincidir exactamente con el package id y la huella del APK.

8. Verificá la integración con:

   ```bash
   adb install app-release-signed.apk
   ```

   El enlace debe abrir Cope AI sin barra de URL. Si aparece la barra, el
   asset link no está verificado.

9. Subí el `.aab` a Play Console, completá la ficha y enviá a revisión.

## Checklist antes de publicar

- [ ] Dominio real y HTTPS.
- [ ] `assetlinks.json` accesible sin redirecciones.
- [ ] Package id definitivo.
- [ ] Keystore respaldado y fuera del repositorio.
- [ ] Iconos 512 y maskable actualizados.
- [ ] Política de privacidad publicada (la app envía mensajes a un proveedor de IA).
- [ ] Tope de gasto del proveedor y rate limiting configurados.
- [ ] Prueba en un dispositivo Android real.
