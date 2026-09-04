const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");

function ler(arquivo) {
    return fs.readFileSync(path.join(raiz, arquivo), "utf8");
}

test("a página de notificações possui filtros, histórico e estados acessíveis", () => {
    const html = ler("notificacoes.html");

    assert.match(html, /<html lang="pt-BR">/);
    assert.match(html, /name="description"/);
    assert.match(html, /id="total-nao-lidas"/);
    assert.match(html, /id="btn-marcar-todas-lidas"/);
    assert.match(html, /data-leitura="nao_lidas"/);
    assert.match(html, /id="filtro-tipo-notificacao"/);
    assert.match(html, /id="lista-notificacoes"[\s\S]*aria-live="polite"/);
    assert.match(html, /id="paginacao-notificacoes"/);
    assert.match(html, /components\/header\.js/);
    assert.match(html, /js\/notificacoes\.js/);
});

test("o cabeçalho global possui sino, contador e estado de página", () => {
    const header = ler("components/header.js");
    const componente = ler("components/notificacoes.js");

    assert.match(header, /id="btnNotificacoes"/);
    assert.match(header, /id="contadorNotificacoes"/);
    assert.match(header, /"notificacoes\.html": '#btnNotificacoes'/);
    assert.match(componente, /\.from\("notificacoes"\)/);
    assert.match(componente, /event: "\*"/);
    assert.match(componente, /filter: `usuario_id=eq\.\$\{id\}`/);
    assert.match(componente, /removeChannel\(canal\)/);
});

test("a listagem usa paginação no servidor e marca somente o campo de leitura", () => {
    const codigo = ler("js/notificacoes.js");

    assert.match(codigo, /const TAMANHO_PAGINA = 15/);
    assert.match(codigo, /\.range\(inicio, fim\)/);
    assert.match(codigo, /\.update\(\{ lida_em: new Date\(\)\.toISOString\(\) \}\)/);
    assert.match(codigo, /\.is\("lida_em", null\)/);
    assert.match(codigo, /linkSeguro\(item\.link\)/);
    assert.match(codigo, /comercio:notificacao-alterada/);
});

test("a migration protege dados e cobre os eventos do marketplace", () => {
    const migration = ler("supabase/migrations/20260904005558_central_notificacoes.sql");

    assert.match(migration, /alter table public\.notificacoes enable row level security/);
    assert.match(migration, /grant select on table public\.notificacoes to authenticated/);
    assert.match(migration, /grant update \(lida_em\)/);
    assert.match(migration, /using \(\(select auth\.uid\(\)\) = usuario_id\)/);
    assert.match(migration, /with check \(\(select auth\.uid\(\)\) = usuario_id\)/);
    assert.match(migration, /security definer[\s\S]*set search_path = ''/);
    assert.match(migration, /on conflict \(chave_unica\)/);
    assert.match(migration, /after insert or update of status on public\.pedidos/);
    assert.match(migration, /on public\.solicitacoes_cancelamento/);
    assert.match(migration, /after insert on public\.avaliacoes/);
    assert.match(migration, /update of estoque, estoque_minimo, ativo on public\.produtos/);
    assert.match(migration, /update of status_aprovacao on public\.lojas/);
    assert.match(migration, /alter publication supabase_realtime add table public\.notificacoes/);
});

test("a central integra o login e o agrupamento visual do projeto", () => {
    const login = ler("js/login.js");
    const design = ler("js/design-system.js");
    const supabase = ler("js/supabase.js");

    assert.match(login, /destino_apos_login_notificacoes/);
    assert.match(login, /"notificacoes\.html"/);
    assert.match(design, /cliente:[\s\S]*"notificacoes\.html"/);
    assert.match(supabase, /components\/notificacoes\.js/);
    assert.match(supabase, /components\/notificacoes\.css/);
});

test("todas as referências locais da central apontam para arquivos existentes", () => {
    const html = ler("notificacoes.html");
    const referencias = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
        .map(resultado => resultado[1])
        .filter(valor => !/^(?:https?:|#)/.test(valor))
        .map(valor => valor.split(/[?#]/)[0]);

    referencias.forEach(referencia => {
        assert.ok(
            fs.existsSync(path.join(raiz, referencia)),
            `Referência inexistente: ${referencia}`
        );
    });
});
