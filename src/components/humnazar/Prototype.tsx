import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import spiceImg from "@/assets/sample-spice-packet.jpg";
import medicineImg from "@/assets/sample-medicine-strip.jpg";
import shirtImg from "@/assets/sample-shirts.jpg";
import billImg from "@/assets/sample-gas-bill.jpg";
import { STRINGS, type Strings } from "@/lib/humnazar/i18n";
import {
  acceptAtSecondsLeft,
  acceptingVolunteer,
  ASK_LATER_REPLIER,
  canWiden,
  demoTickMs,
  formatSeconds,
  makeRequestNumber,
  matchingVolunteers,
  needsHuman,
  SAMPLE_ITEM_KIND,
  USER_FIRST_NAME,
  volunteer,
  WAIT_SECONDS,
  type Helper,
  type Lang,
  type SampleItemId,
} from "@/lib/humnazar/logic";
import { Btn, Camera, Chip, HelpType, Icon, Notice, Rating, StatusCard, Tip, Toggle } from "./ui";

type ScreenId =
  | "A" | "B" | "D" | "QP" | "F" | "Q" | "G" | "T" | "H" | "M" | "R" | "CD" | "W" | "WA"
  | "Y" | "YC" | "YR" | "V1" | "V2x" | "V3" | "V5" | "VM" | "VT";
type Anim = "fwd" | "back" | "fade";
type Mode = "quick" | "call" | "later";

const IMG: Record<SampleItemId, string> = { spice: spiceImg, medicine: medicineImg, shirt: shirtImg, bill: billImg };

interface Request {
  number: string | null;
  photo: SampleItemId | null;
  widened: boolean;
  volunteerId: string | null;
}
interface AskLaterSeed {
  photo: SampleItemId | null;
  carried: boolean;
}
interface Session {
  lang: Lang;
  helper: Helper | null;
  lastMode: Mode | null;
  friends: string[];
  unavailable: Helper[];
  linkUsed: boolean;
  request: Request;
  askLater: AskLaterSeed;
  askLaterNumber: string | null;
}

const freshRequest = (): Request => ({ number: null, photo: null, widened: false, volunteerId: null });

const initialSession: Session = {
  lang: "en",
  helper: "friend",
  lastMode: null,
  friends: ["bilal", "usman"],
  unavailable: [],
  linkUsed: false,
  request: freshRequest(),
  askLater: { photo: null, carried: false },
  askLaterNumber: null,
};

interface Ctx {
  t: Strings;
  lang: Lang;
  s: Session;
  set: (fn: (s: Session) => Session) => void;
  go: (to: ScreenId, opts?: { replace?: boolean; reset?: ScreenId[]; anim?: Anim }) => void;
  back: () => void;
  confirmEnd: () => void;
}
const C = createContext<Ctx | null>(null);
const useP = () => {
  const c = useContext(C);
  if (!c) throw new Error("Prototype context missing");
  return c;
};

/* ---------- Frame ---------- */

function Frame({ title, caption, children, actions, noBack }: { title: string; caption: string; children?: ReactNode; actions?: ReactNode; noBack?: boolean }) {
  const { t, back } = useP();
  return (
    <>
      <div className={`hz-tb${noBack ? "" : " has-back"}`}>
        {!noBack && (
          <button type="button" className="hz-back" onClick={back} aria-label={t.back}>
            <Icon n="bk" s={28} />
          </button>
        )}
        <h1 tabIndex={-1} data-screen-title>{title}</h1>
      </div>
      <div className="hz-cs" role="status" aria-live="polite">
        <Icon n="sp" s={20} />
        <span><b>{t.readsAloud}</b> {caption}</span>
      </div>
      <div className="hz-ct">{children}</div>
      {actions && <div className="hz-ac">{actions}</div>}
    </>
  );
}

function NotForEmergencies() {
  const { t } = useP();
  return <Notice v="n" icon="al" title={t.notEmergTitle}>{t.notEmergBody}</Notice>;
}

const vName = (id: string | null, lang: Lang) => (id ? volunteer(id).name[lang] : "");

/* ---------- Blind or low-vision user ---------- */

