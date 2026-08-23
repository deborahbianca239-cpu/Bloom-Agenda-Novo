/* =====================================================================
   Bloom Agenda — Ditar tarefa por voz + interpretar comando de texto
   ---------------------------------------------------------------------
   parseFalaTarefa() é usado tanto pelo microfone (Web Speech API) quanto
   pelo comando de texto "criar tarefa X" no chat da IA — por isso fica
   disponível sempre, mesmo em navegadores sem suporte a voz. Só a captura
   de áudio (ouvir()) depende do SpeechRecognition; se não houver suporte,
   o botão de microfone é escondido, mas o resto do app nunca é afetado.
   Faz uma interpretação heurística leve de data/horário em pt-BR; quando
   não há confiança suficiente, devolve só o título (texto bruto) e deixa
   os campos de data/horário como estavam, para o usuário editar.
   ===================================================================== */
(function (global) {
  const DIAS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  const NUM_EXTENSO = {
    zero: 0, uma: 1, um: 1, duas: 2, dois: 2, tres: 3, quatro: 4, cinco: 5,
    seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
  };

  function normalizar(s) {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  }

  const VOGAL_FLEX = { a: "[aàáâã]", e: "[eèéê]", i: "[iìíî]", o: "[oòóôõ]", u: "[uùúû]", c: "[cç]" };
  // Constrói um regex a partir de um trecho já normalizado (sem acento) que
  // ainda combina com a versão acentuada do texto original.
  function paraRegexFlexivel(trechoNormalizado) {
    return trechoNormalizado
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/[aeiouc]/g, (ch) => VOGAL_FLEX[ch]);
  }

  function toKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dia}`;
  }

  function addDias(base, n) {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return d;
  }

  /* ---------- Data ---------- */
  function extrairData(textoNorm, hoje) {
    if (/\bhoje\b/.test(textoNorm)) return { data: toKey(hoje), trecho: "hoje" };
    if (/\bdepois de amanha\b/.test(textoNorm)) return { data: toKey(addDias(hoje, 2)), trecho: "depois de amanha" };
    if (/\bamanha\b/.test(textoNorm)) return { data: toKey(addDias(hoje, 1)), trecho: "amanha" };

    const diasMatch = textoNorm.match(/daqui a (\d+) dias?/);
    if (diasMatch) {
      const n = parseInt(diasMatch[1], 10);
      return { data: toKey(addDias(hoje, n)), trecho: diasMatch[0] };
    }

    for (let i = 0; i < DIAS.length; i++) {
      const nomeDia = DIAS[i];
      const re = new RegExp(`\\b(proxim[ao] )?${nomeDia}(-feira)?\\b`);
      const m = textoNorm.match(re);
      if (m) {
        const atual = hoje.getDay();
        let delta = (i - atual + 7) % 7;
        if (delta === 0) delta = 7; // menção ao dia da semana = próxima ocorrência
        return { data: toKey(addDias(hoje, delta)), trecho: m[0] };
      }
    }
    return null;
  }

  /* ---------- Horário ---------- */
  function ajustarPeriodo(hora, textoNorm, posicaoAprox) {
    const janela = textoNorm.slice(Math.max(0, posicaoAprox - 3), posicaoAprox + 20);
    if (/\bda tarde\b/.test(janela) && hora < 12) return hora + 12;
    if (/\bda noite\b/.test(janela) && hora < 12) return hora + 12;
    if (/\bda madrugada\b/.test(janela) && hora === 12) return 0;
    return hora;
  }

  function extrairHorario(textoNorm) {
    if (/\bmeio[- ]dia\b/.test(textoNorm)) return { horario: "12:00", trecho: "meio-dia" };
    if (/\bmeia[- ]noite\b/.test(textoNorm)) return { horario: "00:00", trecho: "meia-noite" };

    // Formato numérico: "20h", "20:00", "8h30", "as 8 horas"
    const numMatch = textoNorm.match(/\b(\d{1,2})[h:](\d{2})?\b/);
    if (numMatch) {
      let hora = parseInt(numMatch[1], 10);
      const min = numMatch[2] ? parseInt(numMatch[2], 10) : 0;
      if (hora <= 23) {
        hora = ajustarPeriodo(hora, textoNorm, numMatch.index);
        return { horario: `${String(hora).padStart(2, "0")}:${String(min).padStart(2, "0")}`, trecho: numMatch[0] };
      }
    }

    // Por extenso: "as oito da noite", "as duas e meia da tarde"
    const extensoRe = new RegExp(
      `\\b(${Object.keys(NUM_EXTENSO).join("|")})\\b(\\s+e\\s+meia)?(\\s+da\\s+(manha|tarde|noite|madrugada))?`
    );
    const extMatch = textoNorm.match(extensoRe);
    if (extMatch && extMatch[3]) {
      let hora = NUM_EXTENSO[extMatch[1]];
      const min = extMatch[2] ? 30 : 0;
      hora = ajustarPeriodo(hora, textoNorm, extMatch.index);
      return { horario: `${String(hora).padStart(2, "0")}:${String(min).padStart(2, "0")}`, trecho: extMatch[0] };
    }

    return null;
  }

  /* Interpreta o texto reconhecido. Nunca lança erro — na dúvida, devolve
     só o título (texto original) e data/horario nulos. */
  function parseFalaTarefa(textoOriginal, hoje = new Date()) {
    const textoNorm = normalizar(textoOriginal);
    const dataInfo = extrairData(textoNorm, hoje);
    const horaInfo = extrairHorario(textoNorm);

    let titulo = textoOriginal;
    const trechosPraRemover = [];
    if (dataInfo) trechosPraRemover.push(dataInfo.trecho);
    if (horaInfo) trechosPraRemover.push(horaInfo.trecho);

    // trecho vem do texto normalizado (sem acento) — o título original tem
    // acento, então a remoção precisa ser tolerante a isso (à/a, ã/a, etc.).
    for (const trecho of trechosPraRemover) {
      const re = new RegExp(paraRegexFlexivel(trecho), "i");
      titulo = titulo.replace(re, "");
    }
    titulo = titulo.replace(/\s{2,}/g, " ").trim();
    // Conectores soltos que sobram no fim depois de remover data/horário
    // (pode sobrar mais de um em sequência: "...na às" → remove os dois).
    // Sem \b antes do grupo: \b usa \w ASCII e não reconhece "à" como letra,
    // então a fronteira de palavra falha bem antes de "às" — âncora só em
    // espaço/início de string em vez disso.
    let anterior;
    do {
      anterior = titulo;
      titulo = titulo.replace(/(?:^|\s)(as|às|para|no|na|de|em|ao|aos|do|da|dos|das)\s*$/i, "").trim();
    } while (titulo !== anterior);
    if (!titulo) titulo = textoOriginal.trim();
    titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1);

    return {
      titulo,
      data: dataInfo ? dataInfo.data : null,
      horario: horaInfo ? horaInfo.horario : null,
    };
  }

  /* ---------- Captura de voz ---------- */
  // O reconhecimento do Chrome/Edge roda na nuvem do Google (não é local) —
  // por isso "network" aparece mesmo com o site funcionando, se a máquina
  // não tiver acesso de saída a esse serviço (proxy, firewall, VPN restrita).
  const MENSAGENS_ERRO = {
    network: "Sem conexão com o serviço de reconhecimento de voz do navegador (ele roda na nuvem, não localmente). Verifique sua internet e tente de novo.",
    "not-allowed": "Permissão de microfone negada. Autorize o microfone para este site nas configurações do navegador.",
    "service-not-allowed": "Permissão de microfone negada. Autorize o microfone para este site nas configurações do navegador.",
    "no-speech": "Nenhuma fala foi detectada. Tente falar logo após clicar no microfone.",
    "audio-capture": "Nenhum microfone encontrado neste dispositivo.",
    aborted: "Reconhecimento de voz cancelado.",
  };

  const SpeechRecognitionCtor = global.SpeechRecognition || global.webkitSpeechRecognition;
  const suportado = !!SpeechRecognitionCtor;

  function ouvir() {
    if (!suportado) {
      return Promise.reject(new Error("Reconhecimento de voz não é suportado neste navegador."));
    }
    return new Promise((resolve, reject) => {
      const rec = new SpeechRecognitionCtor();
      rec.lang = "pt-BR";
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      // Uma Promise só resolve/rejeita uma vez — se onresult já resolveu,
      // o reject() do onend (que sempre dispara por último) é um no-op.
      rec.onresult = (e) => resolve(e.results[0][0].transcript);
      rec.onerror = (e) => reject(new Error(MENSAGENS_ERRO[e.error] || e.error || "Erro no reconhecimento de voz"));
      rec.onend = () => reject(new Error("Nenhuma fala reconhecida"));

      try {
        rec.start();
      } catch (err) {
        reject(err);
      }
    });
  }

  global.BloomVoz = { suportado, ouvir, parseFalaTarefa };
})(window);
