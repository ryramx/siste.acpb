"""Envio de e-mail transacional, por API HTTPS (Brevo) ou por SMTP.

Usado pela recuperação de senha. Em produção um dos dois é obrigatório (ver a validação em
app/core/config.py): sem envio, o token de redefinição só seria registrado em log, o que
permitiria a quem lê os logs assumir a conta de qualquer usuário.

Por que dois caminhos: o Render bloqueia as portas de SMTP (25, 465 e 587) nos serviços do
plano gratuito desde setembro de 2025, para conter spam. Lá, qualquer SMTP falha por timeout
por mais correta que esteja a configuração -- e foi exatamente o que aconteceu aqui: o
sistema dizia "instruções enviadas" e nenhum e-mail saía. Uma API sobre HTTPS atravessa o
bloqueio. O SMTP continua atendendo o desenvolvimento e um eventual servidor próprio.

Sem backend configurado, `enviar_email` não envia nada e devolve False -- o chamador decide
o que fazer (a rota de recuperação cai para log local).
"""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

BREVO_URL = "https://api.brevo.com/v3/smtp/email"
TIMEOUT_SEGUNDOS = 15


def smtp_configurado() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


def brevo_configurado() -> bool:
    return bool(settings.BREVO_API_KEY and settings.remetente)


def email_configurado() -> bool:
    if settings.EMAIL_BACKEND == "brevo":
        return brevo_configurado()
    return smtp_configurado()


def _enviar_por_brevo(destinatario: str, assunto: str, corpo_texto: str) -> None:
    """Levanta em caso de falha; quem chama registra e devolve False."""
    resposta = httpx.post(
        BREVO_URL,
        headers={
            "api-key": settings.BREVO_API_KEY,
            "accept": "application/json",
            "content-type": "application/json",
        },
        json={
            "sender": {"name": settings.remetente_nome, "email": settings.remetente},
            "to": [{"email": destinatario}],
            "subject": assunto,
            "textContent": corpo_texto,
        },
        timeout=TIMEOUT_SEGUNDOS,
    )
    resposta.raise_for_status()


def _enviar_por_smtp(destinatario: str, assunto: str, corpo_texto: str) -> None:
    """Levanta em caso de falha; quem chama registra e devolve False."""
    mensagem = EmailMessage()
    mensagem["Subject"] = assunto
    mensagem["From"] = f"{settings.remetente_nome} <{settings.remetente}>"
    mensagem["To"] = destinatario
    mensagem.set_content(corpo_texto)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=TIMEOUT_SEGUNDOS) as servidor:
        servidor.starttls()
        if settings.SMTP_USER:
            servidor.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        servidor.send_message(mensagem)


def enviar_email(destinatario: str, assunto: str, corpo_texto: str) -> bool:
    """Envia um e-mail de texto simples. Retorna True se foi aceito pelo provedor.

    Nunca levanta exceção para o chamador: uma falha de envio não deve virar erro 500 numa
    rota de recuperação de senha (além de ser um canal para descobrir se um e-mail existe).
    A falha é logada — sem o corpo da mensagem, que contém o token.
    """
    if not email_configurado():
        return False

    try:
        if settings.EMAIL_BACKEND == "brevo":
            _enviar_por_brevo(destinatario, assunto, corpo_texto)
        else:
            _enviar_por_smtp(destinatario, assunto, corpo_texto)
    except Exception:
        # Sem exc_info com corpo: o log registra o destinatário e a falha, nunca o token.
        logger.error(
            "Falha ao enviar e-mail para %s por %s (assunto: %s)",
            destinatario,
            settings.EMAIL_BACKEND,
            assunto,
        )
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
