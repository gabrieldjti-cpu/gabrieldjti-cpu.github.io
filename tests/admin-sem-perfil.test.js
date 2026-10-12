const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

test("no cabeçalho, o admin vê Painel ADM em vez de Perfil, Minha Loja e Anunciar", () => {
    const header = ler("components/header.js");
    assert.match(header, /async function ehAdministrador\(\)/);
    assert.match(header, /rpc\("sou_admin"\)/);
    assert.match(header, /btnPerfil\.href = "admin-dashboard\.html"/);
    assert.match(header, /texto\.textContent = "Painel ADM"/);
    assert.match(header, /\["btnMinhaLoja", "btnAnunciar"\]/);
    for (const pagina of ["perfil.html", "painel-loja.html", "meus-anuncios.html", "anunciar.html", "cadastrar-loja.html"]) {
        assert.match(header, new RegExp(`"${pagina.replace(".", "\\.")}"`));
    }
});

test("o banco não deixa a conta de admin criar loja ou perfil de anunciante", () => {
    const sql = ler("supabase/migrations/20261012100000_admin_sem_loja.sql");
    assert.match(sql, /before insert on public\.lojas/);
    assert.match(sql, /public\._usuario_e_admin\(v_uid\)/);
});
