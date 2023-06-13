const fs = require("fs");
const path = require("path");

function listarArchivosDirectorios(carpeta) {
  // Obtener la ruta absoluta de la carpeta
  const rutaAbsoluta = path.resolve(carpeta);

  // Leer el contenido de la carpeta
  const archivos = fs.readdirSync(rutaAbsoluta);

  archivos.forEach((archivo) => {
    // Obtener la ruta completa del archivo o directorio
    const rutaCompleta = path.join(rutaAbsoluta, archivo);

    // Obtener información del archivo o directorio
    const estadisticas = fs.statSync(rutaCompleta);

    if (estadisticas.isFile()) {
      // Es un archivo
      const relativeDir = path.relative(
        carpetaRaiz,
        path.dirname(rutaCompleta)
      );
      console.log(
        `Source: ${rutaCompleta}; DestDir: "${path.join(
          "{app}",
          "bin",
          relativeDir
        )}"; Flags: ignoreversion`
      );
    } else if (estadisticas.isDirectory()) {
      // Es un directorio
      // Llamar recursivamente a la función para listar los archivos y subdirectorios del directorio actual
      listarArchivosDirectorios(rutaCompleta);
    }
  });
}

const carpetaRaiz = "./out/BestcyclingTV-win32-ia32";
listarArchivosDirectorios(carpetaRaiz);
