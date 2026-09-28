from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permission
from app.core.upload import exigir_tipo_real, ler_com_limite
from app.core.anexos_storage import (
    TAMANHO_MAXIMO_BYTES,
    TIPOS_PERMITIDOS,
    gerar_nome_armazenado,
    ler_conteudo,
    remover_arquivo_seguro,
    salvar_conteudo,
)
from app.core.auditoria import obter_ip_cliente, registrar_auditoria
from app.core.config import settings
from app.db.session import get_db
from app.models.anexo_financeiro import AnexoFinanceiro
from app.models.movimentacao_financeira import MovimentacaoFinanceira
from app.models.usuario import Usuario
from app.schemas.anexo_financeiro import AnexoFinanceiroResponse

router = APIRouter()

_visualizar = [Depends(require_permission("financeiro.visualizar"))]
_criar = [Depends(require_permission("financeiro.criar"))]
_editar = [Depends(require_permission("financeiro.editar"))]


@router.get("/", response_model=list[AnexoFinanceiroResponse], dependencies=_visualizar)
def listar_anexos(movimentacao_financeira_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(AnexoFinanceiro)
    if movimentacao_financeira_id is not None:
        query = query.filter(
            AnexoFinanceiro.movimentacao_financeira_id == movimentacao_financeira_id
        )
    return query.order_by(AnexoFinanceiro.created_at.desc()).all()


@router.post(
    "/", response_model=AnexoFinanceiroResponse, status_code=status.HTTP_201_CREATED, dependencies=_criar
)
async def enviar_anexo(
    request: Request,
    movimentacao_financeira_id: int = Form(...),
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    if not db.query(MovimentacaoFinanceira).filter(
        MovimentacaoFinanceira.id == movimentacao_financeira_id
    ).first():
        raise HTTPException(status_code=404, detail="Movimentação financeira não encontrada")

    if arquivo.content_type not in TIPOS_PERMITIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de arquivo não permitido. Aceitos: {', '.join(sorted(TIPOS_PERMITIDOS))}",
        )

    conteudo = await ler_com_limite(
        arquivo, TAMANHO_MAXIMO_BYTES, settings.ANEXOS_TAMANHO_MAXIMO_MB
    )
    # O tipo que vale é o do conteúdo, não o declarado pelo navegador.
    tipo_mime = exigir_tipo_real(conteudo, TIPOS_PERMITIDOS)

    nome_armazenado = gerar_nome_armazenado(tipo_mime)
    salvar_conteudo(nome_armazenado, conteudo, tipo_mime)

    obj = AnexoFinanceiro(
        movimentacao_financeira_id=movimentacao_financeira_id,
        nome_original=arquivo.filename or "arquivo",
        nome_armazenado=nome_armazenado,
        tipo_mime=tipo_mime,
        tamanho_bytes=len(conteudo),
        enviado_por_usuario_id=usuario_atual.id,
        created_at=datetime.utcnow(),
    )
    db.add(obj)
    try:
        db.flush()
        registrar_auditoria(
            db,
            usuario_id=usuario_atual.id,
            acao="criar",
            tabela="anexos_financeiros",
            registro_id=obj.id,
            dados_novos={
                "movimentacao_financeira_id": movimentacao_financeira_id,
                "nome_original": obj.nome_original,
                "tamanho_bytes": obj.tamanho_bytes,
            },
            ip=obter_ip_cliente(request),
        )
        db.commit()
    except Exception:
        db.rollback()
        remover_arquivo_seguro(
            nome_armazenado, "rollback após falha de commit em envio de anexo"
        )
        raise
    db.refresh(obj)
    return obj


@router.get("/{id}/download", dependencies=_visualizar)
def baixar_anexo(id: int, db: Session = Depends(get_db)):
    obj = db.query(AnexoFinanceiro).filter(AnexoFinanceiro.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")

    conteudo = ler_conteudo(obj.nome_armazenado)
    if conteudo is None:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no armazenamento")

    # Content-Disposition explícito: sem o atalho do FileResponse (que lê do disco), o nome
    # original precisa ser devolvido à mão. Aspas escapadas evitam quebrar o header com
    # nomes de arquivo que contenham aspas.
    nome = obj.nome_original.replace('"', '\\"')
    return Response(
        content=conteudo,
        media_type=obj.tipo_mime,
        headers={"Content-Disposition": f'attachment; filename="{nome}"'},
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=_editar)
def deletar_anexo(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    obj = db.query(AnexoFinanceiro).filter(AnexoFinanceiro.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")

    registrar_auditoria(
        db,
        usuario_id=usuario_atual.id,
        acao="excluir",
        tabela="anexos_financeiros",
        registro_id=obj.id,
        dados_anteriores={
            "movimentacao_financeira_id": obj.movimentacao_financeira_id,
            "nome_original": obj.nome_original,
        },
        ip=obter_ip_cliente(request),
    )
    nome_armazenado = obj.nome_armazenado
    db.delete(obj)
    db.commit()
    remover_arquivo_seguro(nome_armazenado, "remoção de anexo após commit")
    return None
