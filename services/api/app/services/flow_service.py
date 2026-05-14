"""
Flow.cl payment gateway integration for Chilean payments.

Flow API: https://www.flow.cl/docs/api-flow.html

Key flows:
  1. create_checkout → generates a payment link for the user
  2. verify_payment → validates webhook confirmation
  3. get_payment_status → queries payment status directly
"""

import hashlib
import logging
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class FlowError(Exception):
    """Raised when Flow API returns a non-success response."""


@dataclass
class FlowCheckoutResult:
    payment_url: str
    flow_order: str
    token: str


@dataclass
class FlowPaymentStatus:
    flow_order: str
    commerce_order: str
    status: int  # 1=pendiente, 2=aprobada, 3=rechazada, 4=cancelada
    amount: int
    email: str


class FlowService:
    """Handles all Flow.cl API interactions."""

    def __init__(self) -> None:
        self.api_key = settings.FLOW_API_KEY
        self.secret_key = settings.FLOW_SECRET_KEY
        self.base_url = settings.FLOW_BASE_URL
        self.return_url = settings.FLOW_RETURN_URL
        self.confirmation_url = settings.FLOW_CONFIRMATION_URL

    @property
    def enabled(self) -> bool:
        return bool(self.api_key) and bool(self.secret_key)

    # ── Hash helpers ──────────────────────────────────────

    def _create_hash(self, data: list[str]) -> str:
        """Flow uses SHA-256 hex digests of pipe-joined strings."""
        return hashlib.sha256("|".join(data).encode("utf-8")).hexdigest()

    def _hash_create(self, commerce_order: str, amount: int) -> str:
        """Hash for create-payment request."""
        return self._create_hash([
            self.secret_key,
            self.api_key,
            commerce_order,
            str(amount),
            self.confirmation_url,
        ])

    def _hash_verify(self, token: str) -> str:
        """Hash to verify an incoming webhook token."""
        return self._create_hash([self.secret_key, token])

    # ── API methods ───────────────────────────────────────

    async def create_checkout(
        self,
        commerce_order: str,
        subject: str,
        amount: int,
        email: str,
    ) -> FlowCheckoutResult:
        """Create a payment order and return the Flow checkout URL.

        Args:
            commerce_order: Your internal order/transaction ID.
            subject: Description shown to the user (e.g. "Plan Pro Legal Agent CL").
            amount: Amount in CLP (integer, no decimals).
            email: Payer's email for the receipt.

        Returns:
            FlowCheckoutResult with the payment URL to redirect the user to.

        Raises:
            FlowError if the API call fails.
        """
        if not self.enabled:
            raise FlowError(
                "Flow no está configurado. Define FLOW_API_KEY y FLOW_SECRET_KEY en .env"
            )

        params: dict[str, Any] = {
            "apiKey": self.api_key,
            "commerceOrder": commerce_order,
            "subject": subject,
            "currency": "CLP",
            "amount": amount,
            "email": email,
            "urlConfirmation": self.confirmation_url,
            "urlReturn": self.return_url,
        }
        params["s"] = self._hash_create(commerce_order, amount)

        logger.info(
            "Flow.create_checkout: order=%s amount=%d email=%s",
            commerce_order,
            amount,
            email,
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/payment/create",
                data=params,
            )

        if resp.status_code != 200:
            raise FlowError(
                f"Flow API error (HTTP {resp.status_code}): {resp.text}"
            )

        data: dict = resp.json()
        if "url" not in data or "token" not in data:
            raise FlowError(f"Respuesta inesperada de Flow: {data}")

        return FlowCheckoutResult(
            payment_url=data["url"],
            flow_order=str(data.get("flowOrder", "")),
            token=data["token"],
        )

    def verify_webhook(self, token: str, flow_order: str) -> bool:
        """Verify the hash of an incoming webhook notification.

        Flow sends a POST to urlConfirmation with 'token' and 'flowOrder'.
        The expected hash is SHA256(secret + '|' + apiKey + '|' + flowOrder).

        Returns True if the webhook is authentic.
        """
        expected = self._create_hash([
            self.secret_key,
            self.api_key,
            flow_order,
        ])
        return token == expected

    async def get_payment_status(self, token: str) -> FlowPaymentStatus:
        """Query the status of a payment by its token.

        The token used here is the *same* token returned by create_checkout.
        """
        if not self.enabled:
            raise FlowError("Flow no está configurado")

        params = {
            "apiKey": self.api_key,
            "token": token,
        }

        logger.info("Flow.get_payment_status: checking token %s...", token[:16])

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/payment/getStatus",
                data=params,
            )

        if resp.status_code != 200:
            raise FlowError(
                f"Flow API error (HTTP {resp.status_code}): {resp.text}"
            )

        data: dict = resp.json()
        return FlowPaymentStatus(
            flow_order=str(data.get("flowOrder", "")),
            commerce_order=data.get("commerceOrder", ""),
            status=int(data.get("status", 0)),
            amount=int(data.get("amount", 0)),
            email=data.get("email", ""),
        )
