import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

log = logging.getLogger(__name__)

# In the test environment messages are captured here instead of sent
sent_messages: list[EmailMessage] = []


def send_email(to: str, subject: str, body: str) -> bool:
    settings = get_settings()
    message = EmailMessage()
    message["From"] = settings.mail_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    if settings.environment == "test":
        sent_messages.append(message)
        return True
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=5) as smtp:
            smtp.send_message(message)
        return True
    except OSError:
        # Never log the body: it may contain a reset link
        log.exception("Email delivery failed (subject=%r)", subject)
        return False
