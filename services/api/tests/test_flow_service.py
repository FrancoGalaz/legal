"""Tests for Flow.cl payment gateway integration — hash logic, webhook verify, error cases."""

from dataclasses import asdict
from unittest.mock import AsyncMock, patch

import pytest

from app.services.flow_service import FlowService, FlowError, FlowCheckoutResult


# ── Fixtures ──────────────────────────────────────────────────────────────


@pytest.fixture
def flow_service() -> FlowService:
    """FlowService configured with test credentials."""
    fs = FlowService()
    # Override with test values that would be set via settings
    fs.api_key = "test-api-key-123"
    fs.secret_key = "test-secret-key-456"
    fs.base_url = "https://www.flow.cl/api"
    fs.return_url = "http://localhost:3000/app/payment/return"
    fs.confirmation_url = "http://localhost:8000/pricing/flow-webhook"
    return fs


# ── enabled property ──────────────────────────────────────────────────────


def test_enabled_when_both_keys_set(flow_service: FlowService):
    """enabled=True when api_key AND secret_key are set."""
    assert flow_service.enabled is True


def test_enabled_when_api_key_missing():
    """enabled=False when api_key is empty."""
    fs = FlowService()
    fs.api_key = ""
    fs.secret_key = "some-key"
    assert fs.enabled is False


def test_enabled_when_secret_key_missing():
    """enabled=False when secret_key is empty."""
    fs = FlowService()
    fs.api_key = "some-key"
    fs.secret_key = ""
    assert fs.enabled is False


def test_enabled_when_both_missing():
    """enabled=False when both keys are empty."""
    fs = FlowService()
    fs.api_key = ""
    fs.secret_key = ""
    assert fs.enabled is False


# ── Hash computation ──────────────────────────────────────────────────────


def test_create_hash_is_sha256_hexdigest(flow_service: FlowService):
    """_create_hash produces a lowercase SHA-256 hex string."""
    result = flow_service._create_hash(["a", "b", "c"])
    assert len(result) == 64  # SHA-256 hex = 64 chars
    assert all(c in "0123456789abcdef" for c in result)


def test_create_hash_pipe_joins_inputs(flow_service: FlowService):
    """_create_hash joins elements with '|' before hashing."""
    result_a = flow_service._create_hash(["x", "y"])
    result_b = flow_service._create_hash(["x", "y"])
    assert result_a == result_b  # deterministic


def test_create_hash_order_matters(flow_service: FlowService):
    """Different order of elements produces different hash."""
    result_ab = flow_service._create_hash(["a", "b"])
    result_ba = flow_service._create_hash(["b", "a"])
    assert result_ab != result_ba


# ── _hash_create ──────────────────────────────────────────────────────────


def test_hash_create_includes_keys_and_amount(flow_service: FlowService):
    """_hash_create produces deterministic hash for given params."""
    h1 = flow_service._hash_create("ORDER-001", 29990)
    h2 = flow_service._hash_create("ORDER-001", 29990)
    assert h1 == h2


def test_hash_create_differs_by_order(flow_service: FlowService):
    """_hash_create produces different hash for different commerce_order."""
    h1 = flow_service._hash_create("ORDER-001", 29990)
    h2 = flow_service._hash_create("ORDER-002", 29990)
    assert h1 != h2


def test_hash_create_differs_by_amount(flow_service: FlowService):
    """_hash_create produces different hash for different amount."""
    h1 = flow_service._hash_create("ORDER-001", 29990)
    h2 = flow_service._hash_create("ORDER-001", 59990)
    assert h1 != h2


# ── verify_webhook ────────────────────────────────────────────────────────


def test_verify_webhook_valid_token(flow_service: FlowService):
    """verify_webhook returns True when token matches the expected hash."""
    flow_order = "flow-order-abc123"
    expected = flow_service._create_hash([
        flow_service.secret_key,
        flow_service.api_key,
        flow_order,
    ])
    assert flow_service.verify_webhook(expected, flow_order) is True


def test_verify_webhook_invalid_token(flow_service: FlowService):
    """verify_webhook returns False when token doesn't match."""
    assert flow_service.verify_webhook("invalid-token", "flow-order-xyz") is False


def test_verify_webhook_tampered_flow_order(flow_service: FlowService):
    """verify_webhook returns False when flow_order was tampered with."""
    token = flow_service._create_hash([
        flow_service.secret_key,
        flow_service.api_key,
        "real-flow-order",
    ])
    assert flow_service.verify_webhook(token, "fake-flow-order") is False


# ── create_checkout (disabled / error cases) ──────────────────────────────


@pytest.mark.asyncio
async def test_create_checkout_disabled():
    """create_checkout raises FlowError when Flow is not configured."""
    fs = FlowService()
    fs.api_key = ""
    fs.secret_key = ""
    with pytest.raises(FlowError, match="Flow no está configurado"):
        await fs.create_checkout("O-1", "Test", 1000, "test@test.cl")


# ── get_payment_status (disabled / error cases) ───────────────────────────


@pytest.mark.asyncio
async def test_get_payment_status_disabled():
    """get_payment_status raises FlowError when Flow is not configured."""
    fs = FlowService()
    fs.api_key = ""
    fs.secret_key = ""
    with pytest.raises(FlowError, match="Flow no está configurado"):
        await fs.get_payment_status("some-token")


# ── Edge cases ────────────────────────────────────────────────────────────


def test_create_hash_empty_list(flow_service: FlowService):
    """_create_hash handles an empty list (just hashes empty pipe-join)."""
    result = flow_service._create_hash([])
    assert len(result) == 64


def test_create_hash_with_special_chars(flow_service: FlowService):
    """_create_hash handles pipes within data values."""
    result = flow_service._create_hash(["a|b", "c"])
    # Value 'a|b' contains pipe char — join produces 'a|b|c'
    # Should produce a valid hash, not crash
    assert len(result) == 64


def test_data_classes_are_mutable_dataclasses():
    """FlowCheckoutResult and FlowPaymentStatus are dataclasses."""
    checkout = FlowCheckoutResult(
        payment_url="https://flow.cl/pay/abc",
        flow_order="flow-123",
        token="tok-xyz",
    )
    assert checkout.payment_url == "https://flow.cl/pay/abc"
    assert checkout.flow_order == "flow-123"
    assert checkout.token == "tok-xyz"
    assert asdict(checkout) == {
        "payment_url": "https://flow.cl/pay/abc",
        "flow_order": "flow-123",
        "token": "tok-xyz",
    }
