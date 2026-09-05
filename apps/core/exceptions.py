"""
Wraps DRF's default exception handler to return a consistent error shape,
matching the FastAPI version's validation_exception_handler.
"""
from rest_framework.views import exception_handler as drf_exception_handler


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is not None:
        response.data = {
            "detail": response.data.get("detail", "Request failed")
            if isinstance(response.data, dict)
            else "Validation error",
            "errors": response.data if not isinstance(response.data, dict) or "detail" not in response.data else None,
        }
        if response.data["errors"] is None:
            response.data.pop("errors")
    return response
