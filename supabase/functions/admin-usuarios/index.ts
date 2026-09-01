import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const ORIGENS_PERMITIDAS = new Set([
  "https://gabrieldjti-cpu.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:8765",
  "http://127.0.0.1:8765",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AcaoAdmin = "bloquear" | "desbloquear" | "alterar_papel";
type PapelUsuario = "cliente" | "lojista" | "admin";

interface RequisicaoAdmin {
  acao?: unknown;
  usuario_id?: unknown;
  novo_papel?: unknown;
  motivo?: unknown;
}

function obterCorsHeaders(req: Request) {
  const origem = req.headers.get("origin") || "";
  const origemPermitida = ORIGENS_PERMITIDAS.has(origem)
    ? origem
    : "https://gabrieldjti-cpu.github.io";

  return {
    "Access-Control-Allow-Origin": origemPermitida,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function responder(req: Request, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...obterCorsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function normalizarEntrada(body: RequisicaoAdmin) {
  const acao = String(body.acao || "").trim().toLowerCase() as AcaoAdmin;
  const usuarioId = String(body.usuario_id || "").trim();
  const novoPapel = String(body.novo_papel || "").trim().toLowerCase() as PapelUsuario;
  const motivo = String(body.motivo || "").trim();

  if (!["bloquear", "desbloquear", "alterar_papel"].includes(acao)) {
    throw new Error("Ação administrativa inválida.");
  }

  if (!UUID_PATTERN.test(usuarioId)) {
    throw new Error("Usuário inválido.");
  }

  if (motivo.length < 5 || motivo.length > 500) {
    throw new Error("Informe um motivo entre 5 e 500 caracteres.");
  }

  if (
    acao === "alterar_papel" &&
    !["cliente", "lojista", "admin"].includes(novoPapel)
  ) {
    throw new Error("Papel de usuário inválido.");
  }

  return {
    acao,
    usuarioId,
    novoPapel: acao === "alterar_papel" ? novoPapel : null,
    motivo,
  };
}

function duracaoBanimentoAnterior(bannedUntil?: string | null) {
  if (!bannedUntil) return "none";

  const restanteMs = new Date(bannedUntil).getTime() - Date.now();
  if (!Number.isFinite(restanteMs) || restanteMs <= 0) return "none";

  return `${Math.max(1, Math.ceil(restanteMs / 1000))}s`;
}

Deno.serve(async (req: Request) => {
  const origem = req.headers.get("origin") || "";

  if (origem && !ORIGENS_PERMITIDAS.has(origem)) {
    return responder(req, 403, { erro: "Origem não permitida." });
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: obterCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return responder(req, 405, { erro: "Método não permitido." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authorization = req.headers.get("authorization") || "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return responder(req, 500, { erro: "Configuração segura indisponível." });
  }

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return responder(req, 401, { erro: "Autenticação obrigatória." });
  }

  try {
    const entrada = normalizarEntrada(await req.json() as RequisicaoAdmin);
    const token = authorization.slice(7).trim();

    const clienteUsuario = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const clienteAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user: administrador },
      error: usuarioError,
    } = await clienteUsuario.auth.getUser(token);

    if (usuarioError || !administrador) {
      return responder(req, 401, { erro: "Sessão inválida ou expirada." });
    }

    const { data: souAdmin, error: adminError } =
      await clienteUsuario.rpc("sou_admin");

    if (adminError || souAdmin !== true) {
      return responder(req, 403, { erro: "Acesso restrito a administradores." });
    }

    const parametros = {
      p_admin_id: administrador.id,
      p_usuario_id: entrada.usuarioId,
      p_acao: entrada.acao,
      p_novo_papel: entrada.novoPapel,
      p_motivo: entrada.motivo,
    };

    const { error: validacaoError } = await clienteAdmin.rpc(
      "validar_acao_usuario_admin_service",
      parametros,
    );

    if (validacaoError) {
      return responder(req, 400, { erro: validacaoError.message });
    }

    let banimentoAnterior = "none";
    let authAlterado = false;

    if (entrada.acao === "bloquear" || entrada.acao === "desbloquear") {
      const { data: usuarioAuth, error: consultaAuthError } =
        await clienteAdmin.auth.admin.getUserById(entrada.usuarioId);

      if (consultaAuthError || !usuarioAuth?.user) {
        return responder(req, 400, { erro: "Conta de autenticação não encontrada." });
      }

      banimentoAnterior = duracaoBanimentoAnterior(usuarioAuth.user.banned_until);

      const novaDuracao = entrada.acao === "bloquear"
        ? "876000h"
        : "none";

      const { error: authError } = await clienteAdmin.auth.admin.updateUserById(
        entrada.usuarioId,
        { ban_duration: novaDuracao },
      );

      if (authError) {
        return responder(req, 400, { erro: authError.message });
      }

      authAlterado = true;
    }

    const { data: resultado, error: execucaoError } = await clienteAdmin.rpc(
      "executar_acao_usuario_admin_service",
      parametros,
    );

    if (execucaoError) {
      if (authAlterado) {
        const { error: restauracaoError } =
          await clienteAdmin.auth.admin.updateUserById(
            entrada.usuarioId,
            { ban_duration: banimentoAnterior },
          );

        if (restauracaoError) {
          console.error("Falha ao restaurar banimento anterior:", restauracaoError);
        }
      }

      return responder(req, 400, { erro: execucaoError.message });
    }

    return responder(req, 200, {
      sucesso: true,
      resultado,
    });
  } catch (erro) {
    const mensagem = erro instanceof Error
      ? erro.message
      : "Não foi possível concluir a ação administrativa.";

    return responder(req, 400, { erro: mensagem });
  }
});
