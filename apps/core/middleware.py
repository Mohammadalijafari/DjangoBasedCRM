import logging
import time

logger = logging.getLogger("crm")


class RequestLoggingMiddleware:
    """Simple timing + logging middleware, matching the FastAPI version's."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.perf_counter()
        response = self.get_response(request)
        duration_ms = (time.perf_counter() - start) * 1000
        response["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
        logger.info(f"{request.method} {request.path} - {duration_ms:.2f}ms")
        return response
