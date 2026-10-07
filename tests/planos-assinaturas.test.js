const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

const migration = ler("supabase/migrations/20261007230000_classificados_planos_assinaturas.sql");

test("a migration cria planos e assinaturas com RLS e sem escrita direta", () => {
    assert.match(migration, /create table public\.planos/);
    assert.match(migration, /create table public\.assinaturas/);
    assert.match(migration, /alter table public\.planos enable row level security/);
    assert.match(migration, /alter table public\.assinaturas enable row level security/);
    assert.match(migration, /revoke all on table public\.assinaturas from anon, authenticated/);
    assert.doesNotMatch(migration, /grant (insert|update|delete|all)[^;]*on table public\.assinaturas/i);
    assert.doesNotMatch(migration, /drop table|alter table public\.(lojas|produtos|profiles)/i);
});

test("o plano gratuito segue as regras combinadas", () => {
    assert.match(migration, /'gratuito',\s*'Gratuito',[\s\S]*?0,\s*5, 30, 60,\s*false/);
    assert.match(migration, /interval '15 days'/);
});

test("ativar e encerrar exigem administrador e ficam fora do alcance de visitantes", () => {
    for (const funcao of [
        "ativar_assinatura_loja_admin",
        "encerrar_assinatura_loja_admin",
        "listar_assinaturas_admin"
    ]) {
        const inicio = migration.indexOf(`function public.${funcao}`);
        assert.ok(inicio > -1, `${funcao} deveria existir`);
        const corpo = migration.slice(inicio, migration.indexOf("$$;", inicio));
        assert.match(corpo, /_usuario_e_admin/, `${funcao} deveria checar o admin`);
        assert.match(
            migration,
            new RegExp(`revoke all on function public\\.${funcao}\\([^)]*\\)\\s+from public, anon`)
        );
    }
    assert.match(migration, /revoke all on function private\.situacao_assinatura\(uuid\)\s+from public, anon, authenticated/);
});

test("a página de planos apresenta os dois planos e lê a tabela planos", () => {
    const html = ler("planos.html");
    const codigo = ler("js/planos.js");

    assert.match(html, /data-plano="gratuito"/);
    assert.match(html, /data-plano="lojista"/);
    assert.match(html, /5 anúncios/);
    assert.match(html, /60 dias/);
    assert.match(html, /15 dias/);
    assert.match(html, /js\/planos\.js/);
    assert.match(codigo, /\.from\("planos"\)/);
});

test("o admin ativa e encerra assinaturas somente por RPC", () => {
    const html = ler("admin-dashboard.html");
    const codigo = ler("js/admin-assinaturas.js");

    assert.match(html, /js\/admin-assinaturas\.js/);
    assert.match(codigo, /rpc\("listar_assinaturas_admin"\)/);
    assert.match(codigo, /rpc\("ativar_assinatura_loja_admin"/);
    assert.match(codigo, /rpc\("encerrar_assinatura_loja_admin"/);
    assert.doesNotMatch(codigo, /\.from\("assinaturas"\)/);
});

test("o painel do lojista mostra a situação da assinatura", () => {
    const html = ler("painel-loja.html");
    const codigo = ler("js/painel-loja-assinatura.js");

    assert.match(html, /id="selo-assinatura-loja"/);
    assert.match(html, /id="texto-assinatura-loja"/);
    assert.match(html, /js\/painel-loja-assinatura\.js/);
    assert.match(codigo, /rpc\("minha_assinatura"\)/);
    for (const situacao of ["ativa", "carencia", "expirada", "sem_assinatura"]) {
        assert.match(codigo, new RegExp(`${situacao}:`));
    }
});
