"""Single source of truth for client apps and subscription import links.

Remnawave remains the owner of the actual subscription URL/config.  This module only
describes how the same URL is installed in supported clients, so the bot, Mini App,
browser cabinet and the TV transfer instructions cannot drift apart.
"""

# ruff: noqa: RUF001

from __future__ import annotations

from copy import deepcopy
from typing import Any
from urllib.parse import quote

PLATFORM_LABELS: dict[str, str] = {
    "ios": "iPhone / iPad",
    "android": "Android",
    "windows": "Windows",
    "macos": "macOS",
    "android_tv": "Android TV",
    "apple_tv": "Apple TV",
}

# Links are deliberately editable in Admin -> Mini-app. INCY store URLs and custom
# icons are left empty until the owner supplies the exact regional assets.
DEFAULT_CONNECTION_CATALOG: dict[str, list[dict[str, Any]]] = {
    "ios": [
        {
            "id": "happ-ios",
            "name": "Happ",
            "icon_url": "",
            "download_url": "https://apps.apple.com/ru/app/happ-proxy-utility-plus/id6746188973",
            "import_template": "happ://add/{{SUBSCRIPTION_LINK}}",
            "instruction": (
                "Установите Happ, нажмите «Добавить подписку», затем разрешите VPN-конфигурацию."
            ),
        },
        {
            "id": "incy-ios",
            "name": "INCY",
            "icon_url": "",
            "download_url": "",
            "import_template": "incy://add/{{SUBSCRIPTION_LINK}}",
            "instruction": "Установите INCY, добавьте подписку и разрешите VPN-конфигурацию.",
        },
    ],
    "android": [
        {
            "id": "happ-android",
            "name": "Happ",
            "icon_url": "",
            "download_url": "https://play.google.com/store/apps/details?id=com.happproxy",
            "import_template": "happ://add/{{SUBSCRIPTION_LINK}}",
            "instruction": (
                "Установите Happ, добавьте подписку и подтвердите создание VPN-подключения."
            ),
        },
        {
            "id": "incy-android",
            "name": "INCY",
            "icon_url": "",
            "download_url": "",
            "import_template": "incy://add/{{SUBSCRIPTION_LINK}}",
            "instruction": (
                "Установите INCY, добавьте подписку и подтвердите создание VPN-подключения."
            ),
        },
    ],
    "windows": [
        {
            "id": "happ-windows",
            "name": "Happ",
            "icon_url": "",
            "download_url": "https://github.com/Happ-proxy/happ-desktop/releases/latest",
            "import_template": "happ://add/{{SUBSCRIPTION_LINK}}",
            "instruction": "Установите Happ, добавьте подписку и включите подключение.",
        },
        {
            "id": "flclashx-windows",
            "name": "FlClashX",
            "icon_url": "",
            "download_url": "https://github.com/pluralplay/FlClashX/releases/latest",
            "import_template": "flclashx://install-config?url={{SUBSCRIPTION_LINK_ENCODED}}",
            "instruction": "Установите FlClashX, добавьте профиль и включите TUN Mode.",
        },
    ],
    "macos": [
        {
            "id": "happ-macos",
            "name": "Happ",
            "icon_url": "",
            "download_url": "https://github.com/Happ-proxy/happ-desktop/releases/latest",
            "import_template": "happ://add/{{SUBSCRIPTION_LINK}}",
            "instruction": "Установите Happ, добавьте подписку и разрешите VPN-конфигурацию.",
        },
        {
            "id": "flclashx-macos",
            "name": "FlClashX",
            "icon_url": "",
            "download_url": "https://github.com/pluralplay/FlClashX/releases/latest",
            "import_template": "flclashx://install-config?url={{SUBSCRIPTION_LINK_ENCODED}}",
            "instruction": (
                "Выберите сборку для Apple Silicon или Intel, добавьте профиль и включите TUN Mode."
            ),
        },
    ],
    "android_tv": [
        {
            "id": "happ-android-tv",
            "name": "Happ",
            "icon_url": "",
            "download_url": "https://play.google.com/store/apps/details?id=com.happproxy",
            "import_template": "happ://add/{{SUBSCRIPTION_LINK}}",
            "instruction": (
                "Установите Happ на телевизор, откройте «+» → Web Import. "
                "Код появится на экране ТВ; передача выполняется с телефона."
            ),
        },
    ],
    "apple_tv": [
        {
            "id": "happ-apple-tv",
            "name": "Happ",
            "icon_url": "",
            "download_url": "https://apps.apple.com/us/app/happ-proxy-utility-for-tv/id6748297274",
            "import_template": "happ://add/{{SUBSCRIPTION_LINK}}",
            "instruction": (
                "Установите Happ на Apple TV, откройте «+» → Web Import. "
                "Код появится на экране ТВ; передача выполняется с телефона."
            ),
        },
    ],
}


def _safe_url(value: Any, *, allow_app_scheme: bool = False) -> str:
    raw = str(value or "").strip()[:1000]
    allowed: tuple[str, ...] = ("https://", "http://")
    if allow_app_scheme:
        allowed += ("happ://", "incy://", "flclashx://", "stash://")
    return raw if raw.lower().startswith(allowed) else ""


