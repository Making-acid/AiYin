; -*- mode: pascal -*-
; IELTS Speaking v0.4.0 — Windows Installer
; Build: ISCC.exe setup.iss
; Requires: dist\IELTS Speaking v0.4.0\ prepared by PyInstaller

#define MyAppName "IELTS Speaking"
#define MyAppVersion "0.4.0"
#define MyAppPublisher "IELTS AI"
#define MyAppURL "https://github.com/Making-acid/ielts-speaking-ai"
#define MyAppExeName "IELTS Speaking v0.4.0.exe"
#define MySourceDir "backend\dist\IELTS Speaking v0.4.0"
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
OutputBaseFilename=IELTS-Speaking-v0.4.0-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
UninstallDisplayName={#MyAppName} v{#MyAppVersion}
ChangesEnvironment=no
LicenseFile=LICENSE
CloseApplications=yes

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

[Code]
var
  DisclaimerPage: TInputOptionWizardPage;

procedure InitializeWizard;
begin
  DisclaimerPage := CreateInputOptionPage(
    wpLicense,
    'Disclaimer — AI Score Notice',
    'Important: Read Before Using',
    'This software uses artificial intelligence to estimate IELTS speaking band scores.' + #13#10 +
    'These scores are NOT official IELTS results. They are not endorsed by, affiliated with,' + #13#10 +
    'or recognised by IELTS, British Council, IDP, or Cambridge Assessment English.' + #13#10#13#10 +
    'AI-generated scores are for practice and self-assessment purposes ONLY.' + #13#10 +
    'Do not rely on them for university admissions, visa applications, or other high-stakes decisions.' + #13#10#13#10 +
    'By proceeding, you acknowledge the above and accept the full terms in the DISCLAIMER file.',
    'Do you agree to the above terms?',
    False
  );
  DisclaimerPage.Add('I agree to the above terms');
  DisclaimerPage.Add('I do not agree (installation will stop)');
  DisclaimerPage.Values[0] := False;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = DisclaimerPage.ID then
  begin
    if not DisclaimerPage.Values[0] then
    begin
      MsgBox(
        'You must agree to the AI score disclaimer before continuing.' + #13#10 +
        'Please select "I agree" and click Next.',
        mbError,
        MB_OK
      );
      Result := False;
    end;
  end;
end;

