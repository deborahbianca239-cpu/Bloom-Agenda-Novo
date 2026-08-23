/* =====================================================================
   Bloom Agenda — armazenamento offline + fila de sincronização
   ---------------------------------------------------------------------
   Espelha as tarefas no IndexedDB (banco separado do da IA) e mantém uma
   fila de operações pendentes (criar/editar/concluir/excluir) enquanto o
   backend não confirma. Nada aqui depende só de navigator.onLine: uma
   operação só é considerada sincronizada depois que o servidor confirma.
   ===================================================================== */
(function (global) {
  const DB_NAME = "bloom_sync_db";
  const DB_VERSION = 1;
  const STORE_TASKS = "tasks";
  const STORE_QUEUE = "syncQueue";

  const PROBE_TIMEOUT_MS = 3000;
  const FLUSH_INTERVAL_MS = 20000;
  const MAX_TENTATIVAS = 5;

  let dbPromise = null;
  let userId = null;
  let intervalId = null;
  let status = { state: "green", pending: 0 };

  /* ---------- IndexedDB ---------- */
  function abrirDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_TASKS)) {
          const store = db.createObjectStore(STORE_TASKS, { keyPath: "id" });
          store.createIndex("userId", "userId", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          const store = db.createObjectStore(STORE_QUEUE, { keyPath: "taskId" });
          store.createIndex("status", "status", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function getAll(storeName, indexName, valor) {
    return abrirDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const t = db.transaction(storeName, "readonly");
          const src = indexName ? t.objectStore(storeName).index(indexName) : t.objectStore(storeName);
          const req = valor !== undefined ? src.getAll(IDBKeyRange.only(valor)) : src.getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        })
    );
  }

  function get(storeName, chave) {
    return abrirDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const t = db.transaction(storeName, "readonly");
          const req = t.objectStore(storeName).get(chave);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        })
    );
  }

  function put(storeName, valor) {
    return abrirDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const t = db.transaction(storeName, "readwrite");
          t.objectStore(storeName).put(valor);
          t.oncomplete = () => resolve();
          t.onerror = () => reject(t.error);
        })
    );
  }

  function del(storeName, chave) {
    return abrirDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const t = db.transaction(storeName, "readwrite");
          t.objectStore(storeName).delete(chave);
          t.oncomplete = () => resolve();
          t.onerror = () => reject(t.error);
        })
    );
  }

  /* ---------- Utilidades ---------- */
  function novoIdLocal() {
    if (global.crypto?.randomUUID) return "local-" + global.crypto.randomUUID();
    return "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  }

  function agora() {
    return new Date().toISOString();
  }

  function emitirStatus() {
    try {
      global.dispatchEvent(new CustomEvent("bloom-sync-status", { detail: { ...status } }));
    } catch {
      /* CustomEvent indisponível — segue sem notificar */
    }
  }

  async function recalcularStatus(estadoForcado) {
    const pendentes = await getAll(STORE_QUEUE, "status", "pending");
    const comErro = await getAll(STORE_QUEUE, "status", "error");
    const total = pendentes.length + comErro.length;
    status = { state: estadoForcado || (total > 0 ? "red" : "green"), pending: total };
    emitirStatus();
  }

  /* ---------- Escrita local + fila (coalescência por tarefa) ---------- */
  async function upsertLocal(tarefa) {
    await put(STORE_TASKS, { ...tarefa, userId });
  }

  async function enfileirar(taskId, patch) {
    const atual = (await get(STORE_QUEUE, taskId)) || {
      taskId,
      op: "update",
      payload: {},
      completedChanged: false,
      desiredCompleted: false,
      status: "pending",
      attempts: 0,
      lastError: null,
      createdAt: agora(),
    };
    const novo = { ...atual, ...patch, status: "pending", updatedAt: agora() };
    await put(STORE_QUEUE, novo);
    return novo;
  }

  /* ---------- API pública: leitura ---------- */
  async function listTasks() {
    return getAll(STORE_TASKS, "userId", userId);
  }

  async function refresh() {
    let doServidor = null;
    try {
      const data = await global.BloomAPI.tasks.list();
      doServidor = (data.tasks || []).map((t) => ({
        id: String(t.id),
        title: t.title,
        description: t.description || "",
        task_date: t.task_date,
        task_time: t.task_time || "",
        priority: t.priority,
        category: t.category || "",
        completed: !!t.completed,
      }));
    } catch {
      /* offline ou erro — usa só o que já está local */
    }

    if (doServidor) {
      const fila = await getAll(STORE_QUEUE, "status", "pending");
      const filaErro = await getAll(STORE_QUEUE, "status", "error");
      const protegidos = new Set([...fila, ...filaErro].map((r) => r.taskId));
      // Some sync já concluída pode não aparecer em "pending"/"error" (status "syncing"
      // nunca deveria sobreviver entre chamadas, mas por segurança também protege).
      const emSincronizacao = await getAll(STORE_QUEUE, "status", "syncing");
      emSincronizacao.forEach((r) => protegidos.add(r.taskId));

      const locaisAtuais = await listTasks();
      const idsServidor = new Set(doServidor.map((t) => t.id));

      for (const t of doServidor) {
        if (protegidos.has(t.id)) continue; // não deixa o servidor pisar em algo pendente local
        await upsertLocal(t);
      }
      for (const t of locaisAtuais) {
        if (protegidos.has(t.id)) continue;
        if (!idsServidor.has(t.id) && !String(t.id).startsWith("local-")) {
          await del(STORE_TASKS, t.id); // apagada em outro lugar
        }
      }
    }

    flush(); // tentativa oportunista, não bloqueia o retorno da lista
    return listTasks();
  }

  /* ---------- API pública: escrita (nunca lança erro pro chamador) ---------- */
  async function createTask(payload) {
    const id = novoIdLocal();
    const tarefa = { id, completed: false, ...payload };
    await upsertLocal(tarefa);
    await enfileirar(id, { op: "create", payload, desiredCompleted: false });
    flush();
    return tarefa;
  }

  async function updateTask(id, payload) {
    const existente = await get(STORE_TASKS, id);
    const tarefa = { ...existente, ...payload, id };
    await upsertLocal(tarefa);

    const filaAtual = await get(STORE_QUEUE, id);
    if (filaAtual && filaAtual.op === "create") {
      await enfileirar(id, { payload: { ...filaAtual.payload, ...payload } });
    } else {
      await enfileirar(id, { op: "update", payload });
    }
    flush();
    return tarefa;
  }

  async function setCompleted(id, completed) {
    const existente = await get(STORE_TASKS, id);
    const tarefa = { ...existente, id, completed };
    await upsertLocal(tarefa);

    const filaAtual = await get(STORE_QUEUE, id);
    if (filaAtual && filaAtual.op === "create") {
      await enfileirar(id, { desiredCompleted: completed });
    } else {
      await enfileirar(id, { completedChanged: true, desiredCompleted: completed });
    }
    flush();
    return tarefa;
  }

  async function deleteTask(id) {
    const filaAtual = await get(STORE_QUEUE, id);
    if (filaAtual && filaAtual.op === "create" && String(id).startsWith("local-")) {
      // Criada e excluída offline antes de sincronizar: cancela tudo, sem rede.
      await del(STORE_QUEUE, id);
      await del(STORE_TASKS, id);
      await recalcularStatus();
      return;
    }
    await del(STORE_TASKS, id);
    await enfileirar(id, { op: "delete", payload: {} });
    flush();
  }

  /* ---------- Envio de um registro da fila ---------- */
  function classificarErro(err) {
    if (!err || err.status === 0) return "rede";
    if (err.status === 404) return "404";
    if (err.status === 401) return "401";
    if (err.status === 400 || err.status === 422) return "validacao";
    return "servidor";
  }

  async function enviarUmRegistro(registro) {
    const opts = { silent: true, timeoutMs: 8000 };
    try {
      if (registro.op === "create") {
        const resp = await global.BloomAPI.tasks.create(registro.payload, opts);
        const novoId = String(resp.task.id);
        await del(STORE_TASKS, registro.taskId);
        await upsertLocal({
          id: novoId,
          title: resp.task.title,
          description: resp.task.description || "",
          task_date: resp.task.task_date,
          task_time: resp.task.task_time || "",
          priority: resp.task.priority,
          category: resp.task.category || "",
          completed: !!resp.task.completed,
        });
        await del(STORE_QUEUE, registro.taskId);

        if (registro.desiredCompleted) {
          try {
            await (registro.desiredCompleted
              ? global.BloomAPI.tasks.complete(novoId, opts)
              : global.BloomAPI.tasks.uncomplete(novoId, opts));
            const t = await get(STORE_TASKS, novoId);
            if (t) await upsertLocal({ ...t, completed: registro.desiredCompleted });
          } catch {
            await enfileirar(novoId, {
              op: "update",
              payload: {},
              completedChanged: true,
              desiredCompleted: registro.desiredCompleted,
            });
          }
        }
        return { ok: true };
      }

      if (registro.op === "update") {
        // Payload vazio = só um toggle de concluída (setCompleted sem edição de
        // campos) — o PUT exige título/data, então só chamamos se houver algo a
        // substituir de fato.
        const temPayload = registro.payload && Object.keys(registro.payload).length > 0;
        if (temPayload) {
          await global.BloomAPI.tasks.update(registro.taskId, registro.payload, opts);
        }
        if (registro.completedChanged) {
          await (registro.desiredCompleted
            ? global.BloomAPI.tasks.complete(registro.taskId, opts)
            : global.BloomAPI.tasks.uncomplete(registro.taskId, opts));
        }
        await del(STORE_QUEUE, registro.taskId);
        return { ok: true };
      }

      if (registro.op === "delete") {
        await global.BloomAPI.tasks.remove(registro.taskId, opts);
        await del(STORE_QUEUE, registro.taskId);
        return { ok: true };
      }

      return { ok: true }; // op desconhecida — descarta
    } catch (err) {
      return { ok: false, classe: classificarErro(err) };
    }
  }

  /* ---------- Sonda de conectividade + laço de flush ---------- */
  async function estaRealmenteOnline() {
    try {
      await global.BloomAPI.health(PROBE_TIMEOUT_MS);
      return true;
    } catch {
      return false;
    }
  }

  // Se um flush() chega enquanto outro já está rodando, não pode simplesmente
  // ser descartado — a tarefa que acabou de ser enfileirada ficaria esperando
  // até o próximo gatilho (intervalo de 20s). Em vez de um mero booleano,
  // guardamos a Promise em andamento: quem chamar flush() nesse meio-tempo
  // recebe a MESMA promise (marcando que uma rodada extra é necessária) —
  // assim, `await flush()` sempre espera de verdade a fila ser processada,
  // não importa se foi essa chamada ou outra que disparou o processamento.
  let flushPromiseAtual = null;
  let flushNovamenteSolicitado = false;

  function flush() {
    if (flushPromiseAtual) {
      flushNovamenteSolicitado = true;
      return flushPromiseAtual;
    }
    flushPromiseAtual = executarFlush().finally(() => {
      flushPromiseAtual = null;
    });
    return flushPromiseAtual;
  }

  async function executarFlush() {
    do {
      flushNovamenteSolicitado = false;
      const podeUsarLock = typeof global.navigator?.locks?.request === "function";
      if (podeUsarLock) {
        await global.navigator.locks.request("bloom-sync-flush", { ifAvailable: true }, async (lock) => {
          if (lock) await flushInterno();
        });
      } else {
        await flushInterno();
      }
    } while (flushNovamenteSolicitado);
  }

  async function flushInterno() {
    const online = await estaRealmenteOnline();
    if (!online) {
      await recalcularStatus("red");
      return;
    }
    status.state = "yellow";
    emitirStatus();

    const pendentes = await getAll(STORE_QUEUE, "status", "pending");
    const comErroRetentavel = (await getAll(STORE_QUEUE, "status", "error")).filter(
      (r) => (r.attempts || 0) < MAX_TENTATIVAS && r.lastError?.classe !== "validacao" && r.lastError?.classe !== "404"
    );
    const fila = [...pendentes, ...comErroRetentavel].sort((a, b) =>
      (a.createdAt || "").localeCompare(b.createdAt || "")
    );

    for (const registro of fila) {
      await put(STORE_QUEUE, { ...registro, status: "syncing" });
      const resultado = await enviarUmRegistro(registro);

      if (resultado.ok) continue;

      if (resultado.classe === "rede" || resultado.classe === "401") {
        // Não adianta tentar o resto do lote agora.
        await put(STORE_QUEUE, { ...registro, status: "pending", lastError: { classe: resultado.classe } });
        await recalcularStatus("red");
        return;
      }

      if (resultado.classe === "404") {
        // Alvo sumiu no servidor — remove local e some da fila silenciosamente.
        await del(STORE_TASKS, registro.taskId);
        await del(STORE_QUEUE, registro.taskId);
        continue;
      }

      // Validação (400/422) ou erro de servidor (5xx/429): marca erro, segue o lote.
      const tentativas = (registro.attempts || 0) + 1;
      await put(STORE_QUEUE, {
        ...registro,
        status: "error",
        attempts: tentativas,
        lastError: { classe: resultado.classe },
      });
    }

    await recalcularStatus();
  }

  /* ---------- Ciclo de vida ---------- */
  async function init(uid) {
    userId = String(uid ?? "anon");
    await recalcularStatus();
    flush();

    global.addEventListener("online", () => flush());
    global.document.addEventListener("visibilitychange", () => {
      if (global.document.visibilityState === "visible") flush();
    });
    if (!intervalId) {
      intervalId = global.setInterval(() => {
        if (status.pending > 0) flush();
      }, FLUSH_INTERVAL_MS);
    }
  }

  function getSyncStatus() {
    return { ...status };
  }

  function onStatusChange(callback) {
    global.addEventListener("bloom-sync-status", (e) => callback(e.detail));
  }

  global.BloomOffline = {
    init,
    refresh,
    listTasks,
    createTask,
    updateTask,
    setCompleted,
    deleteTask,
    flush,
    getSyncStatus,
    onStatusChange,
  };
})(window);
