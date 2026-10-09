const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

const migration = ler("supabase/migrations/20261009020000_classificados_painel_lojista.sql");

test("painel mostra anúncios e vendas, não pedidos e faturamento", () => {
    const html = ler("painel-loja.html");
    for (const id of ["resumo-no-ar", "resumo-aguardando", "resumo-indisponiveis", "resumo-interessados", "resumo-vendas", "resumo-nota", "lista-avaliacoes-recebidas"]) {
        assert.match(html, new RegExp(`id="${id}"`));
    }
    assert.doesNotMatch(html, /id="total-vendas"/);
    assert.match(html, /js\/painel-loja-resumo\.js/);
    assert.match(ler("js/painel-loja-resumo.js"), /rpc\("resumo_painel_vendedor"\)/);
    const painel = ler("js/painel-loja.js");
    assert.doesNotMatch(painel, /carregarPedidos\(\),\s+carregarEstatisticas\(\)/);
    const estatisticas = painel.slice(painel.indexOf("async function carregarEstatisticas"), painel.indexOf("PEDIDOS RECENTES"));
    assert.doesNotMatch(estatisticas, /from\("pedidos"\)/);
});

test("vendedor responde; só o dono da avaliação recebida", () => {
    const inicio = migration.indexOf("function public.responder_avaliacao_vendedor");
    const corpo = migration.slice(inicio, migration.indexOf("$$;", inicio));
    assert.match(corpo, /v_avaliacao\.proprietario_id is distinct from v_uid/);
    assert.match(ler("js/avaliacoes-recebidas.js"), /rpc\("responder_avaliacao_vendedor"/);
    assert.match(ler("interessados.html"), /js\/avaliacoes-recebidas\.js/);
});

test("denúncia de avaliação: uma por pessoa, avisa os admins", () => {
    assert.match(migration, /constraint denuncias_avaliacao_vendedor_unica unique \(avaliacao_id, denunciante_id\)/);
    assert.match(migration, /revoke all on table public\.denuncias_avaliacao_vendedor from public, anon, authenticated/);
    assert.match(migration, /'admin-avaliacoes\.html'/);
    for (const pagina of ["produto.html", "loja.html"]) {
        assert.match(ler(pagina), /js\/denunciar-avaliacao\.js/);
    }
    assert.match(ler("js/denunciar-avaliacao.js"), /rpc\("denunciar_avaliacao_vendedor"/);
    assert.match(ler("js/produto.js"), /data-denunciar-avaliacao-vendedor/);
    assert.match(ler("js/avaliacoes-vendedor.js"), /data-denunciar-avaliacao-vendedor/);
});

test("admin oculta, mostra ou mantém, com motivo para ocultar", () => {
    const inicio = migration.indexOf("function public.moderar_avaliacao_vendedor_admin");
    const corpo = migration.slice(inicio, migration.indexOf("$$;", inicio));
    assert.match(corpo, /_usuario_e_admin\(v_uid\)/);
    assert.match(corpo, /p_acao not in \('ocultar', 'mostrar', 'manter'\)/);
    assert.match(corpo, /Informe o motivo para ocultar/);
    assert.match(ler("admin-avaliacoes.html"), /js\/admin-avaliacoes\.js/);
    for (const pagina of ["admin-dashboard.html", "admin-usuarios.html", "admin-categorias.html", "admin-anuncios.html", "admin-moderacao.html", "admin-avaliacoes.html"]) {
        assert.match(ler(pagina), /href="admin-avaliacoes\.html"/, pagina);
    }
});
