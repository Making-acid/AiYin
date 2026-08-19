using System.Runtime.InteropServices;
using System.Speech.Synthesis;

namespace IELTSSpeaking.Desktop;

/// <summary>
/// Native system TTS exposed to the WebView2 page as a host object.
///
/// WebView2's built-in speechSynthesis does not use Edge's online voices and
/// often finds no usable voice on a Chinese Windows install, which makes the
/// whole app silent. This class routes character speech through the Windows
/// SAPI engine instead when Windows has an enabled system voice.
/// </summary>
[ComVisible(true)]
[ClassInterface(ClassInterfaceType.AutoDual)]
public sealed class DesktopTts : IDisposable
{
    private readonly object _lock = new();
    private SpeechSynthesizer? _synth;
    private TaskCompletionSource<object?>? _completion;
    private bool _disposed;

    public bool IsAvailable()
    {
        try
        {
            using var synth = new SpeechSynthesizer();
            return synth.GetInstalledVoices().Any(voice => voice.Enabled);
        }
        catch (Exception)
        {
            return false;
        }
    }

    /// <summary>
    /// Speak text and return a Task that completes when playback finishes.
    /// Called from JS as: await desktopTts.SpeakAsync(text, volume)
    /// </summary>
    public Task SpeakAsync(string text, int volume)
    {
        lock (_lock)
        {
            ObjectDisposedException.ThrowIf(_disposed, this);
            StopCore();
            if (string.IsNullOrWhiteSpace(text)) return Task.CompletedTask;

            var synth = new SpeechSynthesizer();
            try
            {
                var english = synth
                    .GetInstalledVoices()
                    .Select(voice => voice.VoiceInfo)
                    .FirstOrDefault(info => info.Culture.TwoLetterISOLanguageName.Equals("en", StringComparison.OrdinalIgnoreCase));
                if (english is not null)
                {
                    synth.SelectVoice(english.Name);
                }

                synth.Rate = 0;
                synth.Volume = Math.Clamp(volume, 0, 100);
                var completion = new TaskCompletionSource<object?>(TaskCreationOptions.RunContinuationsAsynchronously);
                _synth = synth;
                _completion = completion;
                synth.SpeakCompleted += (_, eventArgs) => CompleteSpeech(synth, completion, eventArgs);
                synth.SpeakAsync(text);
                return completion.Task;
            }
            catch
            {
                if (ReferenceEquals(_synth, synth))
                {
                    _synth = null;
                    _completion = null;
                }
                synth.Dispose();
                throw;
            }
        }
    }

    private void CompleteSpeech(
        SpeechSynthesizer synth,
        TaskCompletionSource<object?> completion,
        SpeakCompletedEventArgs eventArgs)
    {
        lock (_lock)
        {
            if (!ReferenceEquals(_synth, synth)) return;
            _synth = null;
            _completion = null;
            synth.Dispose();
        }

        if (eventArgs.Error is not null) completion.TrySetException(eventArgs.Error);
        else if (eventArgs.Cancelled) completion.TrySetCanceled();
        else completion.TrySetResult(null);
    }

    /// <summary>Stop current playback. Called from JS as: desktopTts.Stop()</summary>
    public void Stop()
    {
        lock (_lock)
        {
            StopCore();
        }
    }

    private void StopCore()
    {
        if (_synth is null) return;
        var synth = _synth;
        var completion = _completion;
        _synth = null;
        _completion = null;
        try
        {
            synth.SpeakAsyncCancelAll();
        }
        catch (ObjectDisposedException)
        {
            // Already disposed.
        }
        synth.Dispose();
        completion?.TrySetCanceled();
    }

    public void Dispose()
    {
        lock (_lock)
        {
            if (_disposed) return;
            _disposed = true;
            StopCore();
        }
    }
}
