import Link from "next/link";

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return diagonal ? (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19 19 5M7 5h12v12" />
    </svg>
  ) : (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16m-7-7 7 7-7 7" />
    </svg>
  );
}

const capabilities = [
  {
    number: "01 / FRONTEND",
    title: "경험을 만드는\n프론트엔드",
    description: "사용자가 보는 화면부터 손끝에서 느끼는 인터랙션까지, 직관적이고 반응이 빠른 인터페이스를 만듭니다.",
    tags: ["Next.js", "React", "Tailwind CSS"],
    symbol: "◫",
  },
  {
    number: "02 / FULL-STACK",
    title: "끝까지 연결하는\n풀스택 구현",
    description: "필요한 서버 기능과 데이터 흐름까지 연결해 아이디어가 실제로 작동하는 제품이 되도록 구현합니다.",
    tags: ["API", "Database", "Deployment"],
    symbol: "⌘",
  },
  {
    number: "03 / AI WORKFLOW",
    title: "더 빠르게 검증하는\nAI 활용",
    description: "AI를 탐색, 구현, 검토의 도구로 활용합니다. 결과는 직접 확인하고 제품에 맞게 다듬습니다.",
    tags: ["Research", "Prototyping", "Iteration"],
    symbol: "✳",
  },
];

export default function Home() {
  return (
    <main>
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between border-b border-[#d8dad1] px-6 lg:px-10">
        <Link href="/" aria-label="홈으로 이동" className="flex items-center gap-3 text-sm font-bold tracking-[-0.04em]">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-[11px] bg-[#1c2420] text-lg text-[#c7f05c]">✳</span>
          <span>PORTFOLIO<span className="text-[#8a9388]">.</span></span>
        </Link>
        <Link href="/coffee-chat" className="inline-flex items-center gap-2 rounded-full border border-[#242c26] px-4 py-2.5 text-xs font-bold transition-colors hover:bg-[#e8eddf] sm:px-5 sm:text-sm">
          커피챗에서 만나기 <ArrowIcon diagonal />
        </Link>
      </header>

      <section id="about" className="mx-auto grid max-w-7xl gap-12 px-6 pb-22 pt-18 md:pt-24 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-16 lg:px-10 lg:pb-30 lg:pt-28">
        <div>
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-[#d9dfcf] bg-white/70 px-4 py-2 text-[11px] font-bold tracking-[0.12em] text-[#52644a] sm:text-xs">
            <span className="size-2 rounded-full bg-[#8bc944]" /> FRONTEND FIRST · FULL-STACK READY
          </div>
          <h1 className="text-[clamp(2.7rem,6.5vw,6.15rem)] font-bold leading-[1.13] tracking-[-0.075em]">
            화면을 넘어,<br />
            <span className="relative inline-block whitespace-nowrap">
              제품의 끝까지
              <span aria-hidden="true" className="absolute -bottom-1 left-0 -z-10 h-[.22em] w-full rounded-full bg-[#c7f05c] sm:-bottom-2" />
            </span>
            <span className="text-[#90a17c]">.</span>
          </h1>
          <p className="mt-8 max-w-xl break-keep text-base leading-[1.9] text-[#5e665e] sm:text-lg">
            좋은 프론트엔드는 보기 좋은 화면을 넘어, 실제로 잘 작동하는 경험을 만듭니다. 저는 사용자 경험을 중심에 두고 필요한 기술을 연결해 아이디어를 제품으로 구현합니다.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/coffee-chat" className="inline-flex min-h-13 items-center gap-4 rounded-full bg-[#1d2820] px-6 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#344537]">
              커피챗에서 만나기 <ArrowIcon diagonal />
            </Link>
          </div>
          <div className="mt-15 flex items-center gap-3 text-xs font-medium tracking-[0.08em] text-[#899087]">
            <span className="h-px w-8 bg-[#aeb8a7]" /> BUILD WITH PURPOSE, SHIP WITH CARE
          </div>
        </div>

        <div className="relative isolate min-h-[430px] overflow-hidden rounded-[32px] bg-[#19231d] p-6 text-white shadow-[0_24px_70px_rgba(30,45,28,.13)] sm:min-h-[540px] sm:p-9">
          <div aria-hidden="true" className="grid-pattern absolute inset-0 opacity-70" />
          <div aria-hidden="true" className="absolute -right-18 -top-28 size-[360px] rounded-full bg-[#9fd755]/12 blur-[90px]" />
          <div className="relative z-10 flex items-center justify-between text-[10px] font-bold tracking-[0.16em] text-[#aab9a8] sm:text-xs">
            <span>FROM IDEA TO INTERFACE</span><span>001 / 003</span>
          </div>
          <div aria-hidden="true" className="orb float-slow absolute left-[calc(50%-110px)] top-[21%] size-[220px] rounded-full sm:left-[calc(50%-155px)] sm:size-[310px]" />
          <div className="float-delayed absolute left-5 top-[33%] z-20 rounded-xl border border-white/15 bg-[#2b382e]/90 px-4 py-3 text-[10px] font-medium tracking-[0.1em] text-[#e8f4e4] shadow-xl backdrop-blur sm:left-10 sm:text-xs">
            <span className="mr-2 text-[#c7f05c]">●</span> DESIGN WITH EMPATHY
          </div>
          <div className="float-slow absolute right-5 top-[55%] z-20 rounded-xl border border-white/15 bg-[#2b382e]/90 px-4 py-3 text-[10px] font-medium tracking-[0.1em] text-[#e8f4e4] shadow-xl backdrop-blur sm:right-10 sm:text-xs">
            <span className="mr-2 text-[#c7f05c]">↗</span> BUILD TO WORK
          </div>
          <div className="absolute inset-x-6 bottom-6 z-20 rounded-2xl border border-white/15 bg-[#26352a]/80 p-5 backdrop-blur-lg sm:inset-x-9 sm:bottom-9 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.17em] text-[#b9cab5]">HOW I BUILD</span>
              <span className="flex gap-1.5"><i className="size-1.5 rounded-full bg-[#c7f05c]" /><i className="size-1.5 rounded-full bg-[#78956b]" /><i className="size-1.5 rounded-full bg-[#78956b]" /></span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold sm:text-xs">
              <span className="rounded-lg bg-white/10 px-2 py-3 text-center">생각하고</span>
              <span className="rounded-lg bg-[#c7f05c] px-2 py-3 text-center text-[#1c281e]">구현하고</span>
              <span className="rounded-lg bg-white/10 px-2 py-3 text-center">개선합니다</span>
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="border-y border-[#e0e3db] bg-white/60 py-22 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mb-12 flex flex-col justify-between gap-5 md:mb-15 md:flex-row md:items-end">
            <div>
              <p className="mb-4 text-xs font-bold tracking-[0.18em] text-[#678348]">WHAT I DO</p>
              <h2 className="text-4xl font-bold tracking-[-0.06em] sm:text-5xl">필요한 곳에, 필요한 기술을.</h2>
            </div>
            <p className="max-w-sm break-keep text-sm leading-7 text-[#687168]">프론트엔드를 중심에 두고 제품에 필요한 영역까지 자연스럽게 확장합니다.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {capabilities.map((item) => (
              <article key={item.number} className="group flex min-h-[350px] flex-col rounded-[26px] border border-[#e4e8df] bg-[#fbfcf8] p-7 transition-all hover:-translate-y-1 hover:border-[#b6d487] hover:shadow-[0_18px_35px_rgba(56,78,43,.08)] sm:p-8">
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-bold tracking-[0.15em] text-[#75836d]">{item.number}</span>
                  <span aria-hidden="true" className="grid size-12 place-items-center rounded-2xl bg-[#eaf4d9] text-3xl text-[#38502c]">{item.symbol}</span>
                </div>
                <h3 className="mt-14 whitespace-pre-line text-[1.65rem] font-bold leading-[1.35] tracking-[-0.055em]">{item.title}</h3>
                <p className="mt-4 break-keep text-sm leading-7 text-[#697269]">{item.description}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-8">
                  {item.tags.map((tag) => <span key={tag} className="rounded-full border border-[#e0e7d7] px-3 py-1.5 text-[11px] font-semibold text-[#607055]">{tag}</span>)}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="approach" className="mx-auto grid max-w-7xl gap-12 px-6 py-22 sm:py-28 lg:grid-cols-[.75fr_1.25fr] lg:gap-24 lg:px-10">
        <div>
          <p className="mb-4 text-xs font-bold tracking-[0.18em] text-[#678348]">MY APPROACH</p>
          <h2 className="text-4xl font-bold leading-[1.25] tracking-[-0.06em] sm:text-5xl">빠르게 만들고,<br />꼼꼼하게 다듬습니다.</h2>
          <p className="mt-6 max-w-sm break-keep text-sm leading-7 text-[#687168]">문제를 이해하는 일부터 실제 사용 경험을 확인하는 일까지, 한 단계씩 이어갑니다.</p>
        </div>
        <div className="border-t border-[#d9dfd3]">
          {[
            ["01", "문제 이해", "누구의 어떤 문제인지 먼저 파악하고 필요한 경험을 정리합니다."],
            ["02", "빠른 구현", "작동하는 화면과 기능을 만들어 아이디어를 빠르게 확인합니다."],
            ["03", "검증과 개선", "직접 써 보며 어색한 흐름을 찾고 더 나은 형태로 다듬습니다."],
          ].map(([number, title, description]) => (
            <div key={number} className="grid grid-cols-[44px_1fr] gap-4 border-b border-[#d9dfd3] py-6 sm:grid-cols-[60px_150px_1fr] sm:items-center sm:gap-6 sm:py-8">
              <span className="text-xs font-bold text-[#8ba078]">{number}</span>
              <h3 className="text-lg font-bold tracking-[-0.04em]">{title}</h3>
              <p className="col-start-2 break-keep text-sm leading-6 text-[#687168] sm:col-start-auto">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-8 lg:px-10">
        <div className="relative overflow-hidden rounded-[30px] bg-[#1d2820] px-7 py-12 text-white sm:px-12 sm:py-16 lg:flex lg:items-end lg:justify-between lg:px-16">
          <div aria-hidden="true" className="absolute -right-15 -top-30 size-90 rounded-full border-[55px] border-[#c7f05c]/10" />
          <div className="relative">
            <p className="mb-5 text-xs font-bold tracking-[0.18em] text-[#c7f05c]">LET&apos;S CONNECT</p>
            <h2 className="text-4xl font-bold leading-[1.2] tracking-[-0.06em] sm:text-5xl">좋은 아이디어는<br />대화에서 시작하니까요.</h2>
            <p className="mt-5 break-keep text-sm leading-7 text-[#b7c3b4]">함께 만들고 싶은 제품이나 나누고 싶은 이야기가 있다면 편하게 이야기해요.</p>
          </div>
          <Link href="/coffee-chat" className="relative mt-9 inline-flex min-h-13 items-center gap-6 rounded-full bg-[#c7f05c] px-6 text-sm font-bold text-[#1d2820] transition-all hover:-translate-y-0.5 hover:bg-[#dafc8a] lg:mt-0">
            커피챗에서 이야기하기 <ArrowIcon diagonal />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-xs text-[#899087] sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <span className="font-bold tracking-[0.12em] text-[#536052]">PORTFOLIO.</span>
        <span>Frontend at heart. Built for the whole product.</span>
      </footer>
    </main>
  );
}
