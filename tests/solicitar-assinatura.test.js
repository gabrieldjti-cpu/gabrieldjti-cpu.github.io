const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

const migration = ler("supabase/migrations/20261008190000_classificados_solicitar_assinatura.sql");

function corpo(nome) {
    const inicio = migration.indexOf(`function ${nome}`);
    assert.ok(inicio > -1, `${nome} deveria existir`);
    return migration.slice(inicio, migration.indexOf("$$;", inicio) > -1 ? migration.indexOf("$$;", inicio) : migration.indexOf("$function$;", inicio));
}

test("pedido de assinatura: um em aberto por loja, só leitura pelo site", () => {
    assert.match(migration, /create unique index solicitacoes_assinatura_pendente_unica[\s\S]*?where atendida_em is null/);
    assert.match(migration, /revoke all on table public\.solicitacoes_assinatura from anon, authenticated/);
    assert.doesNotMatch(migration, /grant (insert|update|delete|all)[^;]*solicitacoes_assinatura/i);
    assert.doesNotMatch(migration, /drop table|drop function|truncate|delete from/i);
});

test("só loja pede assinatura e o admin é avisado", () => {
    const pedir = corpo("public.solicitar_assinatura");
    assert.match(pedir, /l\.tipo = 'loja'/);
    assert.match(pedir, /status_aprovacao not in \('pendente', 'aprovada'\)/);
    assert.match(pedir, /private\.salvar_notificacao/);
    assert.match(migration, /revoke all on function public\.solicitar_assinatura\(\) from public, anon/);
});

test("ativar atende o pedido e tira o vencimento dos anúncios", () => {
    const ativar = corpo("public.ativar_assinatura_loja_admin");
    assert.match(ativar, /_usuario_e_admin/);
    assert.match(ativar, /update public\.solicitacoes_assinatura/);
    assert.match(ativar, /set vence_em = null/);
});

test("a conversão em loja só passa pela função e deixa a loja em análise", () => {
    const protecao = corpo("public.proteger_aprovacao_loja");
    assert.match(protecao, /app\.converter_perfil/);
    assert.match(protecao, /old\.tipo = 'pessoal' and new\.tipo = 'loja'/);
    assert.match(protecao, /new\.status_aprovacao := 'pendente'/);
    assert.match(protecao, /O tipo do cadastro não pode ser alterado/);

    const converter = corpo("public.converter_perfil_em_loja");
    assert.match(converter, /v_loja\.tipo <> 'pessoal'/);
    assert.match(converter, /set_config\('app\.converter_perfil', '1', true\)/);
    assert.match(converter, /set_config\('app\.converter_perfil', '', true\)/);
    assert.match(migration, /revoke all on function public\.converter_perfil_em_loja\(integer\) from public, anon/);
});

test("telas: botão no painel, pedido e filtro no admin, quero ser lojista", () => {
    assert.match(ler("painel-loja.html"), /id="btnSolicitarAssinatura"/);
    const painel = ler("js/painel-loja-assinatura.js");
    assert.match(painel, /rpc\("solicitar_assinatura"\)/);
    assert.match(painel, /Solicitar renovação/);

    const admin = ler("js/admin-assinaturas.js");
    assert.match(admin, /solicitacoes_assinatura/);
    assert.match(admin, /filtroPedidosAssinatura/);
    assert.match(admin, /Assinatura solicitada/);

    assert.match(ler("meus-anuncios.html"), /Quero ser lojista/);
    assert.match(ler("js/meus-anuncios.js"), /rpc\("converter_perfil_em_loja"/);
});
