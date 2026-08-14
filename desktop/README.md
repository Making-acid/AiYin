# WebView2 desktop host

The desktop host is intentionally limited to native application concerns. The
React frontend and FastAPI backend remain the source of product behaviour.

## Development

1. Build the frontend with `npm run build` in `frontend`. The development host
   automatically points the backend at `frontend/dist`.
2. Start the host from the repository root:

   ```powershell
   dotnet run --project desktop/IELTSSpeaking.Desktop
   ```

The host discovers `backend/run.py`, starts it on an OS-assigned loopback port,
waits for `/health`, and then navigates WebView2 to the application. Set
`IELTS_WEBVIEW_DEVTOOLS=1` to enable developer tools for a development run.
Set `IELTS_WEBVIEW_DIAGNOSTICS_FILE` to a writable JSON path to capture the
browser recording capabilities detected after the first successful navigation.

For packaged builds, place `IELTS Speaking Backend.exe` and its PyInstaller
support files beneath a `backend` directory next to the desktop executable.

## Release build

Run `desktop/build-webview-release.ps1` from PowerShell. Release binaries,
intermediate files, the official Evergreen WebView2 bootstrapper, and the Inno
Setup installer are written to the sibling directory
`IELTS-Speaking-WebView2-v0.6.0-Release`, never into the repository. Use
`-SkipInstaller` when only an application staging directory is needed.

## Runtime boundaries

- Only `http://127.0.0.1:<assigned-port>` is allowed inside the application.
- HTTP(S) links outside the local app are opened by the system browser.
- Microphone permission is granted only to the local app origin; camera access
  is denied.
- WebView2 profile data is stored under `%LOCALAPPDATA%\IELTS Speaking\WebView2`.
- Closing or restarting the desktop window terminates the complete backend
  process tree. On Windows, the backend is also placed in a kill-on-close Job
  Object so an abnormal host termination cannot leave an orphan service.
