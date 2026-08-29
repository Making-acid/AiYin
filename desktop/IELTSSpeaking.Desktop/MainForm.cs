using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace IELTSSpeaking.Desktop;

internal sealed class MainForm : Form
{
    private readonly BackendHost _backend = new();
    private readonly CancellationTokenSource _lifetime = new();
    private readonly Panel _content = new() { Dock = DockStyle.Fill };
    private readonly Label _status = new()
    {
        Dock = DockStyle.Fill,
        Text = "正在启动爱音…",
        TextAlign = ContentAlignment.MiddleCenter,
        Font = new Font("Segoe UI", 13F),
        ForeColor = Color.FromArgb(60, 69, 83),
        BackColor = Color.FromArgb(247, 249, 252),
    };
    private WebView2? _webView;
    private Uri? _appUri;
    private bool _restartRequested;
    private bool _backendRecoveryAttempted;
    private readonly DesktopTts _desktopTts = new();

    public MainForm()
    {
        Text = "爱音";
        StartPosition = FormStartPosition.CenterScreen;
        Width = 1440;
        Height = 900;
        MinimumSize = new Size(1100, 720);
        AutoScaleMode = AutoScaleMode.Dpi;
        BackColor = Color.FromArgb(247, 249, 252);
        _content.Controls.Add(_status);
        Controls.Add(_content);
        _backend.UnexpectedExit += (_, _) => BeginInvoke(() => _ = RecoverBackendAsync());
        Shown += (_, _) => _ = InitializeApplicationAsync();
    }

    private async Task RecoverBackendAsync()
    {
        if (_backendRecoveryAttempted || _lifetime.IsCancellationRequested)
        {
            ShowStartupFailure(new InvalidOperationException("The local IELTS service stopped more than once."));
            return;
        }
        _backendRecoveryAttempted = true;
        try
        {
            SetStatus("本地服务意外停止，正在恢复…");
            _webView?.Dispose();
            _webView = null;
            _appUri = await _backend.RestartAsync(_lifetime.Token);
            await CreateWebViewAsync(_appUri);
        }
        catch (OperationCanceledException) when (_lifetime.IsCancellationRequested)
        {
            // Normal window shutdown.
        }
        catch (Exception exception)
        {
            ShowStartupFailure(exception);
        }
    }

    private async Task InitializeApplicationAsync()
    {
        try
        {
            SetStatus("正在启动本地服务…");
            _appUri = await _backend.StartAsync(_lifetime.Token);
            SetStatus("正在初始化桌面界面…");
            await CreateWebViewAsync(_appUri);
        }
        catch (OperationCanceledException) when (_lifetime.IsCancellationRequested)
        {
            // Normal window shutdown.
        }
        catch (Exception exception)
        {
            ShowStartupFailure(exception);
        }
    }

    private async Task CreateWebViewAsync(Uri appUri)
    {
        var userDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "爱音",
            "WebView2");
        Directory.CreateDirectory(userDataFolder);
        var environment = await CoreWebView2Environment.CreateAsync(
            userDataFolder: userDataFolder,
            options: new CoreWebView2EnvironmentOptions
            {
                // WebView2 blocks audio playback without a user gesture by
                // default; speech synthesis and <audio> must work on load.
                AdditionalBrowserArguments = "--autoplay-policy=no-user-gesture-required",
            });

        var webView = new WebView2
        {
            Dock = DockStyle.Fill,
            DefaultBackgroundColor = Color.FromArgb(247, 249, 252),
        };
        _content.Controls.Add(webView);
        webView.BringToFront();
        _webView = webView;

