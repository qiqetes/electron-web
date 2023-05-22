import { app, Menu, MenuItem } from 'electron';


const template = [
	new MenuItem({
		label: app.name,
		submenu: [
			{ role: 'about' },
			{ type: 'separator' },
			{ role: 'hide' },
			{ role: 'hideOthers' },
			{ role: 'unhide' },
			{ type: 'separator' },
			{ role: 'quit' }
		]
	})
];

export const menu = Menu.buildFromTemplate(template);