"""
Async work with Celery. Emails/notifications must never slow down the
API response, so they go to a Redis-backed queue and are processed by
a separate worker process — same rationale as the FastAPI version.
"""
import logging
from celery import shared_task

logger = logging.getLogger("crm")


@shared_task(bind=True, max_retries=3)
def notify_deal_stage_changed(self, deal_id: str, stage_id: str):
    """
    Notify relevant users when a deal moves stages.
    In production this would hook into an email service, Slack, or a
    WebSocket push for live UI updates.
    """
    try:
        logger.info(f"[notify] Deal {deal_id} moved to stage {stage_id}")
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)


@shared_task
def send_daily_activity_digest():
    """
    Scheduled task (Celery Beat) that emails each user a summary of
    today's activities every morning.
    """
    # TODO: query today's activities grouped by assigned_to, send email
    pass
