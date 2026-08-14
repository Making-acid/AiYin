import pytest

from app.core import runtime


@pytest.mark.parametrize("value, expected", [("0", 0), ("8000", 8000), ("65535", 65535)])
def test_configured_port_accepts_valid_values(monkeypatch, value, expected):
    monkeypatch.setenv("IELTS_PORT", value)
    assert runtime.configured_port() == expected


@pytest.mark.parametrize("value", ["invalid", "-1", "65536"])
def test_configured_port_rejects_invalid_values(monkeypatch, value):
    monkeypatch.setenv("IELTS_PORT", value)
    with pytest.raises(RuntimeError):
        runtime.configured_port()


def test_write_port_file_is_atomic(monkeypatch, tmp_path):
    path = tmp_path / "runtime" / "backend.port"
    monkeypatch.setenv("IELTS_PORT_FILE", str(path))

    assert runtime.write_port_file(43123) == path
    assert path.read_text(encoding="ascii") == "43123"
    assert not path.with_suffix(".port.tmp").exists()