function StartScreen() {
  const { t, go } = useP();
  return (
    <Frame noBack title={t.A_title} caption={t.A_cap}
      actions={<>
        <Btn onClick={() => go("B")}>{t.A_user}</Btn>
        <Btn kind="s" onClick={() => go("V1")}>{t.A_vol}</Btn>
      </>}>
      <Notice v="i" icon="in">{t.A_info}</Notice>
    </Frame>
  );
}

function Home() {
  const { t, go, set } = useP();
  return (
    <Frame title={t.B_title} caption={t.B_cap}>
      <NotForEmergencies />
      <div className="hz-gr">
        <Btn onClick={() => { set((s) => ({ ...s, request: freshRequest() })); go("D"); }}>{t.B_help}</Btn>
      </div>
    </Frame>
  );
}

function ChooseHelpType() {
  const { t, go, s, set } = useP();
  const pick = (m: Mode, to: ScreenId) => {
    set((x) => ({
      ...x,
      lastMode: m,
      askLater: m === "later" ? { photo: x.request.photo, carried: false } : x.askLater,
    }));
    go(to);
  };
  return (
    <Frame title={t.D_title} caption={t.D_cap}>
      <NotForEmergencies />
      <p>{t.D_p}</p>
      <HelpType icon="ey" last={s.lastMode === "quick"} lastLabel={t.D_last} onClick={() => pick("quick", "QP")}>{t.D_quick}</HelpType>
      <HelpType icon="ph" last={s.lastMode === "call"} lastLabel={t.D_last} onClick={() => pick("call", "G")}>{t.D_call}</HelpType>
      <HelpType icon="cl" last={s.lastMode === "later"} lastLabel={t.D_last} onClick={() => pick("later", "Y")}>{t.D_later}</HelpType>
    </Frame>
  );
}

function QuickLookPhoto() {
  const { t, go, set } = useP();
  const [taken, setTaken] = useState(false);
  const choose = (id: SampleItemId) => {
    set((s) => ({ ...s, request: { ...s.request, photo: id } }));
    go(needsHuman(SAMPLE_ITEM_KIND[id]) ? "F" : "Q");
  };
  if (!taken) {
    return (
      <Frame title={t.QP_title} caption={t.QP_cap} actions={<Btn onClick={() => setTaken(true)}>{t.QP_take}</Btn>}>
        <Camera tall>{t.cameraPlaceholder}</Camera>
      </Frame>
    );
  }
  return (
    <Frame title={t.QP_title} caption={t.QP_cap2}>
      <div className="hz-fade-in" style={{ display: "contents" }}>
        <p className="hz-lbl" id="hz-pick">{t.QP_pick}</p>
        {(["spice", "medicine", "shirt"] as const).map((id) => (
          <button key={id} type="button" className="hz-bt hz-pr hz-pick" onClick={() => choose(id)}>
            <img src={IMG[id]} alt="" width={56} height={56} />
            <span>{t.item[id]}</span>
          </button>
        ))}
      </div>
    </Frame>
  );
}

function HumanNeeded() {
  const { t, go, set } = useP();
  return (
    <Frame title={t.F_title} caption={t.F_cap}
      actions={<>
        <Btn onClick={() => go("G")}>{t.D_call}</Btn>
        <Btn kind="s" onClick={() => { set((s) => ({ ...s, askLater: { photo: s.request.photo, carried: true } })); go("Y"); }}>{t.D_later}</Btn>
      </>}>
      <p>{t.F_p}</p>
    </Frame>
  );
}

function QuickLookAnswer() {
  const { t, go } = useP();
  return (
    <Frame title={t.Q_title} caption={`${t.Q_badge}: ${t.Q_answer}`}
      actions={<>
        <Btn large onClick={() => go("G")}>{t.Q_notSure}</Btn>
        <Btn kind="s" onClick={() => go("B", { reset: ["A", "B"], anim: "back" })}>{t.done}</Btn>
      </>}>
      <span className="hz-ai"><Icon n="in" s={20} />{t.Q_badge}</span>
      <div className="hz-card">{t.Q_samplePrefix} {t.Q_answer}</div>
    </Frame>
  );
}

