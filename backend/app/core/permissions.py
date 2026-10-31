"""Permission catalogue and the default grants of each system role.

Adding a permission: add it to PERMISSIONS, grant it in ROLE_GRANTS, then run
`python -m scripts.bootstrap` (or restart the seed) - ensure_tenant() syncs grants idempotently.
"""

PERMISSIONS: dict[str, str] = {
    "users.read": "List staff and customer accounts",
    "users.create_staff": "Create staff accounts",
    "users.manage": "Activate or deactivate accounts",
    "customers.read": "View customer records",
    "customers.write": "Create and edit customer records",
    "audit.read": "Read the audit log",
    "portal.access": "Use the customer self-service portal",
}

ADMIN, STAFF, CUSTOMER = "admin", "staff", "customer"

ROLE_GRANTS: dict[str, tuple[str, set[str]]] = {
    ADMIN: ("Administrator", set(PERMISSIONS) - {"portal.access"}),
    STAFF: ("Staff", {"customers.read", "customers.write"}),
    CUSTOMER: ("Customer", {"portal.access"}),
}
