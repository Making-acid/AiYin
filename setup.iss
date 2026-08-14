; -*- mode: pascal -*-
; IELTS Speaking Beta 1.1 -- Windows Installer
; Build: ISCC.exe setup.iss
; Requires: ..\IELTS-Speaking-WebView2-Beta-1.1-Release\AppStage\

#define MyAppName "IELTS Speaking"
#define MyAppVersion "1.1.0-beta.1"
#define MyAppDisplayVersion "Beta 1.1"
#define MyAppPublisher "IELTS AI"
#define MyAppURL "https://github.com/Making-acid/ielts-speaking-ai"
#define MyAppExeName "IELTS Speaking.exe"
#define MyReleaseRoot "..\IELTS-Speaking-WebView2-Beta-1.1-Release"
#define MySourceDir MyReleaseRoot + "\AppStage"
#define MyOutputDir MyReleaseRoot + "\Installer"
#define WebView2Bootstrapper MyReleaseRoot + "\Prerequisites\MicrosoftEdgeWebview2Setup.exe"

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
UsePreviousAppDir=yes
OutputDir={#MyOutputDir}
OutputBaseFilename=IELTS-Speaking-WebView2-Beta-1.1-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
UninstallDisplayName={#MyAppName} {#MyAppDisplayVersion}
UninstallDisplayIcon={app}\{#MyAppExeName}
ChangesEnvironment=no
LicenseFile=LICENSE
SetupIconFile=frontend\public\icons\app-icon.ico
CloseApplications=yes
CloseApplicationsFilter=*.exe,*.dll

[InstallDelete]
; Versioned launchers from previous releases are superseded during an upgrade.
Type: files; Name: "{app}\IELTS Speaking v0.3.0.exe"
Type: files; Name: "{app}\IELTS Speaking v0.4.0.exe"
Type: files; Name: "{app}\IELTS Speaking v0.5.0.exe"
Type: files; Name: "{app}\IELTS Speaking v0.6.0.exe"
Type: filesandordirs; Name: "{app}\_internal"

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#MySourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "DISCLAIMER.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "PRIVACY.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "NOTICE.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
#if FileExists(WebView2Bootstrapper)
Source: "{#WebView2Bootstrapper}"; DestDir: "{tmp}"; Flags: deleteafterinstall
#endif

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
#if FileExists(WebView2Bootstrapper)
Filename: "{tmp}\MicrosoftEdgeWebview2Setup.exe"; Parameters: "/silent /install"; StatusMsg: "Installing Microsoft Edge WebView2 Runtime..."; Flags: waituntilterminated; Check: not IsWebView2RuntimeInstalled
#endif
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
var
  DisclaimerPage: TWizardPage;
  DisclaimerMemo: TNewMemo;
  AgreeRadio: TNewRadioButton;
  DisagreeRadio: TNewRadioButton;

function IsWebView2RuntimeInstalled: Boolean;
var
  Version: string;
  RuntimeKey: string;
begin
  RuntimeKey := 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';
  Result := RegQueryStringValue(HKLM32, RuntimeKey, 'pv', Version) and
    (Version <> '') and (Version <> '0.0.0.0');
  if not Result then
  begin
    Version := '';
    Result := RegQueryStringValue(HKCU, RuntimeKey, 'pv', Version) and
      (Version <> '') and (Version <> '0.0.0.0');
  end;
end;

function DisclaimerText: string;
begin
  if ActiveLanguage = 'chinesesimplified' then
  begin
    Result := '重要：本软件是独立开发的 AI 辅助口语练习工具，不提供官方考试、报名、成绩或资质。' + #13#10 + #13#10;
    Result := Result + '本软件与 British Council、IDP Education、Cambridge University Press & Assessment 及任何 IELTS 考点均无隶属、授权、赞助或认可关系。IELTS、IELTS 标识及“雅思”是其各自权利人的注册商标。' + #13#10 + #13#10;
    Result := Result + 'AI 生成的分数、转写和反馈可能不完整、不一致或错误，发音评分不能替代真人评估。请勿将结果作为官方 IELTS 成绩，也不要用于院校录取、移民或签证、求职、职业注册或其他高风险决定。' + #13#10 + #13#10;
    Result := Result + '为生成回复，必要的文本和会话上下文会发送至你在设置中选择的 AI 服务商。浏览器语音识别也可能把音频交给浏览器或操作系统厂商处理。本地 Whisper 在本机后端转写并删除临时音频文件，但下载模型需要联网。' + #13#10 + #13#10;
    Result := Result + '不要输入身份证件、考生号、支付信息、机密信息或无权披露的内容；录制他人前请取得许可。第三方服务分别适用其自身条款、隐私政策、收费和数据保留规则。' + #13#10 + #13#10;
    Result := Result + '本软件按“现状”和“可用状态”提供。在适用法律允许的最大范围内，作者及贡献者不对因使用或依赖本软件及第三方服务而产生的损失负责；依法不得排除的权利或责任不受影响。' + #13#10 + #13#10;
    Result := Result + '继续安装或使用即表示你已阅读并接受随附的 DISCLAIMER.md、PRIVACY.md、NOTICE.md 和 LICENSE。';
  end
  else
  begin
    Result := 'IMPORTANT: This is an independent, AI-assisted speaking practice tool. It does not provide an official examination, registration, result, or qualification.' + #13#10 + #13#10;
    Result := Result + 'It is not affiliated with, authorised by, sponsored by, or endorsed by the British Council, IDP Education, Cambridge University Press & Assessment, or any IELTS test centre. IELTS, the IELTS logos, and 雅思 are registered trade marks of their respective owners.' + #13#10 + #13#10;
    Result := Result + 'AI-generated scores, transcripts, and feedback may be incomplete, inconsistent, or incorrect. Pronunciation estimates cannot replace an in-person assessment. Do not present a result as an official IELTS score or use it for admissions, immigration or visas, employment, professional registration, or another high-stakes decision.' + #13#10 + #13#10;
    Result := Result + 'Text and session context needed for a response are sent to the AI provider configured by you. Browser speech recognition may send audio to the browser or operating-system vendor. Local Whisper transcribes through the local backend and deletes temporary audio, but model downloads require a network connection.' + #13#10 + #13#10;
    Result := Result + 'Do not enter identity documents, candidate numbers, payment details, confidential information, or data you are not authorised to disclose. Obtain permission before recording another person. Third-party services have their own terms, privacy policies, fees, and retention practices.' + #13#10 + #13#10;
    Result := Result + 'The software is provided as is and as available. Liability is limited to the maximum extent permitted by applicable law; rights and liabilities that cannot lawfully be excluded remain unaffected.' + #13#10 + #13#10;
    Result := Result + 'By continuing, you confirm that you have read and accept the bundled DISCLAIMER.md, PRIVACY.md, NOTICE.md, and LICENSE.';
  end;
end;

function DisclaimerTitle: string;
begin
  if ActiveLanguage = 'chinesesimplified' then
    Result := '练习工具条款与隐私说明'
  else
    Result := 'Practice Tool Terms and Privacy Notice';
end;

function DisclaimerSubtitle: string;
begin
  if ActiveLanguage = 'chinesesimplified' then
    Result := '请阅读以下重要限制和数据处理说明。'
  else
    Result := 'Review the important limitations and data handling information below.';
end;

procedure InitializeWizard;
begin
  DisclaimerPage := CreateCustomPage(
    wpLicense,
    DisclaimerTitle,
    DisclaimerSubtitle
  );

  DisclaimerMemo := TNewMemo.Create(DisclaimerPage);
  DisclaimerMemo.Parent := DisclaimerPage.Surface;
  DisclaimerMemo.Left := 0;
  DisclaimerMemo.Top := 0;
  DisclaimerMemo.Width := DisclaimerPage.SurfaceWidth;
  DisclaimerMemo.Height := DisclaimerPage.SurfaceHeight - ScaleY(72);
  DisclaimerMemo.ReadOnly := True;
  DisclaimerMemo.ScrollBars := ssVertical;
  DisclaimerMemo.WordWrap := True;
  DisclaimerMemo.Text := DisclaimerText;

  AgreeRadio := TNewRadioButton.Create(DisclaimerPage);
  AgreeRadio.Parent := DisclaimerPage.Surface;
  AgreeRadio.Top := DisclaimerMemo.Top + DisclaimerMemo.Height + ScaleY(10);
  AgreeRadio.Left := ScaleX(0);
  AgreeRadio.Width := DisclaimerPage.SurfaceWidth;
  if ActiveLanguage = 'chinesesimplified' then
    AgreeRadio.Caption := '我已阅读并同意上述条款'
  else
    AgreeRadio.Caption := 'I have read and agree to the terms above';
  AgreeRadio.Checked := False;

  DisagreeRadio := TNewRadioButton.Create(DisclaimerPage);
  DisagreeRadio.Parent := DisclaimerPage.Surface;
  DisagreeRadio.Top := AgreeRadio.Top + ScaleY(26);
  DisagreeRadio.Left := ScaleX(0);
  DisagreeRadio.Width := DisclaimerPage.SurfaceWidth;
  if ActiveLanguage = 'chinesesimplified' then
    DisagreeRadio.Caption := '我不同意（安装将停止）'
  else
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
      if ActiveLanguage = 'chinesesimplified' then
        MsgBox('继续安装前必须同意练习工具条款与隐私说明。', mbError, MB_OK)
      else
        MsgBox('You must agree to the practice-tool terms and privacy notice before continuing.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;
