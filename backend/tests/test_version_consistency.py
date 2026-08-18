import json
import re
from pathlib import Path


def test_release_version_is_consistent_across_runtimes():
    project_root = Path(__file__).parents[2]
    main_source = (project_root / "backend" / "app" / "main.py").read_text(encoding="utf-8")
    desktop_project = (
        project_root / "desktop" / "IELTSSpeaking.Desktop" / "IELTSSpeaking.Desktop.csproj"
    ).read_text(encoding="utf-8")
    installer_source = (project_root / "setup.iss").read_text(encoding="utf-8")
    release_script = (project_root / "desktop" / "build-webview-release.ps1").read_text(encoding="utf-8")
    frontend_package = json.loads(
        (project_root / "frontend" / "package.json").read_text(encoding="utf-8")
    )

    backend_version = re.search(r'FastAPI\(.*?version="([^"]+)"', main_source, re.DOTALL)
    desktop_version = re.search(r"<Version>([^<]+)</Version>", desktop_project)
    installer_version = re.search(r'#define MyAppVersion "([^"]+)"', installer_source)
    release_script_version = re.search(r'\$releaseVersion = "([^"]+)"', release_script)

    assert backend_version and desktop_version and installer_version and release_script_version
    versions = {
        backend_version.group(1),
        desktop_version.group(1),
        installer_version.group(1),
        release_script_version.group(1),
        frontend_package["version"],
    }
    assert len(versions) == 1, f"Release version mismatch: {sorted(versions)}"


def test_release_excludes_local_user_config_files():
    project_root = Path(__file__).parents[2]
    spec_source = (project_root / "backend" / "IELTS Speaking Backend.spec").read_text(
        encoding="utf-8"
    )

    assert 'private_data_files = {"config.json", "whisper_config.json"}' in spec_source
    assert "path.name not in private_data_files" in spec_source
