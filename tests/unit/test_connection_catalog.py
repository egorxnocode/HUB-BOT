from src.application.services.connection import (
    build_remnawave_page_config,
    clean_connection_catalog,
    materialize_connection_catalog,
)


def test_default_catalog_has_required_mobile_choices_and_tv_flow() -> None:
    platforms = materialize_connection_catalog({}, "https://sub.example/u/a?x=1")
    by_id = {platform["id"]: platform for platform in platforms}

    assert [app["name"] for app in by_id["ios"]["apps"]] == ["Happ", "INCY"]
    assert [app["name"] for app in by_id["android"]["apps"]] == ["Happ", "INCY"]
    assert by_id["android_tv"]["apps"][0]["tv_web_import_url"] == "https://tv.happ.su"
    assert by_id["apple_tv"]["apps"][0]["tv_transfer_value"].startswith("https://sub.")


def test_catalog_renders_encoded_import_and_rejects_unsafe_urls() -> None:
    raw = {
        "windows": [
            {
                "id": "client",
                "name": "Client",
                "icon_url": "javascript:alert(1)",
                "download_url": "https://download.example/app",
                "import_template": "flclashx://install-config?url={{SUBSCRIPTION_LINK_ENCODED}}",
                "instruction": "Install",
            }
        ]
    }
    cleaned = clean_connection_catalog(raw)
    assert cleaned["windows"][0]["icon_url"] == ""
    platforms = materialize_connection_catalog(
        {"connection_apps": cleaned}, "https://sub.example/u/a?x=1&y=2"
    )
    windows = next(item for item in platforms if item["id"] == "windows")
    assert windows["apps"][0]["import_url"].endswith(
        "https%3A%2F%2Fsub.example%2Fu%2Fa%3Fx%3D1%26y%3D2"
    )


def test_remnawave_export_uses_same_catalog() -> None:
    exported = build_remnawave_page_config({})
    ios = exported["platforms"]["ios"]
    assert [app["name"] for app in ios["apps"]] == ["Happ", "INCY"]
    add_button = ios["apps"][1]["blocks"][-1]["buttons"][0]
    assert add_button["link"] == "incy://add/{{SUBSCRIPTION_LINK}}"
    assert add_button["type"] == "subscriptionLink"
