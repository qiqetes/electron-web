# Aplicación desktop

### Cómo correr:

`npm install`
Y luego crear un launch.json para correrla desde VScode y poder debuggearla. **Importante:** La cuando le das a 🔄 no se ejecuta el beforeQuit y hay cambios que no se guardan, hay que cerrar bien con _cmd+Q_ o bien con el botón rojo.

### A tener en cuenta:

Aunque nuestra app no tenga renderer, por un bug de Electron-forge hay que mantener los archivos `renderer.ts` e `index.html` para que no falle webpack. Está ya subido y abierto el issue https://github.com/electron-userland/electron-forge/issues/2859.

# TODO:

- Entornos de desarrollo y producción.
- Estilizar el modal que se origina desde Electron
- Estilizar los toast que se originan desde Electron
- Límite de GB en las descargas
- Quitar el webSecurity: false y servir la clase de ajuste y la música de espera por LocalServer
- Añadir un manejo de clases descargadas (ir eliminando las antiguas)
- Automatic updates

# FIXME:

- El modal de descarga da error cuando la clase no está descargada (falta el mediaType)
- Las clases individuales offline en muchos casos dan ERR_CONNECTION_REFUSED
