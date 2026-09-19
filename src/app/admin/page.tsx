"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Guest = { phone: string; name: string; companions: string[]; status: string; role: string; created_at: string };
type Gift = { id: number; name: string; emoji: string; image: string; price_cents: number; active: boolean };
type Claim = { id: number; gift_name: string; gift_emoji: string; guest_name: string; guest_phone: string; value_cents: number; created_at: string };

const reais = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminPage() {
  const [logged, setLogged] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"guests" | "gifts" | "claims" | "invite">("guests");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [error, setError] = useState("");
  const [gName, setGName] = useState("");
  const [gEmoji, setGEmoji] = useState("");
  const [gImage, setGImage] = useState("");
  const [gPrice, setGPrice] = useState("");
  const [gActive, setGActive] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteQr, setInviteQr] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  async function login() {
    setError("");
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!r.ok) {
      setError("Senha incorreta.");
      return;
    }
    setLogged(true);
    setPassword("");
    loadAll();
  }

  async function loadAll() {
    setRefreshing(true);
    try {
      const [gRes, giRes, cRes] = await Promise.all([
        fetch("/api/admin/guests"),
        fetch("/api/gifts"),
        fetch("/api/admin/claims"),
      ]);
      const [g, gi, c] = await Promise.all([gRes.json().catch(() => ({})), giRes.json().catch(() => ({})), cRes.json().catch(() => ({}))]);
      if (gRes.ok && g.guests) setGuests(g.guests);
      if (giRes.ok && gi.gifts) setGifts(gi.gifts);
      if (cRes.ok && c.claims) {
        setClaims(c.claims);
        setTotalCents(c.total_cents || 0);
      }
      if (!gRes.ok || !giRes.ok || !cRes.ok) {
        const msg = g.error || gi.error || c.error;
        if (msg) setError(String(msg));
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    // Auto-login: se o cookie de admin ainda vale, entra direto
    fetch("/api/admin/guests").then((r) => {
      if (r.ok) {
        setLogged(true);
        loadAll();
      } else if (r.status === 401) {
        // sem sessão, fica no login
      } else {
        r.json().catch(() => ({})).then((j) => {
          if (j.error) setError(j.error);
        });
      }
    });
    setInviteLink(`${window.location.origin}/convite`);
    QRCode.toDataURL(`${window.location.origin}/convite`, { width: 320, margin: 1 })
      .then(setInviteQr)
      .catch(() => {});
  }, []);

  async function delGuest(phone: string) {
    if (!confirm("Excluir este convidado?")) return;
    await fetch(`/api/admin/guests?phone=${phone}`, { method: "DELETE" });
    loadAll();
  }

  function fileToResizedDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("img"));
        img.onload = () => {
          const max = 800;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem.");
      return;
    }
    setPhotoLoading(true);
    setError("");
    try {
      setGImage(await fileToResizedDataUrl(file));
    } catch {
      setError("Não consegui ler essa foto.");
    } finally {
      setPhotoLoading(false);
    }
  }

  function resetGiftForm() {
    setGName("");
    setGEmoji("");
    setGImage("");
    setGPrice("");
    setGActive(true);
    setEditingId(null);
  }

  function startEdit(g: Gift) {
    setEditingId(g.id);
    setGName(g.name);
    setGEmoji(g.emoji);
    setGImage(g.image || "");
    setGPrice(String(g.price_cents / 100).replace(".", ","));
    setGActive(g.active);
    setError("");
    window.scrollTo({ top: 0 });
  }

  async function saveGift() {
    setError("");
    try {
      const r = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          name: gName,
          emoji: gEmoji || "🎁",
          image: gImage,
          price_reais: Number(gPrice.replace(",", ".")),
          active: gActive,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error || `Erro ao salvar (${r.status}).`);
        return;
      }
      resetGiftForm();
      loadAll();
    } catch {
      setError("Erro de conexão ao salvar.");
    }
  }

  async function delGift(id: number) {
    if (!confirm("Excluir este presente?")) return;
    await fetch(`/api/gifts?id=${id}`, { method: "DELETE" });
    loadAll();
  }

  const vou = guests.filter((g) => g.status === "VOU");
  const naoVou = guests.filter((g) => g.status !== "VOU");
  const totalPessoas = vou.reduce((a, g) => a + 1 + g.companions.length, 0);

  if (!logged) {
    return (
      <main className="mx-auto w-full max-w-md px-5 py-12">
        <h1 className="text-2xl font-bold">Acesso dos noivos</h1>
        {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          placeholder="Senha"
          className="mt-4 w-full rounded-2xl border border-stone-300 px-4 py-3"
        />
        <button onClick={login} className="mt-3 w-full rounded-2xl bg-rose-700 py-4 font-semibold text-white">
          Entrar
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-6">
      <h1 className="text-2xl font-bold">Painel dos Noivos</h1>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
          <p className="text-xl font-bold">{totalPessoas}</p>
          <p className="text-xs text-stone-500">pessoas</p>
        </div>
        <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-green-700">{vou.length}</p>
          <p className="text-xs text-stone-500">vão</p>
        </div>
        <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-stone-600">{naoVou.length}</p>
          <p className="text-xs text-stone-500">não vão</p>
        </div>
        <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-rose-700">{reais(totalCents)}</p>
          <p className="text-xs text-stone-500">em presentes</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1.5 sm:gap-2">
        {(["guests", "gifts", "claims", "invite"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`min-w-0 truncate rounded-xl px-1 py-2 text-xs font-semibold sm:text-sm ${tab === t ? "bg-rose-700 text-white" : "bg-stone-200"}`}
          >
            {t === "guests" ? "Convidados" : t === "gifts" ? "Presentes" : t === "claims" ? "Recebidos" : "Convite"}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {tab === "guests" && (
        <section className="mt-4 space-y-2">
          <div className="flex items-center justify-end">
            <button
              onClick={loadAll}
              disabled={refreshing}
              className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 shadow-sm disabled:opacity-50"
            >
              {refreshing ? "Atualizando..." : "↻ Atualizar"}
            </button>
          </div>
          {guests.map((g) => (
            <div key={g.phone} className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <b>{g.name}</b>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${g.status === "VOU" ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-600"}`}>
                  {g.status === "VOU" ? "VAI" : "NÃO VAI"}
                </span>
              </div>
              <p className="text-sm text-stone-500">{g.phone}{g.companions.length > 0 && ` • +${g.companions.length}: ${g.companions.join(", ")}`}</p>
              <div className="mt-2 flex justify-end">
                <button onClick={() => delGuest(g.phone)} className="rounded-xl border border-red-200 px-3 py-1 text-sm text-red-600">Excluir</button>
              </div>
            </div>
          ))}
          {guests.length === 0 && <p className="text-stone-500">Ninguém confirmou ainda. Compartilhe o QR do convite!</p>}
        </section>
      )}

      {tab === "gifts" && (
        <section className="mt-4">
          <div className="mb-2 flex items-center justify-end">
            <button
              onClick={loadAll}
              disabled={refreshing}
              className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 shadow-sm disabled:opacity-50"
            >
              {refreshing ? "Atualizando..." : "↻ Atualizar"}
            </button>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <b>{editingId ? "Editar presente" : "Novo presente"}</b>
            <div className="mt-3 flex items-center gap-3">
              {gImage ? (
                <img src={gImage} alt="Foto do presente" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-3xl">
                  {gEmoji || "🎁"}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <label className="block rounded-xl border border-dashed border-stone-300 px-3 py-3 text-center text-sm font-semibold text-stone-600">
                  {photoLoading ? "Carregando..." : gImage ? "Trocar foto" : "Adicionar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhoto(e.target.files?.[0])}
                  />
                </label>
                {gImage && (
                  <button onClick={() => setGImage("")} className="mt-1 w-full text-xs text-stone-500 underline">
                    Remover foto (usa emoji)
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <input value={gEmoji} onChange={(e) => setGEmoji(e.target.value)} placeholder="🎁" className="w-14 shrink-0 rounded-xl border border-stone-300 px-2 py-3 text-center" />
              <input value={gName} onChange={(e) => setGName(e.target.value)} placeholder="Nome do presente" className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-3" />
            </div>
            <div className="mt-2 flex flex-col gap-2">
              <input value={gPrice} onChange={(e) => setGPrice(e.target.value)} inputMode="decimal" placeholder="Valor em R$" className="w-full rounded-xl border border-stone-300 px-3 py-3" />
              <div className="flex gap-2">
                <button onClick={saveGift} className="flex-1 rounded-xl bg-rose-700 py-3 font-semibold text-white">Salvar</button>
                {editingId && (
                  <button onClick={resetGiftForm} className="flex-1 rounded-xl border border-stone-300 py-3">Cancelar</button>
                )}
              </div>
            </div>
            {editingId && (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={gActive} onChange={(e) => setGActive(e.target.checked)} />
                Visível para os convidados
              </label>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {gifts.map((g) => (
              <div key={g.id} className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  {g.image ? (
                    <img src={g.image} alt={g.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="text-3xl">{g.emoji}</span>
                  )}
                  <span className="min-w-0 flex-1"><b>{g.name}</b>{!g.active && <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-xs">oculto</span>}<br /><span className="text-rose-700 font-bold">{reais(g.price_cents)}</span></span>
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => startEdit(g)} className="flex-1 rounded-xl border border-stone-300 py-2 text-sm font-semibold">Editar</button>
                  <button onClick={() => delGift(g.id)} className="flex-1 rounded-xl border border-red-200 py-2 text-sm font-semibold text-red-600">Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "claims" && (
        <section className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold">Total recebido: {reais(totalCents)}</p>
            <button
              onClick={loadAll}
              disabled={refreshing}
              className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 shadow-sm disabled:opacity-50"
            >
              {refreshing ? "Atualizando..." : "↻ Atualizar"}
            </button>
          </div>
          {claims.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white p-3 shadow-sm text-sm">
              <b>{c.guest_name}</b> ({c.guest_phone}) deu <b>{c.gift_emoji} {c.gift_name}</b> — {reais(c.value_cents)}
              <br /><span className="text-stone-500">{new Date(c.created_at).toLocaleString("pt-BR")}</span>
            </div>
          ))}
          {claims.length === 0 && <p className="text-stone-500">Nenhum presente enviado ainda.</p>}
        </section>
      )}

      {tab === "invite" && (
        <section className="mt-4 text-center">
          <p className="text-sm text-stone-600">Imprima este QR no convite físico:</p>
          {inviteQr && <img src={inviteQr} alt="QR do convite" className="mx-auto mt-3 h-64 w-64 rounded-2xl bg-white p-2 shadow" />}
          <p className="mt-3 break-all font-mono text-sm">{inviteLink}</p>
          <button onClick={() => navigator.clipboard.writeText(inviteLink)} className="mt-3 w-full rounded-2xl border border-stone-300 py-3 font-semibold">
            Copiar link
          </button>
        </section>
      )}
    </main>
  );
}
