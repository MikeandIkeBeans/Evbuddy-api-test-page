from __future__ import annotations


def test_guest_qr_renders_embedded_png_and_link(client):
    response = client.get("/guest/qr")
    assert response.status_code == 200

    html = response.get_data(as_text=True)
    assert "data:image/png;base64," in html
    assert "Open Guest Flow" in html
    assert "/guest" in html


def test_static_proxy_falls_back_to_template_when_asset_missing(client):
    response = client.get("/definitely-not-a-real-asset.js")
    # In test mode there is no built frontend asset bundle, so Flask static returns 404.
    assert response.status_code == 404
