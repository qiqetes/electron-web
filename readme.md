# Aplicación desktop

### Cómo correr:

`npm install`
Y luego crear un launch.json para correrla desde VScode y poder debuggearla.

### Code Signing

#### OsX

Para notarizar la app para osx se necesita crear un archivo .env en el root del directorio con los campos `APPLE_ID APPLE_ID_PASSWORD`. Además de esto asegurarse de que en el archivo `forge.config.js` está descomentado el objeto `osxNotarize`.

### A tener en cuenta:

Aunque nuestra app no tenga renderer, por un bug de Electron-forge hay que mantener los archivos `renderer.ts` e `index.html` para que no falle webpack. Está ya subido y abierto el issue https://github.com/electron-userland/electron-forge/issues/2859.

**Bluetooth MacOS**:Para probar la parte del bluetooth tendrás que permitir que Chromium y VScode tengan acceso al bluetooth desde preferencias del sistema.

# TODO:

- Quitar el webSecurity: false y servir la clase de ajuste y la música de espera por LocalServer
- Notarizar app windows
- InnoSetup windows.
