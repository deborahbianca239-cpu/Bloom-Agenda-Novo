/* =====================================================================
   Bloom Agenda — Assistente Inteligente (local, offline, sem API de IA)
   ---------------------------------------------------------------------
   Motor simples de sugestão baseado no histórico do próprio usuário:
   frequência, dia da semana e horário. Todos os dados ficam no
   IndexedDB do navegador — nada é enviado para serviços externos.
   ===================================================================== */
(function (global) {
  const DB_NAME = "bloom_ia_db";
  const DB_VERSION = 1;
  const STORE = "historico";

  const DIAS_SEMANA = [
    "domingo", "segunda-feira", "terça-feira", "quarta-feira",
    "quinta-feira", "sexta-feira", "sábado",
  ];
  // Artigo usado antes de cada dia da semana ("no domingo", "na segunda-feira"...).
  const ARTIGO_DIA = ["o", "a", "a", "a", "a", "a", "o"];

  const MIN_OCORRENCIAS_PADRAO = 2; // nº mínimo de repetições p/ considerar recorrente
  const MIN_OCORRENCIAS_PREVISAO = 2; // nº mínimo p/ prever horário/categoria
  const PONTUACAO_MINIMA = 5; // limiar de pontuação p/ exibir sugestão
  const DIAS_RECENCIA = 30; // janela de "aconteceu recentemente"
  const DISPENSADAS_KEY = "bloom_ia_dispensadas";
  const RETENCAO_DISPENSA_DIAS = 60;

  let dbPromise = null;

  function abrirDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        reject(new Error("IndexedDB indisponível neste navegador."));
        return;
      }
      const req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "chave" });
          store.createIndex("usuarioId", "usuarioId", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  /* ---------- Utilidades ---------- */
  function normalizar(texto) {
    return (texto || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  }

  function idUsuario(usuario) {
    return String(usuario?.id ?? usuario?.email ?? "anon");
  }

  function chaveDe(usuarioId, tarefaId) {
    return `${usuarioId}::${tarefaId}`;
  }

  function toDate(dataStr) {
    return new Date(dataStr + "T00:00:00");
  }

  function diasEntre(dataStr, hojeStr) {
    const ms = toDate(hojeStr) - toDate(dataStr);
    return Math.round(ms / 86400000);
  }

  function maisFrequente(lista) {
    if (!lista.length) return null;
    const cont = new Map();
    for (const v of lista) cont.set(v, (cont.get(v) || 0) + 1);
    let melhor = null;
    let max = -1;
    for (const [v, c] of cont) {
      if (c > max) {
        max = c;
        melhor = v;
      }
    }
    return melhor;
  }

  function registroDe(usuarioId, tarefa) {
    const d = toDate(tarefa.date);
    return {
      chave: chaveDe(usuarioId, tarefa.id),
      usuarioId,
      tarefaId: tarefa.id,
      titulo: tarefa.title,
      tituloNormalizado: normalizar(tarefa.title),
      categoria: tarefa.cat || "",
      prioridade: tarefa.prio || "",
      data: tarefa.date,
      horario: tarefa.time || null,
      diaSemana: d.getDay(),
    };
  }

  /* ---------- Acesso ao IndexedDB ---------- */
  async function chavesExistentes(usuarioId) {
    const db = await abrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const idx = tx.objectStore(STORE).index("usuarioId");
      const req = idx.getAllKeys(IDBKeyRange.only(usuarioId));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function registrosDoUsuario(usuarioId) {
    const db = await abrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const idx = tx.objectStore(STORE).index("usuarioId");
      const req = idx.getAll(IDBKeyRange.only(usuarioId));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /* Sincroniza o histórico local com a lista de tarefas atual (vinda da API).
     Mantém o IndexedDB espelhando o backend, para que a predição funcione
     mesmo offline e não misture dados entre usuários diferentes. */
  async function sincronizar(tarefas, usuarioId) {
    if (!usuarioId) return;
    const db = await abrirDB();
    const existentes = await chavesExistentes(usuarioId);
    const chavesNovas = new Set(tarefas.map((t) => chaveDe(usuarioId, t.id)));
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      existentes.forEach((k) => {
        if (!chavesNovas.has(k)) store.delete(k);
      });
      tarefas.forEach((t) => store.put(registroDe(usuarioId, t)));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function agruparPorTitulo(registros) {
    const mapa = new Map();
    for (const r of registros) {
      if (!r.tituloNormalizado) continue;
      let g = mapa.get(r.tituloNormalizado);
      if (!g) {
        g = { tituloNormalizado: r.tituloNormalizado, freq: 0, casings: new Map(), ultimaData: r.data, registros: [] };
        mapa.set(r.tituloNormalizado, g);
      }
      g.freq++;
      g.casings.set(r.titulo, (g.casings.get(r.titulo) || 0) + 1);
      if (r.data > g.ultimaData) g.ultimaData = r.data;
      g.registros.push(r);
    }
    return mapa;
  }

  function tituloMaisComum(g) {
    let melhor = null;
    let max = -1;
    for (const [titulo, freq] of g.casings) {
      if (freq > max) {
        max = freq;
        melhor = titulo;
      }
    }
    return melhor;
  }

  /* ---------- Autocompletar ---------- */
  async function autocompletar(usuarioId, prefixo, limite = 6) {
    const p = normalizar(prefixo);
    if (!p || !usuarioId) return [];
    const registros = await registrosDoUsuario(usuarioId);
    const grupos = [...agruparPorTitulo(registros).values()];
    const ordenar = (arr) =>
      arr.sort((a, b) => b.freq - a.freq || (b.ultimaData || "").localeCompare(a.ultimaData || ""));
    const iniciam = ordenar(grupos.filter((g) => g.tituloNormalizado.startsWith(p)));
    const contem = ordenar(
      grupos.filter((g) => !g.tituloNormalizado.startsWith(p) && g.tituloNormalizado.includes(p))
    );
    return [...iniciam, ...contem].slice(0, limite).map(tituloMaisComum);
  }

  /* ---------- Predição de horário/categoria/prioridade ---------- */
  async function prever(usuarioId, titulo) {
    const p = normalizar(titulo);
    if (!p || !usuarioId) return null;
    const registros = (await registrosDoUsuario(usuarioId)).filter((r) => r.tituloNormalizado === p);
    if (registros.length < MIN_OCORRENCIAS_PREVISAO) return null;
    return {
      horario: maisFrequente(registros.map((r) => r.horario).filter(Boolean)),
      categoria: maisFrequente(registros.map((r) => r.categoria).filter(Boolean)),
      prioridade: maisFrequente(registros.map((r) => r.prioridade).filter(Boolean)),
      diaSemanaComum: maisFrequente(registros.map((r) => r.diaSemana)),
      ocorrencias: registros.length,
    };
  }

  /* ---------- Dispensa de sugestões (evita repetir a mesma sugestão) ---------- */
  function lerDispensadas() {
    try {
      const lista = JSON.parse(global.localStorage.getItem(DISPENSADAS_KEY) || "[]");
      return Array.isArray(lista) ? lista : [];
    } catch {
      return [];
    }
  }

  function gravarDispensadas(lista) {
    try {
      global.localStorage.setItem(DISPENSADAS_KEY, JSON.stringify(lista));
    } catch {
      /* localStorage indisponível — ignora silenciosamente */
    }
  }

  function chaveDispensa(usuarioId, tituloNormalizado, dataAlvo) {
    return `${usuarioId}::${tituloNormalizado}::${dataAlvo}`;
  }

  function dispensarSugestao(usuarioId, tituloNormalizado, dataAlvo) {
    const lista = lerDispensadas();
    const chave = chaveDispensa(usuarioId, tituloNormalizado, dataAlvo);
    if (!lista.includes(chave)) lista.push(chave);
    gravarDispensadas(lista);
  }

  function limparDispensadasAntigas(hojeStr) {
    const lista = lerDispensadas().filter((chave) => {
      const dataAlvo = chave.split("::")[2];
      if (!dataAlvo) return false;
      return diasEntre(dataAlvo, hojeStr) <= RETENCAO_DISPENSA_DIAS;
    });
    gravarDispensadas(lista);
    return lista;
  }

  /* ---------- Geração de sugestões (pontuação) ---------- */
  // Regras de pontuação:
  //   +3 mesma atividade já aconteceu várias vezes (>= 3 ocorrências no total)
  //   +2 o dia da semana do padrão é o dia mais comum dessa atividade
  //   +2 o horário do padrão é o horário mais comum dessa atividade
  //   +1 a atividade aconteceu recentemente (últimos 30 dias)
  async function gerarSugestoes(usuarioId, tarefasAtuais, opts = {}) {
    if (!usuarioId) return [];
    const hoje = opts.hojeStr || toKeyLocal(new Date());
    const registros = await registrosDoUsuario(usuarioId);
    if (!registros.length) return [];

    const porTitulo = agruparPorTitulo(registros);
    const dispensadas = new Set(limparDispensadasAntigas(hoje));

    // Agrupa por combinação (título + dia da semana + horário).
    const combos = new Map();
    for (const r of registros) {
      if (!r.horario) continue;
      const chave = `${r.tituloNormalizado}|${r.diaSemana}|${r.horario}`;
      let c = combos.get(chave);
      if (!c) {
        c = { tituloNormalizado: r.tituloNormalizado, diaSemana: r.diaSemana, horario: r.horario, count: 0, registros: [] };
        combos.set(chave, c);
      }
      c.count++;
      c.registros.push(r);
    }

    // Candidatos: hoje e amanhã, para cada um checamos se o padrão bate com o dia.
    const alvos = [0, 1].map((n) => {
      const d = new Date(hoje + "T00:00:00");
      d.setDate(d.getDate() + n);
      return { dataAlvo: toKeyLocal(d), diaSemana: d.getDay() };
    });

    const candidatos = [];
    for (const c of combos.values()) {
      if (c.count < MIN_OCORRENCIAS_PADRAO) continue;
      const alvo = alvos.find((a) => a.diaSemana === c.diaSemana);
      if (!alvo) continue;

      const grupoTitulo = porTitulo.get(c.tituloNormalizado);
      const diaComum = maisFrequente(grupoTitulo.registros.map((r) => r.diaSemana));
      const horarioComum = maisFrequente(grupoTitulo.registros.filter((r) => r.horario).map((r) => r.horario));
      const recente = grupoTitulo.registros.some((r) => diasEntre(r.data, hoje) <= DIAS_RECENCIA && diasEntre(r.data, hoje) >= 0);

      let score = 0;
      if (grupoTitulo.freq >= 3) score += 3;
      if (diaComum === c.diaSemana) score += 2;
      if (horarioComum === c.horario) score += 2;
      if (recente) score += 1;

      if (score < PONTUACAO_MINIMA) continue;

      // Já existe tarefa parecida agendada para esse dia? Não sugere de novo.
      const jaExiste = tarefasAtuais.some(
        (t) => t.date === alvo.dataAlvo && normalizar(t.title) === c.tituloNormalizado
      );
      if (jaExiste) continue;

      if (dispensadas.has(chaveDispensa(usuarioId, c.tituloNormalizado, alvo.dataAlvo))) continue;

      const titulo = tituloMaisComum(grupoTitulo);
      const categoria = maisFrequente(grupoTitulo.registros.filter((r) => r.categoria).map((r) => r.categoria));
      const prioridade = maisFrequente(grupoTitulo.registros.filter((r) => r.prioridade).map((r) => r.prioridade));
      const quando = alvo.dataAlvo === hoje ? "hoje" : "amanhã";

      candidatos.push({
        titulo,
        tituloNormalizado: c.tituloNormalizado,
        categoria: categoria || "Pessoal",
        prioridade: prioridade || "media",
        diaSemana: c.diaSemana,
        horario: c.horario,
        dataAlvo: alvo.dataAlvo,
        score,
        motivo: `Você costuma fazer "${titulo}" às ${c.horario} n${ARTIGO_DIA[c.diaSemana]} ${DIAS_SEMANA[c.diaSemana]}. Deseja adicionar para ${quando}?`,
      });
    }

    candidatos.sort((a, b) => b.score - a.score);
    // Evita repetir o mesmo título em mais de uma sugestão (fica só a de maior pontuação).
    const vistos = new Set();
    const unicos = [];
    for (const cand of candidatos) {
      if (vistos.has(cand.tituloNormalizado)) continue;
      vistos.add(cand.tituloNormalizado);
      unicos.push(cand);
    }
    return unicos.slice(0, opts.limite || 3);
  }

  function toKeyLocal(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dia}`;
  }

  global.BloomIA = {
    idUsuario,
    sincronizar,
    autocompletar,
    prever,
    gerarSugestoes,
    dispensarSugestao,
    normalizar,
  };
})(window);
