import { exec, ExecException } from "child_process";

export function checkIfUninstallNeeded() {
  const key = "{2e6f71a8-75e3-404a-b275-cd48d56c7fd2}";
  const checkCMD = `reg query "HKEY_USERS" /s /k /f ${key}`;

  exec(checkCMD, async (error: ExecException | null, stdout: string) => {
    if (error) {
      console.error(`error al ejecutar comando ${error.message}`);
      return;
    }

    if (stdout.trim() !== "") {
      console.log("El programa está instalado");

      const hasUninstaller = await checkUninstaller(stdout);
      if (hasUninstaller) {
        console.log("Tiene desinstalador");
        return true;
      } else {
        console.log("No tiene desinstalador");
        return false;
      }
    } else {
      console.log("El programa NO está instalado");
      return false;
    }
  });
}

export async function checkUninstaller(output: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const lines = output.split("\n");
    const regex =
      /(.*)\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\(.*)$/;
    const keys = lines
      .map((line) => line.trim().match(regex))
      .filter((match) => match !== null)
      .map((match) => match?.[0]);

    const key = keys[0];

    if (!key) {
      resolve(false);
      return;
    }

    const command = `reg query "${key}" /v QuietUninstallString`;
    exec(command, (error: ExecException | null, stdout: string) => {
      if (error) {
        console.error(`Error al ejecutar el comando: ${error.message}`);
        reject(error);
      }

      const regex = /QuietUninstallString\s+REG_SZ\s+(.+)/i;
      const match = stdout.match(regex);
      if (match && match.length >= 2) {
        const cmd = match[1].trim();
        console.log("El valor es : ", cmd);
        exec(cmd, (error: ExecException | null, stdout: string) => {
          if (error) {
            console.error("Error desinstalando app antigua");
            return;
          }
          console.info("Eliminada app antigua", stdout);
        });
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}