function ChooseHelper() {
  const { t, go, s, set } = useP();
  const selected = s.helper && !s.unavailable.includes(s.helper) ? s.helper : null;
  const helpers: Helper[] = ["friend", "woman", "man", "anyone"];
  return (
    <Frame title={t.G_title} caption={t.G_cap}
      actions={<Btn onClick={() => go("T")} disabled={!selected}>{t.G_continue}</Btn>}>
      <b id="hz-helper">{t.G_helper}</b>
      <div className="hz-o" role="radiogroup" aria-labelledby="hz-helper">
        {helpers.map((h) => {
          const off = s.unavailable.includes(h);
          return (
            <Chip key={h} on={selected === h} disabled={off} note={off ? t.G_noneFree : undefined}
              onClick={() => set((x) => ({ ...x, helper: h }))}>
              {t.helper[h]}
            </Chip>
          );
        })}
      </div>
      {!selected && <p className="hz-note">{t.G_pickFree}</p>}
      <b id="hz-lang">{t.G_language}</b>
      <div className="hz-o" role="radiogroup" aria-labelledby="hz-lang">
        {(["ur", "en"] as const).map((l) => (
          <Chip key={l} on={s.lang === l} onClick={() => set((x) => ({ ...x, lang: l }))}>
            <span lang={l}>{STRINGS[l].langName[l]}</span>
          </Chip>
        ))}
      </div>
    </Frame>
  );
}

function BeforeCall() {
  const { t, go, set } = useP();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!busy) return;
    const id = setTimeout(() => {
      set((s) => ({ ...s, request: { ...s.request, number: s.request.number ?? makeRequestNumber(), widened: false, volunteerId: null } }));
      go("H", { anim: "fade" });
    }, 1000);
    return () => clearTimeout(id);
  }, [busy, go, set]);
  return (
    <Frame title={t.T_title} caption={busy ? t.T_starting : t.T_cap}
      actions={<Btn busy={busy} onClick={() => setBusy(true)}>
        {busy ? <><span className="hz-sp on-p" aria-hidden="true" />{t.T_starting}</> : t.T_start}
      </Btn>}>
      <Tip icon="cm">{t.T_tip1}</Tip>
      <Tip icon="al">{t.T_tip2}</Tip>
    </Frame>
  );
}

function Waiting() {
  const { t, lang, go, s, set } = useP();
  const helper: Helper = s.request.widened ? "anyone" : (s.helper ?? "anyone");
  const accepter = acceptingVolunteer(helper);
  const [left, setLeft] = useState(WAIT_SECONDS);
  const [phase, setPhase] = useState<"wait" | "accepted" | "expired">("wait");

  useEffect(() => {
    if (phase !== "wait") return;
    const id = setInterval(() => setLeft((n) => Math.max(0, n - 1)), demoTickMs);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "wait") return;
    if (accepter && left <= acceptAtSecondsLeft) {
      setPhase("accepted");
      set((x) => ({ ...x, request: { ...x.request, volunteerId: accepter.id } }));
    } else if (!accepter && left === 0) {
      setPhase("expired");
      set((x) => ({ ...x, unavailable: x.unavailable.includes(helper) ? x.unavailable : [...x.unavailable, helper] }));
    }
  }, [left, phase, accepter, helper, set]);

  useEffect(() => {
    if (phase === "wait") return;
    const id = setTimeout(() => go(phase === "accepted" ? "M" : "W", { replace: true, anim: "fade" }), 800);
    return () => clearTimeout(id);
  }, [phase, go]);

  const ex = phase === "expired";
  const caption = phase === "accepted" && accepter ? t.H_accepted(accepter.name[lang]) : ex ? t.W_cap : t.H_cap;
  return (
    <Frame title={t.H_title} caption={caption}>
      <div>
        <div className="hz-tm">
          {ex ? <Icon n="al" /> : <span className="hz-sp" aria-hidden="true" />}
          <b className={ex ? "ex" : ""} aria-hidden="true">{formatSeconds(left)}</b>
          <span>{ex ? t.H_up : t.H_left}</span>
        </div>
        <div className="hz-bar" aria-hidden="true"><i className={ex ? "ex" : ""} style={{ width: `${(left / WAIT_SECONDS) * 100}%` }} /></div>
      </div>
      <p>{t.H_p}</p>
      <div className="hz-vl">
        {matchingVolunteers(helper).map((v) => {
          const acc = phase === "accepted" && accepter?.id === v.id;
          const st = acc ? "accepted" : v.status === "free" ? "asking" : v.status;
          return (
            <div key={v.id} className={acc ? "acc" : ""}>
              <Icon n={acc ? "ck" : st === "asking" ? "cl" : "x"} s={20} />
              <span>{v.name[lang]}: {t.vs[st]} {t.sample}</span>
            </div>
          );
        })}
      </div>
      {phase === "accepted" && accepter && (
        <div className="hz-fade-in"><Notice v="ok" icon="ck" title={t.H_accepted(accepter.name[lang])} /></div>
      )}
      <StatusCard loading={!ex} label={t.status} status={t.stWaiting} numberLabel={t.requestNo} number={s.request.number ?? ""} sample={t.sample} />
    </Frame>
  );
}

