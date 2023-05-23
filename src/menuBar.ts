import { mainWindow } from "./index";
import { AppData } from "./data/appData";
import {
  app,
  Menu,
  MenuItem,
  MenuItemConstructorOptions,
  shell,
} from "electron";
import config from "./config";

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
  customAction?: "logout" | "reportError";
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
    // TODO: Implement custom actions
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
 * Generates a menu bar from a menu layout coming from webapp
 * @param menuLayout Menu layout coming from webapp
 */
export const generateMenuBar = (menuLayout: MenuBarLayout) => {
  const template = menuLayout.map((i) => menuItemWebappToMenuItem(i));
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // const menuBarTemplate: MenuItem[] = [
  // 	new MenuItem({
  // 		label: app.name,
  // 		submenu: [
  // 			{ role: "about" },
  // 			{ type: "separator" },
  // 			{
  // 				type: "normal",
  // 				label: "Preferencias",
  // 				enabled: !!AppData.USER,
  // 				click: () =>
  // 					mainWindow.loadURL(AppData.WEBAPP_WEBASE + config.APP_PATH + "/settings"),
  // 			},
  // 			{ type: "separator" },
  // 			AppData.USER?.isPreviewTester ? { role: "toggleDevTools" } : null,
  // 			AppData.USER?.isPreviewTester ? { type: "separator" } : null,
  // 			{ role: "quit" },
  // 		].filter((x) => x != null) as MenuItemConstructorOptions[],
  // 	}),
  // ];

  // if (AppData.USER) {
  // 	menuBarTemplate.push(
  // 		new MenuItem({
  // 			label: "Ir a",
  // 			submenu: [
  // 				{
  // 					type: "normal",
  // 					label: "Buscar clases",
  // 					click: () => mainWindow.loadURL(AppData.WEBAPP_WEBASE + config.APP_PATH + "/trainingclasses/search"),
  // 				},
  // 				{
  // 					type: "normal",
  // 					label: "Clases offline",
  // 					click: () => mainWindow.loadURL(AppData.WEBAPP_WEBASE + config.APP_PATH + "/offline"),
  // 				},
  // 				{
  // 					type: "normal",
  // 					label: "Clases favoritas",
  // 					click: () => mainWindow.loadURL(AppData.WEBAPP_WEBASE + config.APP_PATH + "/favourites"),
  // 				},
  // 				{
  // 					type: "normal",
  // 					label: "Perfil",
  // 					click: () => mainWindow.loadURL(AppData.WEBAPP_WEBASE + config.APP_PATH + "/offline"),
  // 				},
  // 				{
  // 					type: "normal",
  // 					label: "Notificaciones",
  // 					click: () => mainWindow.loadURL(AppData.WEBAPP_WEBASE + config.APP_PATH + "/notifications"),
  // 				},
  // 				{
  // 					type: "normal",
  // 					label: "Ajustes",
  // 					click: () => mainWindow.loadURL(AppData.WEBAPP_WEBASE + config.APP_PATH + "/settings"),
  // 				},
  // 			],
  // 		})
  // 	);
  // 	menuBarTemplate.push(
  // 		new MenuItem({
  // 			label: "Aplicaciones",
  // 			submenu: [
  // 				{
  // 					type: "normal",
  // 					label: "Mis clases",
  // 					click: () => mainWindow.loadURL(AppData.WEBAPP_WEBASE + config.APP_PATH + "/bestpro/home"),
  // 				},
  // 				AppData.USER?.membership === "gimnasios" ? {
  // 					type: "normal",
  // 					label: "Planificador",
  // 					click: () => mainWindow.loadURL(AppData.WEBAPP_WEBASE + config.APP_PATH + "/gyms/rooms"),
  // 				} : null,
  // 				{
  // 					type: "normal",
  // 					label: "Constructor de clases",
  // 					click: () => mainWindow.loadURL(AppData.WEBAPP_WEBASE + config.APP_PATH + "/bestpro/constructor"),
  // 				},
  // 			].filter((x) => x != null) as MenuItemConstructorOptions[],
  // 		})
  // 	);
  // 	menuBarTemplate.push(
  // 		new MenuItem({
  // 			label: "Mi cuenta",
  // 			submenu: [
  // 				{
  // 					type: "normal",
  // 					label: "Mis datos",
  // 					click: () => shell.openExternal("https://www.bestcycling.com/user"),
  // 				},
  // 				{
  // 					type: "normal",
  // 					label: "Mis suscripción",
  // 					click: () => mainWindow.loadURL(AppData.WEBAPP_WEBASE + config.APP_PATH + "/subscription"),
  // 				},
  // 				{
  // 					type: "normal",
  // 					label: "Cerrar sesión",
  // 					click: () => {
  // 						/* TODO: ipcMainAction.cerrarSesión */
  // 					},
  // 				},
  // 			],
  // 		})
  // 	);
  // }
  // menuBarTemplate.push(
  // 	new MenuItem({
  // 		label: "Ayuda",
  // 		submenu: [
  // 			{
  // 				type: "normal",
  // 				label: "Reporta un error",
  // 				click: () => shell.openExternal("https://www.bestcycling.com/support"),
  // 			},
  // 			{
  // 				type: "normal",
  // 				label: "Sugerencias",
  // 				click: () => shell.openExternal("https://community.bestcycling.com/categories/11/topics"),
  // 			},
  // 			{
  // 				type: "normal",
  // 				label: "Contacta con nosotros",
  // 				click: () => shell.openExternal("https://bestcycling.com/page/contacto"),
  // 			},
  // 			{
  // 				role:
  // 			}
  // 		],
  // 	})
  // );

  // const menu = Menu.buildFromTemplate(menuBarTemplate);
  // Menu.setApplicationMenu(menu);
};

/**
 * Generates the initial AppBarMenu
 */
export const generateInitialMenu = () => {
  const menuBarTemplate: MenuItem[] = [
    new MenuItem({
      label: app.name,
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
