; -*- mode: pascal -*-
; IELTS Speaking v0.5.0 -- Windows Installer
; Build: ISCC.exe setup.iss
; Requires: dist\IELTS Speaking v0.5.0\ prepared by PyInstaller

#define MyAppName "IELTS Speaking"
#define MyAppVersion "0.5.0"
#define MyAppPublisher "IELTS AI"
#define MyAppURL "https://github.com/Making-acid/ielts-speaking-ai"
#define MyAppExeName "IELTS Speaking v0.5.0.exe"
#define MySourceDir "backend\dist\IELTS Speaking v0.5.0"
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
OutputBaseFilename=IELTS-Speaking-v0.5.0-Setup
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
  DisclaimerPage: TWizardPage;
  AgreeRadio: TNewRadioButton;
  DisagreeRadio: TNewRadioButton;

procedure InitializeWizard;
var
  S: string;
begin
  S := 'This software uses AI to estimate IELTS speaking band scores.' + #13#10 + #13#10;
  S := S + 'These scores are NOT official IELTS results. They are not endorsed by,' + #13#10;
  S := S + 'affiliated with, or recognised by IELTS, British Council, IDP, or Cambridge' + #13#10;
  S := S + 'Assessment English.' + #13#10 + #13#10;
  S := S + 'AI-generated scores are for practice and self-assessment purposes ONLY.' + #13#10;
  S := S + 'Do not rely on them for university admissions, visa applications,' + #13#10;
  S := S + 'or other high-stakes decisions.';

  DisclaimerPage := CreateCustomPage(
    wpLicense,
    'Disclaimer - AI Score Notice',
    S
  );

  AgreeRadio := TNewRadioButton.Create(DisclaimerPage);
  AgreeRadio.Parent := DisclaimerPage.Surface;
  AgreeRadio.Top := ScaleY(12);
  AgreeRadio.Left := ScaleX(0);
  AgreeRadio.Width := DisclaimerPage.SurfaceWidth;
  AgreeRadio.Caption := 'I agree to the above terms';
  AgreeRadio.Checked := False;

  DisagreeRadio := TNewRadioButton.Create(DisclaimerPage);
  DisagreeRadio.Parent := DisclaimerPage.Surface;
  DisagreeRadio.Top := ScaleY(40);
  DisagreeRadio.Left := ScaleX(0);
  DisagreeRadio.Width := DisclaimerPage.SurfaceWidth;
  DisagreeRadio.Caption := 'I do not agree (installation will stop)';
  DisagreeRadio.Checked := True;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = DisclaimerPage.ID then
  begin
    // In silent mode, skip the disclaimer (user cannot interact)
    if WizardSilent then
      Exit;
    if not AgreeRadio.Checked then
    begin
      MsgBox('You must agree to the AI score disclaimer before continuing.' + #13#10 +
        'Please select "I agree" and click Next.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;
