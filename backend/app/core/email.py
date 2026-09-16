"""Envio de e-mail transacional via SMTP.

Usado pela recuperação de senha. Em produção o SMTP é obrigatório (ver a validação em
app/core/config.py): sem ele o token de redefinição só seria registrado em log, o que
permitiria a quem lê os logs assumir a conta de qualquer usuário.

Em desenvolvimento, sem SMTP_HOST configurado, `enviar_email` não envia nada e devolve
False — o chamador decide o que fazer (a rota de recuperação cai para log local).
"""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def smtp_configurado() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


def enviar_email(destinatario: str, assunto: str, corpo_texto: str) -> bool:
    """Envia um e-mail de texto simples. Retorna True se foi entregue ao servidor SMTP.

    Nunca levanta exceção para o chamador: uma falha de SMTP não deve virar erro 500 numa
    rota de recuperação de senha (além de ser um canal para descobrir se um e-mail existe).
    A falha é logada — sem o corpo da mensagem, que contém o token.
    """
    if not smtp_configurado():
        return False

    mensagem = EmailMessage()
    mensagem["Subject"] = assunto
    mensagem["From"] = f"{settings.SMTP_FROM_NOME} <{settings.SMTP_FROM}>"
    mensagem["To"] = destinatario
    mensagem.set_content(corpo_texto)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as servidor:
            servidor.starttls()
            if settings.SMTP_USER:
                servidor.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            servidor.send_message(mensagem)
    except Exception:
        # Sem exc_info com corpo: o log registra o destinatário e a falha, nunca o token.
        logger.error("Falha ao enviar e-mail para %s (assunto: %s)", destinatario, assunto)
        return False

    return True


def enviar_recuperacao_senha(destinatario: str, token: str) -> bool:
    link = f"{settings.FRONTEND_URL.rstrip('/')}/redefinir-senha?token={token}"
    corpo = (
        "Olá,\n\n"
        "Recebemos um pedido para redefinir a sua senha no Sistema de Gestão da ACPB.\n\n"
        f"Para criar uma nova senha, acesse:\n{link}\n\n"
        f"Este link expira em {settings.RESET_PASSWORD_TOKEN_EXPIRE_MINUTES} minutos e só "
        "pode ser usado uma vez.\n\n"
        "Se você não pediu a redefinição, ignore esta mensagem: sua senha atual continua "
        "valendo.\n\n"
        "Associação Cristã Pau-Brasil"
    )
    return enviar_email(destinatario, "Redefinição de senha - Sistema ACPB", corpo)