function LiveCall() {
  const { t, lang, s, confirmEnd } = useP();
  const name = vName(s.request.volunteerId, lang);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const a = setTimeout(() => setStep(1), 2000);
    const b = setTimeout(() => setStep(2), 5500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  const caption = step === 0 ? t.M_cap(name) : step === 1 ? t.M_c1(name) : t.M_c2(name);
  return (
    <Frame title={t.M_title} caption={caption} actions={<Btn onClick={confirmEnd}>{t.M_end}</Btn>}>
      <Camera tall img={medicineImg} imgAlt={t.item.medicine} tag={t.cameraSample} />
      <p><b>{t.M_p(name).split(" (")[0]}</b> {t.M_p(name).slice(t.M_p(name).indexOf(" ("))}</p>
    </Frame>
  );
}

function CallEnded() {
  const { t, lang, s, set, go } = useP();
  const vid = s.request.volunteerId;
  const name = vName(vid, lang);
  const isFriend = !!vid && s.friends.includes(vid);
  const [rating, setRating] = useState(0);
  const [reported, setReported] = useState(false);
  const [showNo, setShowNo] = useState(false);
  return (
    <Frame title={t.R_title} caption={t.R_cap}
      actions={<Btn onClick={() => go("CD", { reset: ["A", "B", "CD"], anim: "fade" })}>{t.done}</Btn>}>
      <p>{t.R_p}</p>
      <Rating value={rating} onChange={setRating} label={t.R_rate} aria={t.R_rateAria} />
      {isFriend ? (
        <div className="hz-fade-in"><Notice v="ok" icon="ck" title={t.R_friends(name)} /></div>
      ) : (
        <Btn kind="s" onClick={() => { if (vid) set((x) => ({ ...x, friends: [...x.friends, vid] })); }}>{t.R_addFriend(name)}</Btn>
      )}
      {reported ? (
        <div className="hz-fade-in"><Notice v="ok" icon="ck" title={t.R_reported} /></div>
      ) : (
        <Btn kind="s" onClick={() => setReported(true)}>{t.R_report}</Btn>
      )}
      <Toggle on={showNo} onChange={setShowNo} label={t.showNumber} onText={t.numberShown} offText={t.numberHidden} />
    </Frame>
  );
}

function RequestComplete() {
  const { t, s, go } = useP();
  const no = s.request.number ?? "";
  return (
    <Frame title={t.CD_title} caption={t.CD_cap(no)}
      actions={<Btn onClick={() => go("B", { reset: ["A", "B"], anim: "back" })}>{t.backHome}</Btn>}>
      <StatusCard label={t.status} status={t.stCompleted} numberLabel={t.requestNo} number={no} sample={t.sample} />
    </Frame>
  );
}

function NoVolunteer() {
  const { t, s, set, go } = useP();
  return (
    <Frame title={t.W_title} caption={t.W_cap}
      actions={<>
        <Btn onClick={() => { set((x) => ({ ...x, askLater: { photo: x.request.photo ?? "bill", carried: true } })); go("Y"); }}>{t.W_later}</Btn>
        {canWiden(s.helper) && <Btn kind="s" onClick={() => go("WA")}>{t.W_widen}</Btn>}
        <Btn kind="s" onClick={() => go("D", { reset: ["A", "B", "D"], anim: "back" })}>{t.W_other}</Btn>
      </>}>
      <Notice v="e" icon="al" title={t.W_cap} />
      <p>{t.W_p1}</p>
      <p className="hz-note">{t.W_p2}</p>
    </Frame>
  );
}

function WidenToAnyone() {
  const { t, set, go, back } = useP();
  return (
    <Frame title={t.WA_title} caption={t.WA_cap}
      actions={<>
        <Btn onClick={() => { set((x) => ({ ...x, request: { ...x.request, widened: true, volunteerId: null } })); go("H", { replace: true, anim: "fade" }); }}>{t.WA_yes}</Btn>
        <Btn kind="s" onClick={back}>{t.WA_no}</Btn>
      </>}>
      <p>{t.WA_p}</p>
    </Frame>
  );
}

function AskLater() {
  const { t, s, set, go } = useP();
  const [photo, setPhoto] = useState<SampleItemId | null>(s.askLater.photo);
  const [voice, setVoice] = useState<"idle" | "rec" | "done">("idle");
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (voice !== "rec") return;
    const id = setInterval(() => setSec((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [voice]);
  useEffect(() => {
    if (voice === "rec" && sec >= 5) setVoice("done");
  }, [sec, voice]);
  const tapRec = () => {
    if (voice === "rec") setVoice(sec > 0 ? "done" : "idle");
    else { setSec(0); setVoice("rec"); }
  };
  const canSend = !!photo || voice === "done";
  const send = () => {
    set((x) => ({ ...x, askLaterNumber: x.askLater.carried && x.request.number ? x.request.number : makeRequestNumber() }));
    go("YC", { reset: ["A", "B", "YC"], anim: "fade" });
  };
  const caption = voice === "rec" ? t.Y_recording : t.Y_cap;
  return (
    <Frame title={t.Y_title} caption={caption}
      actions={<>
        {!canSend && <p className="hz-note">{t.Y_need}</p>}
        <Btn onClick={send} disabled={!canSend}>{t.Y_send}</Btn>
      </>}>
      {photo ? (
        <Camera img={IMG[photo]} imgAlt={t.item[photo]} tag={t.item[photo]} />
      ) : (
        <>
          <Camera>{t.Y_photoPh}</Camera>
          <Btn kind="s" onClick={() => setPhoto("bill")}>{t.Y_addPhoto}</Btn>
        </>
      )}
      <button type="button" className="hz-rc" onClick={tapRec} aria-pressed={voice === "rec"}>
        <span className={`m${voice === "rec" ? " rec" : voice === "done" ? " done" : ""}`} aria-hidden="true">
          <Icon n={voice === "rec" ? "st" : voice === "done" ? "ck" : "mc"} s={32} />
        </span>
        <span>
          <b>{voice === "rec" ? t.Y_recording : voice === "done" ? t.Y_recorded : t.Y_record}</b><br />
          <span dir="ltr">{formatSeconds(sec)}</span> {t.sample}
        </span>
      </button>
      {s.askLater.carried && s.helper && <p>{t.Y_carried(t.helper[s.helper], t.langName[s.lang])}</p>}
    </Frame>
  );
}

function AskLaterSent() {
  const { t, lang, s, go } = useP();
  const [ntf, setNtf] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setNtf(true), 5000);
    return () => clearTimeout(id);
  }, []);
  const no = s.askLaterNumber ?? "";
  const name = vName(ASK_LATER_REPLIER, lang);
  return (
    <>
      <Frame title={t.YC_title} caption={ntf ? t.YC_ntf(name) : t.YC_cap(no)}>
        <StatusCard label={t.status} status={t.stSent} numberLabel={t.requestNo} number={no} sample={t.sample} />
      </Frame>
      {ntf && (
        <button type="button" className="hz-ntf" onClick={() => go("YR")}>
          <Icon n="bl" />
          <span><small>{t.YC_ntfFrom}</small>{t.YC_ntf(name)}</span>
        </button>
      )}
    </>
  );
}

