# Aplicación desktop

### Cómo correr:

`npm install`
Y luego crear un launch.json para correrla desde VScode y poder debuggearla.
Si se debuggea con `npm start` se habrá de correr a la vez la webapp en el puerto 8080.

### Code Signing

#### OsX

Para notarizar la app para osx se necesita crear un archivo .env en el root del directorio con los campos `APPLE_ID APPLE_ID_PASSWORD`. Además de esto asegurarse de que en el archivo `forge.config.js` está descomentado el objeto `osxNotarize`.

#### Windows

signtool sign /tr http://timestamp.sectigo.com /td SHA256 /fd SHA256 {file}.exe

Si hay problemas con el servidor de tiempo probar otros:

- http://timestamp.comodoca.com
- http://timestamp.digicert.com

* Configuración de SSH windows

```bash
# By default the ssh-agent service is disabled. Configure it to start automatically.
# Make sure you're running as an Administrator.
Get-Service ssh-agent | Set-Service -StartupType Automatic

# Start the service
Start-Service ssh-agent

# This should return a status of Running
Get-Service ssh-agent

# Now load your key files into ssh-agent
ssh-add $env:USERPROFILE\.ssh\id_rsa
# o
ssh-add $env:USERPROFILE
```

### A tener en cuenta:

Aunque nuestra app no tenga renderer, por un bug de Electron-forge hay que mantener los archivos `renderer.ts` e `index.html` para que no falle webpack. Está ya subido y abierto el issue https://github.com/electron-userland/electron-forge/issues/2859.

**Bluetooth MacOS**:Para probar la parte del bluetooth tendrás que permitir que Chromium y VScode tengan acceso al bluetooth desde preferencias del sistema.

# TODO:

- Quitar el webSecurity: false y servir la clase de ajuste y la música de espera por LocalServer
- InnoSetup windows.
