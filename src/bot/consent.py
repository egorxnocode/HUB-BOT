"""Mandatory legal-consent screen shared by /start and the global bot gate."""

from __future__ import annotations

from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message

from src.bot.screen import safe_answer, show_screen
from src.infrastructure.database.models.user import User


def requires_legal_consent(user: User, *, required: bool, version: str) -> bool:
    """A version change invalidates an older acceptance and asks again."""
    return required and (not user.is_rules_accepted or user.rules_accepted_version != version)


async def show_legal_consent(
    target: Message | CallbackQuery,
    *,
    privacy_url: str,
    offer_url: str,
) -> None:
    rows: list[list[InlineKeyboardButton]] = []
    if privacy_url.startswith("https://"):
        rows.append([InlineKeyboardButton(text="🔐 Политика конфиденциальности", url=privacy_url)])
    if offer_url.startswith("https://"):
        rows.append([InlineKeyboardButton(text="📃 Публичная оферта", url=offer_url)])
    rows.append(
        [InlineKeyboardButton(text="✅ Принимаю и продолжаю", callback_data="legal:accept")]
    )
    await show_screen(
        target,
        "<b>Перед использованием сервиса</b>\n\n"
        "Ознакомьтесь с политикой конфиденциальности и публичной офертой.\n\n"
        "Нажимая «Принимаю и продолжаю», вы подтверждаете согласие с обоими документами.",
        InlineKeyboardMarkup(inline_keyboard=rows),
    )
    await safe_answer(target)