        await webView.EnsureCoreWebView2Async(environment);
        try
        {
            if (_desktopTts.IsAvailable())
            {
                webView.CoreWebView2.AddHostObjectToScript("desktopTts", _desktopTts);
            }
        }
        catch (Exception)
        {
            // Native speech is an optional desktop enhancement. Keep the web
            // application running so Azure or browser TTS can still be used.
        }
        await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(
            "Object.defineProperty(window, '__IELTS_DESKTOP__', { value: Object.freeze({ host: 'webview2' }), configurable: false });");
        ConfigureWebView(webView.CoreWebView2);
        webView.Source = appUri;
        _status.Visible = false;
    }

    private void ConfigureWebView(CoreWebView2 core)
    {
        core.Settings.IsStatusBarEnabled = false;
        core.Settings.AreDevToolsEnabled = Environment.GetEnvironmentVariable("IELTS_WEBVIEW_DEVTOOLS") == "1";
        core.Settings.AreBrowserAcceleratorKeysEnabled = core.Settings.AreDevToolsEnabled;
        core.Settings.IsPasswordAutosaveEnabled = false;
        core.Settings.IsGeneralAutofillEnabled = false;

        core.PermissionRequested += (_, args) =>
        {
            if (args.PermissionKind == CoreWebView2PermissionKind.Microphone && IsLocalAppUri(args.Uri))
            {
                args.State = CoreWebView2PermissionState.Allow;
            }
            else if (args.PermissionKind == CoreWebView2PermissionKind.Camera)
            {
                args.State = CoreWebView2PermissionState.Deny;
            }
        };

        core.NewWindowRequested += (_, args) =>
        {
            args.Handled = true;
            if (IsLocalAppUri(args.Uri))
            {
                core.Navigate(args.Uri);
                return;
            }
            OpenExternalUri(args.Uri);
        };

        core.NavigationStarting += (_, args) =>
        {
            if (IsLocalAppUri(args.Uri)) return;
            args.Cancel = true;
            OpenExternalUri(args.Uri);
        };

        core.WindowCloseRequested += (_, _) => Close();
        core.NavigationCompleted += async (_, args) =>
        {
            var diagnosticsPath = Environment.GetEnvironmentVariable("IELTS_WEBVIEW_DIAGNOSTICS_FILE");
            if (!args.IsSuccess || string.IsNullOrWhiteSpace(diagnosticsPath) || _webView is null) return;
            try
            {
                var capabilities = await _webView.CoreWebView2.ExecuteScriptAsync(
                    "JSON.stringify({" +
                    "desktop: window.__IELTS_DESKTOP__?.host === 'webview2'," +
                    "mediaDevices: !!navigator.mediaDevices?.getUserMedia," +
                    "mediaRecorder: typeof MediaRecorder !== 'undefined'," +
                    "speechRecognition: typeof SpeechRecognition !== 'undefined' || typeof webkitSpeechRecognition !== 'undefined'" +
                    "})");
                await File.WriteAllTextAsync(diagnosticsPath, capabilities);
            }
            catch (Exception)
            {
                // Diagnostics are opt-in and must never affect normal startup.
            }
        };
        core.ProcessFailed += (_, args) =>
        {
            if (args.ProcessFailedKind == CoreWebView2ProcessFailedKind.RenderProcessExited)
            {
                BeginInvoke(core.Reload);
                return;
            }
            if (args.ProcessFailedKind == CoreWebView2ProcessFailedKind.BrowserProcessExited && !_restartRequested)
            {
                _restartRequested = true;
                BeginInvoke(() =>
                {
                    Application.Restart();
                    Close();
                });
            }
        };
    }

    private bool IsLocalAppUri(string? value)
    {
        return _appUri is not null
            && Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && uri.Scheme == _appUri.Scheme
            && uri.Host == _appUri.Host
            && uri.Port == _appUri.Port;
    }

    private static void OpenExternalUri(string? value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)) return;
        if (uri.Scheme is not ("http" or "https")) return;
        try
        {
            Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
        }
        catch (Exception)
        {
            // The system may not have an HTTP handler; keep the app usable.
        }
    }

    private void SetStatus(string text)
    {
        _status.Text = text;
        _status.Visible = true;
        _status.BringToFront();
    }

    private void ShowStartupFailure(Exception exception)
    {
        SetStatus("桌面应用启动失败。请检查 WebView2 Runtime 与本地服务是否完整安装。");
        MessageBox.Show(
            this,
            exception.Message,
            "爱音启动失败",
            MessageBoxButtons.OK,
            MessageBoxIcon.Error);
    }

    protected override void OnFormClosing(FormClosingEventArgs eventArgs)
    {
        _lifetime.Cancel();
        _webView?.Dispose();
        _desktopTts.Dispose();
        _backend.DisposeAsync().AsTask().GetAwaiter().GetResult();
        base.OnFormClosing(eventArgs);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _lifetime.Dispose();
            _desktopTts.Dispose();
        }
        base.Dispose(disposing);
    }
}
