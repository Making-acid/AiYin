using System.Diagnostics;
using System.Text;

namespace IELTSSpeaking.Desktop;

internal sealed class BackendHost : IAsyncDisposable
{
    private readonly HttpClient _healthClient = new() { Timeout = TimeSpan.FromSeconds(1) };
    private readonly StringBuilder _diagnostics = new();
    private readonly string _portFile;
    private Process? _process;
    private ProcessJob? _processJob;
    private int _stopping;

    public BackendHost()
    {
        // Keep the legacy directory so an in-place brand upgrade preserves runtime state.
        var runtimeDirectory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "IELTS Speaking",
            "runtime");
        Directory.CreateDirectory(runtimeDirectory);
        _portFile = Path.Combine(runtimeDirectory, $"backend-{Environment.ProcessId}-{Guid.NewGuid():N}.port");
    }

    public Uri? BaseUri { get; private set; }
    public event EventHandler? UnexpectedExit;

    public async Task<Uri> StartAsync(CancellationToken cancellationToken)
    {
        if (_process is not null)
        {
            throw new InvalidOperationException("The backend process has already been started.");
        }

        var launch = ResolveLaunchCommand();
        Interlocked.Exchange(ref _stopping, 0);
        var startInfo = new ProcessStartInfo
        {
            FileName = launch.FileName,
            WorkingDirectory = launch.WorkingDirectory,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        foreach (var argument in launch.Arguments)
        {
            startInfo.ArgumentList.Add(argument);
        }
        startInfo.Environment["IELTS_PORT"] = "0";
        startInfo.Environment["IELTS_PORT_FILE"] = _portFile;
        startInfo.Environment["IELTS_NO_BROWSER"] = "1";
        if (launch.StaticDirectory is not null)
        {
            startInfo.Environment["IELTS_STATIC_DIR"] = launch.StaticDirectory;
        }
        var bundledTtsModel = Path.Combine(
            AppContext.BaseDirectory,
            "models",
            "tts",
            "kokoro-int8-multi-lang-v1_1");
        if (Directory.Exists(bundledTtsModel))
        {
            startInfo.Environment["IELTS_TTS_MODEL_DIR"] = bundledTtsModel;
        }
        var bundledWhisperModels = Path.Combine(AppContext.BaseDirectory, "models", "whisper");
        if (Directory.Exists(bundledWhisperModels))
        {
            startInfo.Environment["IELTS_WHISPER_MODEL_DIR"] = bundledWhisperModels;
        }
        var bundledWhisperXModels = Path.Combine(AppContext.BaseDirectory, "models", "whisperx");
        if (Directory.Exists(bundledWhisperXModels))
        {
            startInfo.Environment["IELTS_WHISPERX_MODEL_DIR"] = bundledWhisperXModels;
            var nltkData = Path.Combine(bundledWhisperXModels, "nltk_data");
            if (Directory.Exists(nltkData))
            {
                startInfo.Environment["NLTK_DATA"] = nltkData;
            }
        }

        _process = new Process { StartInfo = startInfo, EnableRaisingEvents = true };
        var launchedProcess = _process;
        launchedProcess.Exited += (_, _) =>
        {
            if (Volatile.Read(ref _stopping) == 0
                && ReferenceEquals(_process, launchedProcess)
                && BaseUri is not null)
            {
                UnexpectedExit?.Invoke(this, EventArgs.Empty);
            }
        };
        _process.OutputDataReceived += CaptureDiagnostic;
        _process.ErrorDataReceived += CaptureDiagnostic;
        if (!_process.Start())
        {
            throw new InvalidOperationException("Unable to start the local IELTS service.");
        }
        _processJob = ProcessJob.TryCreateFor(_process);
        _process.BeginOutputReadLine();
        _process.BeginErrorReadLine();

        try
        {
            var port = await WaitForPortAsync(_process, cancellationToken);
            var baseUri = new Uri($"http://127.0.0.1:{port}/");
            await WaitForHealthAsync(_process, baseUri, cancellationToken);
            BaseUri = baseUri;
            return baseUri;
        }
        catch
        {
            StopProcess();
            throw;
        }
    }

    public async Task<Uri> RestartAsync(CancellationToken cancellationToken)
    {
        StopProcess();
        BaseUri = null;
        return await StartAsync(cancellationToken);
    }

    private void CaptureDiagnostic(object sender, DataReceivedEventArgs eventArgs)
    {
        if (string.IsNullOrWhiteSpace(eventArgs.Data)) return;
        lock (_diagnostics)
        {
            if (_diagnostics.Length > 16_000)
            {
                _diagnostics.Remove(0, 8_000);
            }
            _diagnostics.AppendLine(eventArgs.Data);
        }
    }

    private async Task<int> WaitForPortAsync(Process process, CancellationToken cancellationToken)
    {
        var deadline = DateTimeOffset.UtcNow.AddSeconds(30);
        while (DateTimeOffset.UtcNow < deadline)
        {
            cancellationToken.ThrowIfCancellationRequested();
            ThrowIfExited(process);
            try
            {
                if (File.Exists(_portFile))
                {
                    var text = await File.ReadAllTextAsync(_portFile, cancellationToken);
                    if (int.TryParse(text, out var port) && port is > 0 and <= 65535)
                    {
                        return port;
                    }
                }
            }
            catch (IOException)
            {
                // The backend publishes the file atomically; retry if antivirus briefly locks it.
            }
            await Task.Delay(100, cancellationToken);
        }
        throw new TimeoutException("The local IELTS service did not publish its port in time.");
    }

    private async Task WaitForHealthAsync(Process process, Uri baseUri, CancellationToken cancellationToken)
    {
        var healthUri = new Uri(baseUri, "health");
        var deadline = DateTimeOffset.UtcNow.AddSeconds(30);
        while (DateTimeOffset.UtcNow < deadline)
        {
            cancellationToken.ThrowIfCancellationRequested();
            ThrowIfExited(process);
            try
            {
                using var response = await _healthClient.GetAsync(healthUri, cancellationToken);
                if (response.IsSuccessStatusCode) return;
            }
            catch (HttpRequestException)
            {
                // The socket is bound before application startup completes.
            }
            catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                // Per-request timeout; retry until the startup deadline.
            }
            await Task.Delay(150, cancellationToken);
        }
        throw new TimeoutException("The local IELTS service did not become healthy in time.");
    }

    private void ThrowIfExited(Process process)
    {
        if (!process.HasExited) return;
        string diagnostics;
        lock (_diagnostics)
        {
            diagnostics = _diagnostics.ToString().Trim();
        }
        var detail = diagnostics.Length == 0 ? "No diagnostic output was produced." : diagnostics;
        throw new InvalidOperationException($"The local IELTS service exited unexpectedly ({process.ExitCode}).\n\n{detail}");
    }

    private static LaunchCommand ResolveLaunchCommand()
    {
        var packagedCandidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "backend", "AiYin Backend.exe"),
            Path.Combine(AppContext.BaseDirectory, "AiYin Backend.exe"),
        };
        foreach (var candidate in packagedCandidates)
        {
            if (File.Exists(candidate))
            {
                return new LaunchCommand(candidate, Path.GetDirectoryName(candidate)!, [], null);
            }
        }

        // A complete installation always uses its bundled backend. The override
        // is intentionally limited to development layouts where no bundled
        // executable exists, so a user-level environment variable cannot replace
        // production code.
        var configuredExecutable = Environment.GetEnvironmentVariable("IELTS_BACKEND_EXECUTABLE");
        if (!string.IsNullOrWhiteSpace(configuredExecutable))
        {
            var fullPath = Path.GetFullPath(configuredExecutable);
            if (!File.Exists(fullPath))
            {
                throw new FileNotFoundException("IELTS_BACKEND_EXECUTABLE does not exist.", fullPath);
            }
            return new LaunchCommand(fullPath, Path.GetDirectoryName(fullPath)!, [], null);
        }

        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            var runScript = Path.Combine(directory.FullName, "backend", "run.py");
            if (File.Exists(runScript))
            {
                var backendDirectory = Path.GetDirectoryName(runScript)!;
                var pythonCandidates = new[]
                {
                    Path.Combine(backendDirectory, "venv-whisperx", "Scripts", "python.exe"),
                    Path.Combine(backendDirectory, "venv", "Scripts", "python.exe"),
                };
                var python = pythonCandidates.FirstOrDefault(File.Exists) ?? "python";
                var staticDirectory = Path.Combine(directory.FullName, "frontend", "dist");
                if (!File.Exists(Path.Combine(staticDirectory, "index.html")))
                {
                    throw new FileNotFoundException(
                        "The frontend build was not found. Run 'npm run build' in the frontend directory first.",
                        Path.Combine(staticDirectory, "index.html"));
                }
                return new LaunchCommand(python, backendDirectory, [runScript], staticDirectory);
            }
            directory = directory.Parent;
        }

        throw new FileNotFoundException(
            "The IELTS backend was not found. Place it in the 'backend' folder or set IELTS_BACKEND_EXECUTABLE.");
    }

    private void StopProcess()
    {
        Interlocked.Exchange(ref _stopping, 1);
        var process = Interlocked.Exchange(ref _process, null);
        if (process is null)
        {
            Interlocked.Exchange(ref _processJob, null)?.Dispose();
            return;
        }
        try
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
                process.WaitForExit(5_000);
            }
        }
        catch (InvalidOperationException)
        {
            // Process exited between checks.
        }
        finally
        {
            process.Dispose();
            Interlocked.Exchange(ref _processJob, null)?.Dispose();
        }
    }

    public ValueTask DisposeAsync()
    {
        StopProcess();
        _healthClient.Dispose();
        try
        {
            File.Delete(_portFile);
        }
        catch (IOException)
        {
            // A stale, uniquely named marker is harmless and can be cleaned next launch.
        }
        return ValueTask.CompletedTask;
    }

    private sealed record LaunchCommand(
        string FileName,
        string WorkingDirectory,
        string[] Arguments,
        string? StaticDirectory);
}
