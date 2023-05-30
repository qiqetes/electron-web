import { mainWindow } from "./index";
import { AppData } from "./data/appData";
import { Menu, MenuItem, MenuItemConstructorOptions, shell } from "electron";
import config from "./config";
import { logError } from "./helpers/loggers";
import { forceCheckForUpdate } from "./helpers/updater";

type MenuItemWebapp = {
  label?: string;
  submenu?: MenuItemWebapp[];
  enabled?: boolean;
  visible?: boolean;
  role?:
    | "undo"
    | "redo"
    | "cut"
    | "copy"
    | "paste"
    | "pasteAndMatchStyle"
    | "delete"
    | "selectAll"
    | "reload"
    | "forceReload"
    | "toggleDevTools"
    | "resetZoom"
    | "zoomIn"
    | "zoomOut"
    | "toggleSpellChecker"
    | "togglefullscreen"
    | "window"
    | "minimize"
    | "close"
    | "help"
    | "about"
    | "services"
    | "hide"
    | "hideOthers"
    | "unhide"
    | "quit"
    | "showSubstitutions"
    | "toggleSmartQuotes"
    | "toggleSmartDashes"
    | "toggleTextReplacement"
    | "startSpeaking"
    | "stopSpeaking"
    | "zoom"
    | "front"
    | "appMenu"
    | "fileMenu"
    | "editMenu"
    | "viewMenu"
    | "shareMenu"
    | "recentDocuments"
    | "toggleTabBar"
    | "selectNextTab"
    | "selectPreviousTab"
    | "mergeAllWindows"
    | "clearRecentDocuments"
    | "moveTabToNewWindow"
    | "windowMenu";
  type?: "normal" | "separator" | "submenu" | "checkbox" | "radio";
  loadUrl?: `/${string}`;
  openExternal?: string;
  customAction?: "logout" | "reportError" | "checkForUpdates";
};

export type MenuBarLayout = MenuItemWebapp[];

const menuItemWebappToMenuItem = (menuItemW: MenuItemWebapp): MenuItem => {
  let click: (() => void) | undefined;
  if (menuItemW.loadUrl)
    click = () =>
      mainWindow.loadURL(
        AppData.WEBAPP_WEBASE + config.APP_PATH + menuItemW.loadUrl
      );
  else if (menuItemW.openExternal)
    click = () => shell.openExternal(menuItemW.openExternal!);
  else if (menuItemW.customAction) {
    switch (menuItemW.customAction) {
      case "logout":
        click = () => mainWindow.webContents.send("logout");
        break;
      case "reportError":
        click = () => mainWindow.webContents.send("errorReportModal");
        break;
      case "checkForUpdates":
        click = () => forceCheckForUpdate();
        break;
      default:
        logError("Unknown custom action", menuItemW.customAction);
        break;
    }
  }

  const menuItem = new MenuItem({
    label: menuItemW.label,
    role: menuItemW.role,
    type: menuItemW.type,
    enabled: menuItemW.enabled,
    visible: menuItemW.visible,
    submenu: menuItemW.submenu?.map((i) => menuItemWebappToMenuItem(i)) as
      | Menu
      | undefined,
    click: click,
  });
  return menuItem;
};

/**
 * Generates a
 * @param menuLayout Menu layout coming from webapp
 */
export const generateMenuBar = (menuLayout: MenuBarLayout) => {
  const template = menuLayout.map((i) => menuItemWebappToMenuItem(i));
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

/**
 * Generates the initial AppBarMenu
 */
export const generateInitialMenu = () => {
  const menuBarTemplate: MenuItem[] = [
    new MenuItem({
      label: "Bestcycling",
      submenu: [
        { role: "about" },
        { type: "separator" },
        AppData.USER?.isPreviewTester ? { role: "toggleDevTools" } : null,
        AppData.USER?.isPreviewTester ? { type: "separator" } : null,
        { role: "quit" },
      ].filter((x) => x != null) as MenuItemConstructorOptions[],
    }),
  ];
  const menu = Menu.buildFromTemplate(menuBarTemplate);
  Menu.setApplicationMenu(menu);
};