const REPLY_SECONDS = 8;
function VoiceReply() {
  const { t, lang, go } = useP();
  const name = vName(ASK_LATER_REPLIER, lang);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [heard, setHeard] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setPos((p) => {
      const n = p + 0.1;
      if (n >= REPLY_SECONDS) { setPlaying(false); return REPLY_SECONDS; }
      return n;
    }), 100);
    return () => clearInterval(id);
  }, [playing]);
  useEffect(() => () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, []);
  const toggle = () => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (playing) { synth?.pause(); setPlaying(false); return; }
    setHeard(true);
    if (pos >= REPLY_SECONDS || pos === 0) {
      setPos(0);
      try {
        synth?.cancel();
        const u = new SpeechSynthesisUtterance(t.YR_reply(name).slice(name.length + 2));
        u.lang = lang === "ur" ? "ur-PK" : "en-GB";
        synth?.speak(u);
      } catch { /* speech is optional in the prototype */ }
    } else synth?.resume();
    setPlaying(true);
  };
  return (
    <Frame title={t.YR_title} caption={heard ? t.YR_reply(name) : t.YR_cap}
      actions={<Btn onClick={() => go("B", { reset: ["A", "B"], anim: "back" })}>{t.backHome}</Btn>}>
      <p>{t.YR_from(name)}</p>
      <div className="hz-pl">
        <button type="button" className="m" onClick={toggle} aria-label={playing ? t.YR_pause : t.YR_play}>
          <Icon n={playing ? "pa" : "pl"} s={28} />
        </button>
        <div className="hz-bar"><i style={{ width: `${(pos / REPLY_SECONDS) * 100}%` }} /></div>
        <span><span className="t">{formatSeconds(Math.floor(pos))} / {formatSeconds(REPLY_SECONDS)}</span> {t.sample}</span>
      </div>
    </Frame>
  );
}

