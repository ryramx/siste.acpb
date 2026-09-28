from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.erros import tratar_integrity_error
from datetime import datetime

from app.api.deps import get_current_user, get_permissoes_usuario, require_permission
from app.core.upload import exigir_tipo_real, ler_com_limite
from app.api.routes.health import get_db
from app.core.auditoria import model_to_dict, obter_ip_cliente, registrar_auditoria
from app.core.foto_pessoa_storage import (
    TAMANHO_MAXIMO_BYTES,
    TIPOS_PERMITIDOS,
    gerar_nome_armazenado,
    ler_conteudo,
    remover_arquivo_seguro,
    salvar_conteudo,
    tipo_mime_de,
)
from app.core.config import settings
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.schemas.pessoa import PessoaCreate, PessoaUpdate, PessoaResponse

router = APIRouter()


def _autorizar_acesso_foto(id: int, permissao: str, usuario_atual: Usuario, db: Session) -> None:
    """Permite o acesso quando o usuário mexe na própria foto (pessoa_id == id) ou possui a
    permissão informada. Toda pessoa pode gerenciar sua própria foto, independente do seu perfil."""
    if usuario_atual.pessoa_id == id:
        return
    if permissao in get_permissoes_usuario(usuario_atual, db):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Usuário não tem a permissão '{permissao}' necessária para esta operação",
    )

@router.get("/", response_model=list[PessoaResponse], dependencies=[Depends(require_permission("pessoas.visualizar"))])
def listar_pessoas(
    excluir_tecnicas: bool = False,
    db: Session = Depends(get_db)
):
    """`excluir_tecnicas=true` omite as contas que existem para operar o sistema.

    O padrao inclui todas de proposito: este mesmo endpoint resolve o nome de quem fez o que
    (auditoria, responsavel por lancamento) e alimenta o cadastro de usuarios, onde a conta
    tecnica precisa aparecer. Quem filtra sao as listas de *escolher uma pessoa* para uma
    atividade da associacao.
    """
    consulta = db.query(Pessoa)
    if excluir_tecnicas:
        consulta = consulta.filter(Pessoa.conta_tecnica.is_(False))
    return consulta.all()

@router.get("/{id}", response_model=PessoaResponse, dependencies=[Depends(require_permission("pessoas.visualizar"))])
def obter_pessoa(
    id: int,
    db: Session = Depends(get_db)
):
    pessoa = db.query(Pessoa).filter(Pessoa.id == id).first()
    if not pessoa:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    return pessoa

@router.post("/", response_model=PessoaResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("pessoas.criar"))])
def criar_pessoa(
    obj_in: PessoaCreate,
    db: Session = Depends(get_db)
):
    if obj_in.cpf:
        existing = db.query(Pessoa).filter(Pessoa.cpf == obj_in.cpf).first()
        if existing:
            raise HTTPException(status_code=400, detail="CPF já cadastrado")

    obj_data = obj_in.model_dump()
    obj_data['created_at'] = datetime.utcnow()
    obj_data['updated_at'] = datetime.utcnow()
    
    obj = Pessoa(**obj_data)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj

@router.put("/{id}", response_model=PessoaResponse, dependencies=[Depends(require_permission("pessoas.editar"))])
def atualizar_pessoa(
    id: int,
    obj_in: PessoaUpdate,
    db: Session = Depends(get_db)
):
    obj = db.query(Pessoa).filter(Pessoa.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    
    if obj_in.cpf and obj_in.cpf != obj.cpf:
        existing = db.query(Pessoa).filter(Pessoa.cpf == obj_in.cpf).first()
        if existing:
            raise HTTPException(status_code=400, detail="CPF já cadastrado")

    update_data = obj_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    
    obj.updated_at = datetime.utcnow()
        
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("pessoas.excluir"))])
def deletar_pessoa(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    obj = db.query(Pessoa).filter(Pessoa.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")

    registrar_auditoria(
        db,
        usuario_id=usuario_atual.id,
        acao="excluir",
        tabela="pessoas",
        registro_id=obj.id,
        dados_anteriores=model_to_dict(obj),
        ip=obter_ip_cliente(request),
    )
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None


@router.post("/{id}/foto", response_model=PessoaResponse)
async def enviar_foto_pessoa(
    id: int,
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    _autorizar_acesso_foto(id, "pessoas.editar", usuario_atual, db)

    pessoa = db.query(Pessoa).filter(Pessoa.id == id).first()
    if not pessoa:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")

    if arquivo.content_type not in TIPOS_PERMITIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de arquivo não permitido. Aceitos: {', '.join(sorted(TIPOS_PERMITIDOS))}",
        )

    conteudo = await ler_com_limite(
        arquivo, TAMANHO_MAXIMO_BYTES, settings.FOTOS_TAMANHO_MAXIMO_MB
    )
    tipo_mime = exigir_tipo_real(conteudo, TIPOS_PERMITIDOS)

    nome_antigo = pessoa.foto_arquivo
    novo_nome = gerar_nome_armazenado(tipo_mime)
    salvar_conteudo(novo_nome, conteudo, tipo_mime)

    pessoa.foto_arquivo = novo_nome
    pessoa.updated_at = datetime.utcnow()
    try:
        db.commit()
    except Exception:
        db.rollback()
        remover_arquivo_seguro(novo_nome, "rollback após falha de commit em envio de foto")
        raise
    db.refresh(pessoa)

    if nome_antigo:
        remover_arquivo_seguro(nome_antigo, "remoção de foto antiga após commit")

    return pessoa


@router.get("/{id}/foto")
def obter_foto_pessoa(
    id: int,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    _autorizar_acesso_foto(id, "pessoas.visualizar", usuario_atual, db)

    pessoa = db.query(Pessoa).filter(Pessoa.id == id).first()
    if not pessoa or not pessoa.foto_arquivo:
        raise HTTPException(status_code=404, detail="Esta pessoa não tem foto cadastrada")

    conteudo = ler_conteudo(pessoa.foto_arquivo)
    if conteudo is None:
        raise HTTPException(status_code=404, detail="Arquivo de foto não encontrado no armazenamento")

    return Response(content=conteudo, media_type=tipo_mime_de(pessoa.foto_arquivo))


@router.delete("/{id}/foto", status_code=status.HTTP_204_NO_CONTENT)
def remover_foto_pessoa(
    id: int,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    _autorizar_acesso_foto(id, "pessoas.editar", usuario_atual, db)

    pessoa = db.query(Pessoa).filter(Pessoa.id == id).first()
    if not pessoa:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    if not pessoa.foto_arquivo:
        raise HTTPException(status_code=404, detail="Esta pessoa não tem foto cadastrada")

    nome_antigo = pessoa.foto_arquivo
    pessoa.foto_arquivo = None
    pessoa.updated_at = datetime.utcnow()
    db.commit()
    remover_arquivo_seguro(nome_antigo, "remoção de foto após commit")
    return None