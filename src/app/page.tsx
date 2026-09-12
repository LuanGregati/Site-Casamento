import Image from "next/image";
import Link from "next/link";

function daysUntil(): number {
  const target = new Date("2027-05-08T16:00:00");
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / 86400000));
}

export default function Home() {
  return (
    <main className="relative mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
      {/* Foto dos noivos como fundo */}
      <Image
        src="/noivos-1.jpg"
        alt="Luan e Mariana mostrando as alianças"
        fill
        priority
        className="object-cover"
        sizes="(max-width: 448px) 100vw, 448px"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

      {/* Topo + nomes sobre a foto */}
      <div className="relative flex flex-1 flex-col justify-between p-5">
        <p className="mx-auto w-fit rounded-full bg-white/20 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white backdrop-blur">
          Save the date
        </p>
        <div className="pb-16 text-white">
          <p className="font-serif text-4xl font-bold leading-tight drop-shadow">Luan e Mariana</p>
          <p className="mt-1 text-sm font-medium uppercase tracking-widest text-rose-200">
            08 • 05 • 2027
          </p>
        </div>
      </div>

      {/* Cartão inferior */}
      <div className="relative rounded-t-[2rem] bg-white px-5 pb-4 pt-5 shadow-2xl">
        <p className="text-sm text-stone-600">
          Confirme sua presença e escolha um presente simbólico. Faltam{" "}
          <b className="text-rose-700">{daysUntil()} dias</b>!
        </p>
        <Link
          href="/convite"
          className="mt-3 block w-full rounded-2xl bg-rose-700 px-6 py-3.5 text-center text-lg font-semibold text-white shadow hover:bg-rose-800"
        >
          Confirmar presença
        </Link>
        <div className="mt-2 text-center">
          <Link href="/admin" className="text-xs text-stone-400 underline">
            Acesso dos noivos
          </Link>
        </div>
      </div>
    </main>
  );
}