/* ---------- Volunteer ---------- */

function WhatsApp() {
  const { t, s, set, go } = useP();
  const join = () => {
    if (s.linkUsed) { go("V2x", { anim: "fade" }); return; }
    set((x) => ({ ...x, linkUsed: true }));
    go("V3");
  };
  return (
    <Frame title={t.V1_title} caption={t.V1_cap} actions={<Btn onClick={join}>{t.V1_join}</Btn>}>
      <div className="hz-mb"><small>{t.V1_from}</small>{t.V1_msg}<small>{t.V1_time}</small></div>
    </Frame>
  );
}

function LinkExpired() {
  const { t, go } = useP();
  return (
    <Frame title={t.V2x_title} caption={t.V2x_cap} actions={<Btn onClick={() => go("A", { reset: ["A"], anim: "back" })}>{t.startOver}</Btn>}>
      <Notice v="e" icon="al" title={t.V2x_cap} />
      <p>{t.V2x_p}</p>
    </Frame>
  );
}

function VolunteerRule() {
  const { t, go } = useP();
  return (
    <Frame title={t.V3_title} caption={t.V3_rule}
      actions={<>
        <Btn onClick={() => go("VM")}>{t.V3_join}</Btn>
        <Btn kind="s" onClick={() => go("V5")}>{t.V3_cant}</Btn>
      </>}>
      <p className="hz-ru">{t.V3_rule}</p>
      {t.V3_no.map((x) => <Tip key={x} icon="x" no>{x}</Tip>)}
    </Frame>
  );
}

function DeclineReasons() {
  const { t, go } = useP();
  const [pick, setPick] = useState<number | null>(null);
  return (
    <Frame title={t.V5_title} caption={pick === null ? t.V5_cap : t.V5_thanks}
      actions={<Btn onClick={() => go("A", { reset: ["A"], anim: "back" })}>{t.startOver}</Btn>}>
      <div role="radiogroup" aria-label={t.V5_cap} style={{ display: "contents" }}>
        {t.V5_reasons.map((r, i) => (
          <button key={r} type="button" role="radio" aria-checked={pick === i} className={`hz-rd${pick === i ? " on" : ""}`} onClick={() => setPick(i)}>
            <i aria-hidden="true" />{r}
          </button>
        ))}
      </div>
      {pick !== null && <div className="hz-fade-in"><Notice v="ok" icon="ck" title={t.V5_thanks} /></div>}
    </Frame>
  );
}

function VolunteerCall() {
  const { t, lang, confirmEnd } = useP();
  const p = t.VM_p(USER_FIRST_NAME[lang]);
  const cut = p.indexOf(" (");
  return (
    <Frame title={t.VM_title} caption={t.VM_cap} actions={<Btn onClick={confirmEnd}>{t.VM_end}</Btn>}>
      <Camera tall img={medicineImg} imgAlt={t.item.medicine} tag={t.cameraSample} />
      <p><b>{p.slice(0, cut)}</b>{p.slice(cut)}</p>
    </Frame>
  );
}

