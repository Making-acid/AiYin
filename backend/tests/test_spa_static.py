from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.spa_static import SPAStaticFiles


def test_spa_routes_fall_back_to_index(tmp_path):
    (tmp_path / "index.html").write_text("<title>IELTS</title>", encoding="utf-8")
    (tmp_path / "asset.js").write_text("console.log('ok')", encoding="utf-8")
    app = FastAPI()
    app.mount("/", SPAStaticFiles(directory=str(tmp_path), html=True), name="static")
    client = TestClient(app)

    assert client.get("/settings").status_code == 200
    assert client.get("/report/session-id").text == "<title>IELTS</title>"
    assert client.get("/asset.js").status_code == 200


def test_spa_routes_do_not_mask_api_or_asset_404s(tmp_path):
    (tmp_path / "index.html").write_text("<title>IELTS</title>", encoding="utf-8")
    app = FastAPI()
    app.mount("/", SPAStaticFiles(directory=str(tmp_path), html=True), name="static")
    client = TestClient(app)

    assert client.get("/exam/missing").status_code == 404
    assert client.get("/tts/missing").status_code == 404
    assert client.get("/missing.js").status_code == 404
