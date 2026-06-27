/* PWA — registro do Service Worker e botão "Instalar". */
(function () {
  // 1) Registrar o service worker (relativo à página: /html/sw.js).
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((err) => {
        console.warn("[PWA] Falha ao registrar service worker:", err);
      });
    });
  }

  const installButtons = () =>
    document.querySelectorAll("[data-pwa-install]");
  const showButtons = () =>
    installButtons().forEach((b) => b.classList.remove("d-none"));
  const hideButtons = () =>
    installButtons().forEach((b) => b.classList.add("d-none"));

  // 2) Captura o evento de instalação (Android/desktop Chrome/Edge/Brave).
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showButtons();
  });

  // iOS/Safari não dispara beforeinstallprompt — mostramos o botão com dica.
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (isIOS && !isStandalone) {
    window.addEventListener("load", showButtons);
  }

  // Já instalado? Esconde o botão.
  window.addEventListener("appinstalled", hideButtons);
  if (isStandalone) hideButtons();

  // 3) Ação do botão.
  window.installPWA = async function () {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === "accepted") hideButtons();
      return;
    }
    if (isIOS) {
      alert(
        "Para instalar no iPhone/iPad:\n\n1. Toque no botão Compartilhar (⬆️).\n2. Escolha \"Adicionar à Tela de Início\"."
      );
      return;
    }
    alert(
      "Para instalar, abra o menu do navegador (⋮) e escolha \"Instalar app\" ou \"Adicionar à tela inicial\"."
    );
  };
})();