function ThankYou() {
  const { t, go } = useP();
  const [showNo, setShowNo] = useState(false);
  return (
    <Frame title={t.VT_title} caption={t.VT_cap} actions={<Btn onClick={() => go("A", { reset: ["A"], anim: "back" })}>{t.startOver}</Btn>}>
      <p>{t.VT_p}</p>
      <div className="hz-card"><small>{t.VT_month}</small><div className="hz-ru">{t.VT_helped}</div></div>
      <Toggle on={showNo} onChange={setShowNo} label={t.showNumber} onText={t.numberShown} offText={t.numberHidden} />
    </Frame>
  );
}

const SCREENS: Record<ScreenId, () => ReactNode> = {
  A: StartScreen, B: Home, D: ChooseHelpType, QP: QuickLookPhoto, F: HumanNeeded, Q: QuickLookAnswer,
  G: ChooseHelper, T: BeforeCall, H: Waiting, M: LiveCall, R: CallEnded, CD: RequestComplete,
  W: NoVolunteer, WA: WidenToAnyone, Y: AskLater, YC: AskLaterSent, YR: VoiceReply,
  V1: WhatsApp, V2x: LinkExpired, V3: VolunteerRule, V5: DeclineReasons, VM: VolunteerCall, VT: ThankYou,
};

/* ---------- Shell ---------- */

export function Prototype() {
  const [s, setS] = useState<Session>(initialSession);
  const [stack, setStack] = useState<ScreenId[]>(["A"]);
  const [anim, setAnim] = useState<Anim>("fade");
  const [navKey, setNavKey] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const phoneRef = useRef<HTMLDivElement>(null);
  const screen: ScreenId = stack[stack.length - 1] ?? "A";
  const t = STRINGS[s.lang];

  const set = useCallback((fn: (s: Session) => Session) => setS(fn), []);
  const go = useCallback<Ctx["go"]>((to, opts = {}) => {
    setStack((st) => (opts.reset ? opts.reset : opts.replace ? [...st.slice(0, -1), to] : [...st, to]));
    setAnim(opts.anim ?? "fwd");
    setNavKey((k) => k + 1);
  }, []);
  const endCall = useCallback(() => {
    setConfirm(false);
    if (screen === "M") go("R", { reset: ["A", "B", "R"], anim: "fade" });
    else go("VT", { reset: ["A", "VT"], anim: "fade" });
  }, [screen, go]);
  const back = useCallback(() => {
    if (screen === "M" || screen === "VM") { setConfirm(true); return; }
    setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
    setAnim("back");
    setNavKey((k) => k + 1);
  }, [screen]);

  // Move focus to the new screen title so screen readers announce it.
  useEffect(() => {
    if (navKey === 0) return;
    phoneRef.current?.querySelector<HTMLElement>("[data-screen-title]")?.focus();
  }, [navKey]);

  const Screen = SCREENS[screen];
  const ctx: Ctx = { t, lang: s.lang, s, set, go, back, confirmEnd: () => setConfirm(true) };

  return (
    <C.Provider value={ctx}>
      <main className="hz-stage">
        <div ref={phoneRef} className="hz-ph" dir={s.lang === "ur" ? "rtl" : "ltr"} lang={s.lang} aria-label="Humnazar prototype">
          <div className="hz-sb" dir="ltr" aria-hidden="true"><span>9:41</span><span>4G</span></div>
          <div key={navKey} className={`hz-screen hz-anim-${anim}`}>
            <Screen />
          </div>
          <div className="hz-hi" aria-hidden="true"><i /></div>
          {confirm && <EndCallDialog t={t} onYes={endCall} onNo={() => setConfirm(false)} />}
        </div>
      </main>
    </C.Provider>
  );
}

function EndCallDialog({ t, onYes, onNo }: { t: Strings; onYes: () => void; onNo: () => void }) {
  const noRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    noRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onNo(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNo]);
  return (
    <div className="hz-scrim" onClick={onNo}>
      <div className="hz-dlg" role="alertdialog" aria-modal="true" aria-labelledby="hz-dlg-t" aria-describedby="hz-dlg-d" onClick={(e) => e.stopPropagation()}>
        <h2 id="hz-dlg-t">{t.M_confirm}</h2>
        <p id="hz-dlg-d" style={{ margin: 0 }}>{t.M_confirmBody}</p>
        <button type="button" className="hz-bt hz-p" onClick={onYes}>{t.M_yes}</button>
        <button type="button" ref={noRef} className="hz-bt hz-s" onClick={onNo}>{t.M_no}</button>
      </div>
    </div>
  );
}
