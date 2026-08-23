/* =====================================================================
   Bloom Agenda — cliente da API REST (compartilhado por todas as telas)
   ===================================================================== */
(function (global) {
  // Local/Docker: o backend roda na porta 3006 (origem diferente do nginx).
  // Vercel/produção: API no mesmo domínio, sob /api.
  const host = global.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const API_BASE = isLocal ? "http://localhost:3006/api" : "/api";

  const TOKEN_KEY = "bloom_token";
  const USER_KEY = "bloom_user";

  /* ---------- Sessão ---------- */
  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  };
  const setUser = (u) => localStorage.setItem(USER_KEY, JSON.stringify(u));
  const isAuthenticated = () => !!getToken();

  /* ---------- Núcleo de requisição ----------
     `silent`: usado pela sincronização em segundo plano (js/offline-store.js).
     Evita encerrar a sessão sozinho num 401 disparado fora de uma ação
     explícita do usuário — quem chama com silent decide o que fazer. */
  async function request(path, { method = "GET", body, auth = true, silent = false, timeoutMs } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

    const controller = timeoutMs ? new AbortController() : null;
    const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;

    let res;
    try {
      res = await fetch(API_BASE + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller ? controller.signal : undefined,
      });
    } catch {
      throw new ApiClientError(
        "Não foi possível conectar ao servidor. Verifique se o backend está rodando.",
        0
      );
    } finally {
      if (timer) clearTimeout(timer);
    }

    let data = {};
    try {
      data = await res.json();
    } catch {
      /* resposta sem corpo */
    }

    if (!res.ok) {
      // Token expirado/inválido → encerra sessão (exceto chamadas silenciosas).
      if (res.status === 401 && auth && !silent) clearSession();
      throw new ApiClientError(
        data.message || "Erro na requisição",
        res.status,
        data.errors
      );
    }
    return data;
  }

  class ApiClientError extends Error {
    constructor(message, status, errors) {
      super(message);
      this.status = status;
      this.errors = errors;
    }
  }

  /* ---------- Auth ---------- */
  const auth = {
    register: (payload) =>
      request("/auth/register", { method: "POST", body: payload, auth: false }),
    login: (payload) =>
      request("/auth/login", { method: "POST", body: payload, auth: false }),
    forgotPassword: (email) =>
      request("/auth/forgot-password", {
        method: "POST",
        body: { email },
        auth: false,
      }),
    resetPassword: (token, novaSenha) =>
      request("/auth/reset-password", {
        method: "POST",
        body: { token, novaSenha },
        auth: false,
      }),
    changePassword: (senhaAtual, novaSenha) =>
      request("/auth/change-password", {
        method: "PUT",
        body: { senhaAtual, novaSenha },
      }),
    profile: () => request("/auth/profile"),
    updateName: (nome) =>
      request("/auth/profile", { method: "PUT", body: { nome } }),
    updatePreferences: (theme, opts = {}) =>
      request("/auth/preferences", { method: "PUT", body: { theme }, ...opts }),
  };

  /* ---------- Tasks ----------
     Todos os métodos aceitam um `opts` opcional ({silent, timeoutMs}) — usado
     pela sincronização em segundo plano (js/offline-store.js). */
  const tasks = {
    list: (filters = {}, opts = {}) => {
      const qs = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v !== "" && v != null)
      ).toString();
      return request(`/tasks${qs ? "?" + qs : ""}`, opts);
    },
    get: (id, opts = {}) => request(`/tasks/${id}`, opts),
    create: (payload, opts = {}) =>
      request("/tasks", { method: "POST", body: payload, ...opts }),
    update: (id, payload, opts = {}) =>
      request(`/tasks/${id}`, { method: "PUT", body: payload, ...opts }),
    complete: (id, opts = {}) =>
      request(`/tasks/${id}/complete`, { method: "PATCH", ...opts }),
    uncomplete: (id, opts = {}) =>
      request(`/tasks/${id}/uncomplete`, { method: "PATCH", ...opts }),
    remove: (id, opts = {}) => request(`/tasks/${id}`, { method: "DELETE", ...opts }),
  };

  /* ---------- Dashboard ---------- */
  const dashboard = {
    today: () => request("/dashboard/today"),
    tomorrow: () => request("/dashboard/tomorrow"),
    upcoming: () => request("/dashboard/upcoming"),
    statistics: () => request("/dashboard/statistics"),
  };

  /* Sonda de conectividade real (sem auth — nunca arrisca 401 espúrio).
     Usada por js/offline-store.js antes de tentar sincronizar. */
  const health = (timeoutMs = 3000) =>
    request("/health", { auth: false, silent: true, timeoutMs });

  global.BloomAPI = {
    getToken,
    setToken,
    getUser,
    setUser,
    clearSession,
    isAuthenticated,
    auth,
    tasks,
    dashboard,
    health,
    ApiClientError,
  };
})(window);
