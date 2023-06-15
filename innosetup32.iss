; Script generated by the Inno Setup Script Wizard.
; SEE THE DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!

#define AppName "Bestcycling"
#define AppExeName "Bestcycling TV.exe"
#define AppURL "https://www.bestcycling.com"
#define AppSrcDir "out/Bestcycling TV-win32-ia32/"
#define AppVersion GetVersionNumbersString(AppSrcDir + "Bestcycling TV.exe")
#define AppPublisher "Bestcycling SL"
#define AppCopyright "Copyright (c) 2023 Bestcycling SL"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{2E6F71A8-75E3-404A-B275-CD48D56C7FD2}
AppName={#AppName}
AppVersion={#AppVersion}
AppCopyright={#AppCopyright}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={commonpf}\{#AppName}
DefaultGroupName={#AppName}
OutputDir=out
OutputBaseFilename=SetupBestcycling32
DisableProgramGroupPage=yes
Compression=lzma
SolidCompression=yes
WizardStyle=modern
UsePreviousAppDir=yes
UsePreviousGroup=no
UsePreviousLanguage=no
UsePreviousSetupType=no
UsePreviousTasks=no
UsePreviousUserInfo=no
; Require Windows 7 SP1 or later
MinVersion=6.1sp1
PrivilegesRequired=lowest
CloseApplications=force


[Languages]
;Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}";

[Files]
Source: "{#AppSrcDir}/*"; DestDir: "{app}/bin"; Flags: ignoreversion recursesubdirs createallsubdirs
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
;Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"
;Name: "{commondesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon
Name: "{group}\{#AppName}"; Filename: "{app}\bin\{#AppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#AppName}"; Filename: "{app}\bin\{#AppExeName}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\bin\{#AppExeName}"; WorkingDir: "{app}"; Flags: nowait postinstall; Description: "{cm:LaunchProgram,{#StringChange(AppName, '&', '&&')}}"