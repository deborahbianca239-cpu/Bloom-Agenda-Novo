/* =====================================================================
   Bloom Agenda — Tema visual (paletas + modo daltônico)
   ---------------------------------------------------------------------
   Aplica/alterna o atributo <html data-tema="..."> que os tokens de cor
   em css/style.css usam pra trocar de paleta (azul = padrão, sem atributo).
   A leitura inicial (evitar "flash" da paleta errada) é feita por um
   snippet inline no <head> de cada página — este arquivo cuida do resto:
   alternar, persistir em localStorage e sincronizar com o backend.
   ===================================================================== */
(function (global) {
  const STORAGE_KEY = "bloom_tema";
  const STORAGE_KEY_ANTIGA = "bloom_colorblind"; // versão anterior (só true/false)
  const TEMAS = ["azul", "rosa", "branco", "amarelo", "preto", "daltonico"];
  const PADRAO = "azul";

  function obterTema() {
    try {
      const salvo = global.localStorage.getItem(STORAGE_KEY);
      if (salvo && TEMAS.includes(salvo)) return salvo;
      // Migração do formato antigo (só tinha ligado/desligado o daltônico).
      if (global.localStorage.getItem(STORAGE_KEY_ANTIGA) === "true") return "daltonico";
    } catch {
      /* localStorage indisponível */
    }
    return PADRAO;
  }

  function aplicar(tema) {
    if (tema && tema !== PADRAO) document.documentElement.setAttribute("data-tema", tema);
    else document.documentElement.removeAttribute("data-tema");

    // "preto" é modo escuro de verdade — aciona o dark mode nativo do
    // Bootstrap 5.3 também, pros componentes prontos (modal, form, dropdown)
    // acompanharem sem eu precisar reescrever cada um manualmente.
    if (tema === "preto") document.documentElement.setAttribute("data-bs-theme", "dark");
    else document.documentElement.removeAttribute("data-bs-theme");
  }

  /* Troca o tema, grava local na hora e tenta sincronizar com a conta
     (silencioso — se falhar ou estiver offline, fica só local por enquanto). */
  async function definir(tema) {
    if (!TEMAS.includes(tema)) return;
    try {
      global.localStorage.setItem(STORAGE_KEY, tema);
    } catch {
      /* tema aplicado só na sessão atual */
    }
    aplicar(tema);

    if (global.BloomAPI?.isAuthenticated?.()) {
      try {
        await global.BloomAPI.auth.updatePreferences(tema);
      } catch {
        /* offline/erro — reconciliar() cuida disso no próximo carregamento */
      }
    }
  }

  /* Chamado após buscar o perfil (ex.: configuracoes.html) — se o backend
     divergir do que está local, o backend vence e reaplicamos localmente. */
  function reconciliar(temaServidor) {
    if (!TEMAS.includes(temaServidor) || temaServidor === obterTema()) return;
    try {
      global.localStorage.setItem(STORAGE_KEY, temaServidor);
    } catch {
      /* ignora */
    }
    aplicar(temaServidor);
  }

  global.BloomTema = { TEMAS, obterTema, definir, reconciliar };
})(window);
