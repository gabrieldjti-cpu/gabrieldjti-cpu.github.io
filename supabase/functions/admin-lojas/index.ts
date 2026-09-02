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
const HORARIO_PATTERN = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;

interface RequisicaoEdicaoLoja {
  acao?: unknown;
  loja_id?: unknown;
  nome?: unknown;
  categoria_id?: unknown;
  descricao?: unknown;
  telefone?: unknown;
  whatsapp?: unknown;
  endereco?: unknown;
  cidade?: unknown;
  estado?: unknown;
  horario_abertura?: unknown;
  horario_fechamento?: unknown;
  taxa_entrega?: unknown;
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

function textoOpcional(valor: unknown) {
  const texto = String(valor ?? "").trim();
  return texto || null;
}

function normalizarEntrada(body: RequisicaoEdicaoLoja) {
  const acao = String(body.acao || "").trim().toLowerCase();
  const lojaId = String(body.loja_id || "").trim();
  const nome = String(body.nome || "").trim();
  const categoriaId = Number(body.categoria_id);
  const descricao = textoOpcional(body.descricao);
  const telefone = textoOpcional(body.telefone);
  const whatsapp = textoOpcional(body.whatsapp);
  const endereco = textoOpcional(body.endereco);
  const cidade = textoOpcional(body.cidade);
  const estado = textoOpcional(body.estado)?.toUpperCase() || null;
  const horarioAbertura = textoOpcional(body.horario_abertura);
  const horarioFechamento = textoOpcional(body.horario_fechamento);
  const taxaEntregaTexto = String(body.taxa_entrega ?? "").trim();
  const taxaEntrega = taxaEntregaTexto === "" ? Number.NaN : Number(taxaEntregaTexto);
  const motivo = String(body.motivo || "").trim();

  if (acao !== "editar") throw new Error("Ação administrativa inválida.");
  if (!UUID_PATTERN.test(lojaId)) throw new Error("Loja inválida.");
  if (nome.length < 3 || nome.length > 100) {
    throw new Error("O nome da loja deve possuir entre 3 e 100 caracteres.");
  }
  if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
    throw new Error("Selecione uma categoria válida.");
  }
  if (descricao && descricao.length > 1000) {
    throw new Error("A descrição deve ter no máximo 1.000 caracteres.");
  }

  for (const [valor, rotulo] of [[telefone, "telefone"], [whatsapp, "WhatsApp"]]) {
    if (valor) {
      const totalDigitos = valor.replace(/[^0-9]/g, "").length;
      if (valor.length > 20 || totalDigitos < 10 || totalDigitos > 13) {
        throw new Error(`Informe um ${rotulo} válido com DDD.`);
      }
    }
  }

  if (endereco && endereco.length > 240) {
    throw new Error("O endereço deve ter no máximo 240 caracteres.");
  }
  if (cidade && (cidade.length < 2 || cidade.length > 100)) {
    throw new Error("A cidade deve possuir entre 2 e 100 caracteres.");
  }
  if (estado && !/^[A-Z]{2}$/.test(estado)) {
    throw new Error("O estado deve ser informado com duas letras.");
  }
  if (Boolean(horarioAbertura) !== Boolean(horarioFechamento)) {
    throw new Error("Informe os horários de abertura e fechamento juntos.");
  }
  if (
    (horarioAbertura && !HORARIO_PATTERN.test(horarioAbertura)) ||
    (horarioFechamento && !HORARIO_PATTERN.test(horarioFechamento))
  ) {
    throw new Error("Informe horários válidos.");
  }
  if (!Number.isFinite(taxaEntrega) || taxaEntrega < 0 || taxaEntrega > 9999.99) {
    throw new Error("A taxa de entrega deve estar entre R$ 0,00 e R$ 9.999,99.");
  }
  if (motivo.length < 5 || motivo.length > 500) {
    throw new Error("O motivo da edição deve possuir entre 5 e 500 caracteres.");
  }

  return {
    lojaId,
    nome,
    categoriaId,
    descricao,
    telefone,
    whatsapp,
    endereco,
    cidade,
    estado,
    horarioAbertura,
    horarioFechamento,
    taxaEntrega: Math.round(taxaEntrega * 100) / 100,
    motivo,
  };
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
    const entrada = normalizarEntrada(await req.json() as RequisicaoEdicaoLoja);
    const token = authorization.slice(7).trim();
    const clienteUsuario = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const clienteService = createClient(supabaseUrl, serviceRoleKey, {
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
      return responder(req, 403, {
        erro: "Acesso restrito ao administrador principal.",
      });
    }

    const { data: resultado, error: execucaoError } =
      await clienteService.rpc("editar_loja_admin_service", {
        p_admin_id: administrador.id,
        p_loja_id: entrada.lojaId,
        p_nome: entrada.nome,
        p_categoria_id: entrada.categoriaId,
        p_descricao: entrada.descricao,
        p_telefone: entrada.telefone,
        p_whatsapp: entrada.whatsapp,
        p_endereco: entrada.endereco,
        p_cidade: entrada.cidade,
        p_estado: entrada.estado,
        p_horario_abertura: entrada.horarioAbertura,
        p_horario_fechamento: entrada.horarioFechamento,
        p_taxa_entrega: entrada.taxaEntrega,
        p_motivo: entrada.motivo,
      });

    if (execucaoError) {
      return responder(req, 400, { erro: execucaoError.message });
    }

    return responder(req, 200, { sucesso: true, resultado });
  } catch (erro) {
    const mensagem = erro instanceof Error
      ? erro.message
      : "Não foi possível editar a loja.";

    return responder(req, 400, { erro: mensagem });
  }
});
