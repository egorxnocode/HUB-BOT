"""Mandatory legal consent and document-version invalidation."""

from src.bot.consent import requires_legal_consent
from src.infrastructure.database.models.user import User


def _user(*, accepted: bool, version: str | None) -> User:
    return User(is_rules_accepted=accepted, rules_accepted_version=version)


def test_consent_required_until_current_version_is_accepted() -> None:
    assert requires_legal_consent(_user(accepted=False, version=None), required=True, version="v1")
    assert requires_legal_consent(_user(accepted=True, version=None), required=True, version="v1")
    assert requires_legal_consent(_user(accepted=True, version="v0"), required=True, version="v1")
    assert not requires_legal_consent(
        _user(accepted=True, version="v1"), required=True, version="v1"
    )


def test_owner_can_disable_consent_gate() -> None:
    assert not requires_legal_consent(
        _user(accepted=False, version=None), required=False, version="v1"
    )
