; -*- mode: pascal -*-
; IELTS Speaking v0.3.1 — Windows Installer
; Build: ISCC.exe setup.iss
; Requires: dist\IELTS Speaking v0.3.1\ prepared by PyInstaller

#define MyAppName "IELTS Speaking"
#define MyAppVersion "0.3.1"
#define MyAppPublisher "IELTS AI"
#define MyAppURL "https://github.com/Making-acid/ielts-speaking-ai"
#define MyAppExeName "IELTS Speaking v0.3.1.exe"
#define MySourceDir "backend\dist\IELTS Speaking v0.3.1"
#define MyOutputDir "..\release"

[Setup]
AppId={{7B8E9A1D-4F3C-4A2E-B5D6-8C7A9E1F2D3B}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir={#MyOutputDir}
OutputBaseFilename=IELTS-Speaking-v0.3.1-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
UninstallDisplayName={#MyAppName} v{#MyAppVersion}
ChangesEnvironment=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#MySourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
