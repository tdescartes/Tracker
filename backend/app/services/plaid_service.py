"""
Plaid Integration Service — Phase 3
Provides Link token creation, access token exchange, and transaction sync
using the Plaid API. Falls back gracefully when not configured.
"""
import httpx
from datetime import date, timedelta
from typing import Optional

PLAID_BASE_URLS = {
    "sandbox": "https://sandbox.plaid.com",
    "development": "https://development.plaid.com",
    "production": "https://production.plaid.com",
}


class PlaidService:
    def __init__(self, client_id: str, secret: str, env: str = "sandbox"):
        self.client_id = client_id
        self.secret = secret
        self.base_url = PLAID_BASE_URLS.get(env, PLAID_BASE_URLS["sandbox"])

    def _headers(self) -> dict:
        return {"Content-Type": "application/json"}

    def _auth_body(self) -> dict:
        return {"client_id": self.client_id, "secret": self.secret}

    async def create_link_token(self, user_id: str) -> dict:
        """
        Creates a Plaid Link token for the front-end to initialize Link.
        Returns { link_token, expiration, request_id }
        """
        payload = {
            **self._auth_body(),
            "user": {"client_user_id": user_id},
            "client_name": "Tracker",
            "products": ["transactions"],
            "country_codes": ["US", "CA"],
            "language": "en",
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{self.base_url}/link/token/create",
                json=payload,
                headers=self._headers(),
            )
            resp.raise_for_status()
            return resp.json()

    async def exchange_public_token(self, public_token: str) -> dict:
        """
        Exchanges the public token returned by Plaid Link for a permanent access token.
        Returns { access_token, item_id }
        """
        payload = {
            **self._auth_body(),
            "public_token": public_token,
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{self.base_url}/item/public_token/exchange",
                json=payload,
                headers=self._headers(),
            )
            resp.raise_for_status()
            return resp.json()

    async def get_accounts(self, access_token: str) -> list[dict]:
        """Returns list of accounts for the linked item."""
        payload = {**self._auth_body(), "access_token": access_token}
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{self.base_url}/accounts/get",
                json=payload,
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("accounts", [])

    async def sync_transactions(
        self,
        access_token: str,
        days_back: int = 30,
    ) -> list[dict]:
        """
        Fetches transactions for the last `days_back` days.
        Returns normalized list compatible with BankTransaction model.
        """
        start_date = (date.today() - timedelta(days=days_back)).isoformat()
        end_date = date.today().isoformat()

        payload = {
            **self._auth_body(),
            "access_token": access_token,
            "start_date": start_date,
            "end_date": end_date,
            "options": {"count": 500, "offset": 0, "include_personal_finance_category": True},
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{self.base_url}/transactions/get",
                json=payload,
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()

        raw_txns = data.get("transactions", [])
        return [_normalize_plaid_transaction(t) for t in raw_txns]

    async def get_institution_name(self, item_id: str, access_token: str) -> str:
        """Returns the bank institution name for a linked item."""
        payload = {**self._auth_body(), "access_token": access_token}
        async with httpx.AsyncClient(timeout=15.0) as client:
            item_resp = await client.post(
                f"{self.base_url}/item/get",
                json=payload,
                headers=self._headers(),
            )
            item_resp.raise_for_status()
            institution_id = item_resp.json().get("item", {}).get("institution_id")

        if not institution_id:
            return "Unknown Bank"

        payload2 = {
            **self._auth_body(),
            "institution_id": institution_id,
            "country_codes": ["US", "CA"],
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            inst_resp = await client.post(
                f"{self.base_url}/institutions/get_by_id",
                json=payload2,
                headers=self._headers(),
            )
            inst_resp.raise_for_status()
            return inst_resp.json().get("institution", {}).get("name", "Unknown Bank")


def _normalize_plaid_transaction(t: dict) -> dict:
    """
    Maps a Plaid transaction object to our internal BankTransaction format.
    Plaid amounts are positive for debits, negative for credits — we flip this.
    """
    amount = t.get("amount", 0)
    is_income = amount < 0  # Plaid credits are negative
    normalized_amount = -amount  # We store debits as negative

    category = (t.get("personal_finance_category") or {}).get("primary", "")
    if not category:
        cats = t.get("category") or []
        category = cats[0] if cats else "Uncategorized"

    return {
        "date": t.get("date"),
        "description": t.get("name", ""),
        "amount": normalized_amount,
        "is_income": is_income,
        "category": category,
        "merchant_name": t.get("merchant_name") or t.get("name", ""),
        "plaid_transaction_id": t.get("transaction_id"),
        "pending": t.get("pending", False),
    }


def get_plaid_service(settings) -> Optional[PlaidService]:
    """Factory — returns None when Plaid is not configured."""
    client_id = getattr(settings, "PLAID_CLIENT_ID", None)
    secret = getattr(settings, "PLAID_SECRET", None)
    if not client_id or not secret:
        return None
    env = getattr(settings, "PLAID_ENV", "sandbox")
    return PlaidService(client_id=client_id, secret=secret, env=env)
