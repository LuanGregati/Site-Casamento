"use client";

import { useEffect, useState } from "react";
import { formatPhone } from "@/lib/phone";

type Guest = { phone: string; name: string; companions: string[]; status: string };
type Gift = { id: number; name: string; emoji: string; image: string; price_cents: number };
type Pix = { brcode: string; qrDataUrl: string; value_cents: number; gift_name: string };

const GUEST_COOKIE = "casamento_convidado";

function getCookie(name: string): string {
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

function delCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

const reais = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ConvitePage() {
  const [step, setStep] = useState<"phone" | "rsvp" | "gifts" | "gift" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [guest, setGuest] = useState<Guest | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [name, setName] = useState("");
  const [companionsList, setCompanionsList] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [gift, setGift] = useState<Gift | null>(null);
  const [pix, setPix] = useState<Pix | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = getCookie(GUEST_COOKIE);
    if (saved) {
      setPhone(saved);
      lookup(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(p: string) {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/guests/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p }),
      });
      const data = await r.json();
      if (data.guest) {
        setGuest(data.guest);
        setIsNew(false);
        setName(data.guest.name);
        setCompanionsList(data.guest.companions.length > 0 ? data.guest.companions : []);
        setCookie(GUEST_COOKIE, data.guest.phone);
        await loadGifts();
        setStep("gifts");
      } else {
        setGuest(null);
        setIsNew(true);
        setName("");
        setCompanionsList([]);
        setStep("rsvp");
      }
    } catch {
      setError("Erro de conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  async function loadGifts() {
    const r = await fetch("/api/gifts");
    const data = await r.json();
    setGifts(data.gifts || []);
  }

  function companions(): string[] {
    return companionsList.map((s) => s.trim()).filter(Boolean).slice(0, 10);
  }

  function setCompanion(i: number, value: string) {
    setCompanionsList((list) => list.map((v, idx) => (idx === i ? value : v)));
  }

  function removeCompanion(i: number) {
    setCompanionsList((list) => list.filter((_, idx) => idx !== i));
  }

  async function submitRsvp(status: "VOU" | "NAO_VOU") {
    if (name.trim().length < 2) {
      setError("Informe seu nome.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/guests/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name: name.trim(), companions: companions(), status }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Não foi possível salvar.");
        return;
      }
      setGuest(data.guest);
      setCookie(GUEST_COOKIE, data.guest.phone);
      setEditing(false);
      await loadGifts();
      setStep("gifts");
    } catch {
      setError("Erro de conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  async function openGift(g: Gift) {
    setGift(g);
    setPix(null);
    setCopied(false);
    setStep("gift");
    setLoading(true);
    try {
      const r = await fetch(`/api/pix?giftId=${g.id}`);
      const data = await r.json();
      if (r.ok) setPix(data);
      else setError(data.error || "Erro ao gerar Pix.");
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  async function copyBrcode() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.brcode);
      setCopied(true);
    } catch {
      setError("Não consegui copiar. Selecione o código manualmente.");
    }
  }

  async function sendGift() {
    if (!gift || !guest) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId: gift.id, phone: guest.phone }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Não foi possível registrar.");
        return;
      }
      setStep("done");
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    delCookie(GUEST_COOKIE);
    setPhone("");
    setGuest(null);
    setStep("phone");
  }

  const firstName = (guest?.name || name).split(" ")[0];

  return (
    <main className="mx-auto w-full max-w-md px-5 py-8">
      <p className="text-center text-xs font-medium uppercase tracking-widest text-rose-700">
        Casamento • 08/05/2027
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {step === "phone" && (
        <section className="mt-6">
          <h1 className="text-2xl font-bold">Bem-vindo!</h1>
          <p className="mt-2 text-stone-600">Digite seu celular para entrar. É só isso, sem senha.</p>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="(11) 99999-9999"
            className="mt-4 w-full rounded-2xl border border-stone-300 px-4 py-3 text-lg"
          />
          <button
            disabled={loading}
            onClick={() => lookup(phone)}
            className="mt-3 w-full rounded-2xl bg-rose-700 px-6 py-4 text-lg font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </section>
      )}

      {step === "rsvp" && (
        <section className="mt-6">
          <h1 className="text-2xl font-bold">
            {isNew ? "Confirme sua presença" : `Olá, ${firstName}!`}
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            {formatPhone(phone)} • <button onClick={logout} className="underline">trocar número</button>
          </p>
          <label className="mt-4 block text-sm font-medium">Seu nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome completo"
            className="mt-1 w-full rounded-2xl border border-stone-300 px-4 py-3"
          />
          <label className="mt-4 block text-sm font-medium">Acompanhantes</label>
          {companionsList.length === 0 && (
            <p className="mt-1 text-sm text-stone-500">Só você? Pode deixar vazio.</p>
          )}
          <div className="mt-1 space-y-2">
            {companionsList.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={c}
                  onChange={(e) => setCompanion(i, e.target.value)}
                  placeholder={`Acompanhante ${i + 1}`}
                  className="flex-1 rounded-2xl border border-stone-300 px-4 py-3"
                />
                <button
                  type="button"
                  onClick={() => removeCompanion(i)}
                  aria-label="Remover acompanhante"
                  className="rounded-2xl border border-stone-300 px-4 text-lg text-stone-500"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {companionsList.length < 10 && (
            <button
              type="button"
              onClick={() => setCompanionsList((list) => [...list, ""])}
              className="mt-2 w-full rounded-2xl border border-dashed border-rose-300 py-3 font-semibold text-rose-700"
            >
              + Adicionar acompanhante
            </button>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              disabled={loading}
              onClick={() => submitRsvp("VOU")}
              className="rounded-2xl bg-rose-700 px-4 py-4 font-semibold text-white disabled:opacity-50"
            >
              Vou!
            </button>
            <button
              disabled={loading}
              onClick={() => submitRsvp("NAO_VOU")}
              className="rounded-2xl border border-stone-300 px-4 py-4 font-semibold disabled:opacity-50"
            >
              Não vou
            </button>
          </div>
        </section>
      )}

      {step === "gifts" && guest && (
        <section className="mt-6">
          <h1 className="text-2xl font-bold">Olá, {guest.name.split(" ")[0]}!</h1>
          <p className="mt-1 text-sm text-stone-600">
            {guest.status === "VOU" ? "Presença confirmada. " : "Sentiremos sua falta. "}
            <button onClick={() => { setEditing(true); setStep("rsvp"); }} className="underline">
              Editar presença
            </button>
          </p>
          <h2 className="mt-6 text-lg font-semibold">Escolha um presente simbólico</h2>
          <div className="mt-3 grid gap-3">
            {gifts.map((g) => (
              <button
                key={g.id}
                onClick={() => openGift(g)}
                className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm"
              >
                {g.image ? (
                  <img src={g.image} alt={g.name} className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <span className="text-4xl">{g.emoji}</span>
                )}
                <span className="flex-1">
                  <span className="block font-semibold">{g.name}</span>
                  <span className="block text-rose-700 font-bold">{reais(g.price_cents)}</span>
                </span>
                <span className="text-stone-400">›</span>
              </button>
            ))}
            {gifts.length === 0 && <p className="text-stone-500">Nenhum presente por enquanto.</p>}
          </div>
        </section>
      )}

      {step === "gift" && gift && (
        <section className="mt-6">
          <button onClick={() => setStep("gifts")} className="text-sm text-stone-500 underline">
            ‹ Voltar
          </button>
          <div className="mt-2 text-center">
            {gift.image ? (
              <img src={gift.image} alt={gift.name} className="mx-auto h-36 w-36 rounded-3xl object-cover shadow" />
            ) : (
              <span className="text-6xl">{gift.emoji}</span>
            )}
            <h1 className="mt-2 text-2xl font-bold">{gift.name}</h1>
            <p className="text-xl font-bold text-rose-700">{reais(gift.price_cents)}</p>
          </div>
          <ol className="mt-6 space-y-2 rounded-2xl bg-white p-4 text-sm shadow-sm">
            <li><b>1.</b> Copie o código Pix abaixo</li>
            <li><b>2.</b> Pague no app do seu banco</li>
            <li><b>3.</b> Clique em Enviar presente</li>
          </ol>
          {loading && <p className="mt-4 text-center text-stone-500">Gerando Pix...</p>}
          {pix && (
            <>
              <img src={pix.qrDataUrl} alt="QR Code Pix" className="mx-auto mt-4 h-64 w-64 rounded-2xl bg-white p-2 shadow" />
              <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm">
                <p className="break-all font-mono text-xs text-stone-600">{pix.brcode}</p>
                <button onClick={copyBrcode} className="mt-2 w-full rounded-xl border border-stone-300 py-3 font-semibold">
                  {copied ? "Copiado!" : "Copiar código Pix"}
                </button>
              </div>
              <button
                disabled={loading}
                onClick={sendGift}
                className="mt-4 w-full rounded-2xl bg-rose-700 px-6 py-4 text-lg font-semibold text-white disabled:opacity-50"
              >
                Enviar presente
              </button>
            </>
          )}
        </section>
      )}

      {step === "done" && gift && (
        <section className="mt-10 text-center">
          <p className="text-6xl">❤️</p>
          <h1 className="mt-3 text-2xl font-bold">Presente enviado!</h1>
          <p className="mt-2 text-stone-600">
            Obrigado por presentear com {gift.name} ({reais(gift.price_cents)}).{" "}
            {guest?.status === "VOU" ? "Te vemos em 08/05/2027!" : "Sentiremos sua falta!"}
          </p>
          <button onClick={() => setStep("gifts")} className="mt-6 w-full rounded-2xl border border-stone-300 py-4 font-semibold">
            Ver outros presentes
          </button>
        </section>
      )}
    </main>
  );
}