def clean_connection_catalog(raw: Any) -> dict[str, list[dict[str, Any]]]:
    """Validate the owner-editable catalogue while keeping every platform available."""
    if not isinstance(raw, dict):
        return deepcopy(DEFAULT_CONNECTION_CATALOG)
    out: dict[str, list[dict[str, Any]]] = {}
    for platform in PLATFORM_LABELS:
        apps: list[dict[str, Any]] = []
        items = raw.get(platform)
        if isinstance(items, list):
            for index, item in enumerate(items[:4]):
                if not isinstance(item, dict):
                    continue
                name = str(item.get("name") or "").strip()[:40]
                template = _safe_url(item.get("import_template"), allow_app_scheme=True)
                if not name or "{{SUBSCRIPTION_LINK" not in template:
                    continue
                apps.append(
                    {
                        "id": str(item.get("id") or f"{platform}-{index}")[:48],
                        "name": name,
                        "icon_url": _safe_url(item.get("icon_url")),
                        "download_url": _safe_url(item.get("download_url")),
                        "import_template": template,
                        "instruction": str(item.get("instruction") or "")[:500],
                    }
                )
        out[platform] = apps or deepcopy(DEFAULT_CONNECTION_CATALOG[platform])
    return out


def effective_connection_catalog(ui: Any) -> dict[str, list[dict[str, Any]]]:
    raw = ui.get("connection_apps") if isinstance(ui, dict) else None
    return clean_connection_catalog(raw)


def render_import_link(template: str, subscription_url: str, crypto_link: str | None = None) -> str:
    """Render a safe app deep-link without changing the Remnawave subscription URL."""
    if template.startswith("happ://") and crypto_link:
        return crypto_link
    return template.replace(
        "{{SUBSCRIPTION_LINK_ENCODED}}", quote(subscription_url, safe="")
    ).replace("{{SUBSCRIPTION_LINK}}", subscription_url)


def materialize_connection_catalog(
    ui: Any, subscription_url: str, crypto_link: str | None = None
) -> list[dict[str, Any]]:
    catalog = effective_connection_catalog(ui)
    return [
        {
            "id": platform,
            "label": PLATFORM_LABELS[platform],
            "tv": platform.endswith("_tv"),
            "apps": [
                {
                    **{k: v for k, v in app.items() if k != "import_template"},
                    "import_url": render_import_link(
                        str(app["import_template"]), subscription_url, crypto_link
                    ),
                    **(
                        {
                            "tv_web_import_url": "https://tv.happ.su",
                            "tv_help_url": (
                                "https://www.happ.su/main/faq/apple-tv-tvos"
                                if platform == "apple_tv"
                                else "https://www.happ.su/main/faq/android-tv"
                            ),
                            # tv.happ.su expects the subscription itself, not the mobile
                            # ``happ://add`` wrapper/crypto deep-link.
                            "tv_transfer_value": subscription_url,
                        }
                        if platform.endswith("_tv") and str(app["name"]).lower() == "happ"
                        else {}
                    ),
                }
                for app in apps
            ],
        }
        for platform, apps in catalog.items()
    ]


def build_remnawave_page_config(ui: Any) -> dict[str, Any]:
    """Export the same catalogue in Remnawave Subscription Page app-config v1 shape."""
    platform_keys = {
        "ios": "ios",
        "android": "android",
        "windows": "windows",
        "macos": "macos",
        "android_tv": "androidTV",
        "apple_tv": "appleTV",
    }
    result: dict[str, Any] = {}
    for platform, apps in effective_connection_catalog(ui).items():
        exported_apps = []
        for app in apps:
            blocks: list[dict[str, Any]] = []
            if app["download_url"]:
                blocks.append(
                    {
                        "title": {"ru": "Установка приложения", "en": "App installation"},
                        "description": {
                            "ru": "Скачайте и установите приложение на устройство.",
                            "en": "Download and install the app on your device.",
                        },
                        "buttons": [
                            {
                                "text": {"ru": "Скачать", "en": "Download"},
                                "link": app["download_url"],
                                "type": "external",
                                "svgIconKey": "ExternalLink",
                            }
                        ],
                        "svgIconKey": "DownloadIcon",
                        "svgIconColor": "violet",
                    }
                )
            blocks.append(
                {
                    "title": {"ru": "Добавление подписки", "en": "Add subscription"},
                    "description": {
                        "ru": app["instruction"] or "Нажмите кнопку, чтобы добавить подписку.",
                        "en": "Tap the button to add the subscription.",
                    },
                    "buttons": [
                        {
                            "text": {"ru": "Добавить подписку", "en": "Add subscription"},
                            "link": app["import_template"],
                            "type": "subscriptionLink",
                            "svgIconKey": "Plus",
                        }
                    ],
                    "svgIconKey": "CloudDownload",
                    "svgIconColor": "cyan",
                }
            )
            exported_apps.append(
                {"name": app["name"], "featured": True, "svgIconKey": "App", "blocks": blocks}
            )
        result[platform_keys[platform]] = {
            "displayName": {"ru": PLATFORM_LABELS[platform], "en": PLATFORM_LABELS[platform]},
            "svgIconKey": "Device",
            "apps": exported_apps,
        }
    return {
        "version": "1",
        "locales": ["ru", "en"],
        "uiConfig": {
            "subscriptionInfoBlockType": "collapsed",
            "installationGuidesBlockType": "cards",
        },
        "platforms": result,
    }


def build_deep_links(subscription_url: str, crypto_link: str | None = None) -> dict[str, str]:
    """Legacy one-tap links retained for compatible external consumers."""
    return {
        "happ": crypto_link or f"happ://add/{subscription_url}",
        "v2raytun": f"v2raytun://import/{subscription_url}",
        "hiddify": f"hiddify://import/{subscription_url}",
        "streisand": f"streisand://import/{subscription_url}",
    }
