import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

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
import { cancelSpeech, hasUrduVoice, listen, recognitionSupported, speak, stopListening } from "@/lib/humnazar/speech";
import { parseHelper, parseHelpType, parseLanguage, parsePhoto, parseRating, parseYesNo, spellRequestNumber, type HelpTypeWord } from "@/lib/humnazar/voice-words";
import { PrototypeContext, useP, type Anim, type Ctx, type Mode, type Request, type Say, type ScreenId, type Session, type VoiceState } from "./context";
import { ArmHint, ConfirmBtn, ListenRow, VoiceRow } from "./voice";
import { Btn, Camera, Icon, Notice, StatusCard, Tip, Toggle } from "./ui";

const IMG: Record<SampleItemId, string> = { spice: spiceImg, medicine: medicineImg, shirt: shirtImg, bill: billImg };
const VOLUNTEER_SCREENS: ScreenId[] = ["A", "V1", "V2x", "V3", "V5", "VM", "VT"];

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

/* ---------- Frame ---------- */

function Frame({ title, caption, cap, spoken, onSpoken, children, actions, noBack }: {
  title: string; caption?: string; cap?: Say; spoken?: Say; onSpoken?: () => void;
  children?: ReactNode; actions?: ReactNode; noBack?: boolean;
}) {
  const { t, lang, back, blind, say } = useP();
  const text = cap ? cap(t, lang) : (caption ?? "");
  const speech = spoken ?? cap ?? (() => text);
  const speechRef = useRef(speech);
  speechRef.current = speech;
  const onSpokenRef = useRef(onSpoken);
  onSpokenRef.current = onSpoken;

  // Every blind-user screen reads its caption aloud when it opens.
  useEffect(() => {
    if (!blind) return;
    let alive = true;
    void say(speechRef.current).then((ok) => { if (ok && alive) onSpokenRef.current?.(); });
    return () => { alive = false; };
  }, [blind, say]);

  const strip = (
    <>
      <Icon n="sp" s={20} />
      <span><b>{t.readsAloud}</b> {text}</span>
    </>
  );
  return (
    <>
      <div className={`hz-tb${noBack ? "" : " has-back"}`}>
        {!noBack && (
          <button type="button" className="hz-back" onClick={back} aria-label={t.back}>
            <Icon n="bk" s={28} />
          </button>
        )}
        <h1 tabIndex={-1} data-screen-title dir={blind ? (lang === "ur" ? "rtl" : "ltr") : undefined}>{title}</h1>
      </div>
      {blind ? (
        <button type="button" className="hz-cs" role="status" aria-live="polite" dir={lang === "ur" ? "rtl" : "ltr"} onClick={() => void say(speechRef.current)}>
          {strip}
        </button>
      ) : (
        <div className="hz-cs" role="status" aria-live="polite">{strip}</div>
      )}
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

/* ---------- Start (unchanged) ---------- */

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

/* ---------- Blind or low-vision user (voice-first) ---------- */

function Home() {
  const { t, go, set } = useP();
  return (
    <Frame title={t.B_title} cap={(x) => x.B_cap}>
      <NotForEmergencies />
      <div className="hz-gr">
        <ConfirmBtn id="needHelp" msg={(x) => x.cf.needHelp} onConfirm={() => { set((s) => ({ ...s, request: freshRequest() })); go("D"); }}>
          {t.B_help}
        </ConfirmBtn>
      </div>
    </Frame>
  );
}

function ChooseHelpType() {
  const { t, go, s, set, press } = useP();
  const [sig, setSig] = useState(0);
  const target: Record<HelpTypeWord, ScreenId> = { quick: "QP", call: "G", later: "Y" };
  const icons: Record<HelpTypeWord, "ey" | "ph" | "cl"> = { quick: "ey", call: "ph", later: "cl" };
  const labels: Record<HelpTypeWord, string> = { quick: t.D_quick, call: t.D_call, later: t.D_later };
  const run = (m: HelpTypeWord) => {
    set((x) => ({
      ...x,
      lastMode: m as Mode,
      askLater: m === "later" ? { photo: x.request.photo, carried: false } : x.askLater,
    }));
    go(target[m]);
  };
  return (
    <Frame title={t.D_title} cap={(x) => x.D_cap} onSpoken={() => setSig((n) => n + 1)}>
      <NotForEmergencies />
      <p>{t.D_p}</p>
      <ListenRow question={(x) => x.D_q} parse={parseHelpType} startSignal={sig}
        onValue={(m) => press(`ht-${m}`, (x) => x.cf[m], () => run(m))} />
      {(["quick", "call", "later"] as const).map((m) => (
        <ConfirmBtn key={m} id={`ht-${m}`} cls={`hz-bt hz-ht${s.lastMode === m ? " hz-pd" : ""}`} msg={(x) => x.cf[m]} onConfirm={() => run(m)}>
          <span className="ic"><Icon n={icons[m]} s={28} /></span>
          <span>
            {labels[m]}
            <span className="desc">{t.D_desc[m]}</span>
            {s.lastMode === m && <span className="last"><Icon n="ck" s={20} />{t.D_last}</span>}
          </span>
        </ConfirmBtn>
      ))}
    </Frame>
  );
}

function QuickLookPhoto() {
  const { t, go, set, say, press } = useP();
  const [taken, setTaken] = useState(false);
  const [sig, setSig] = useState(0);
  const choose = (id: SampleItemId) => {
    set((s) => ({ ...s, request: { ...s.request, photo: id } }));
    go(needsHuman(SAMPLE_ITEM_KIND[id]) ? "F" : "Q");
  };
  useEffect(() => {
    if (!taken) return;
    let alive = true;
    void say((x) => `${x.QP_cap2} ${x.QP_q}`).then((ok) => { if (ok && alive) setSig((n) => n + 1); });
    return () => { alive = false; };
  }, [taken, say]);
  if (!taken) {
    return (
      <Frame title={t.QP_title} cap={(x) => x.QP_cap}
        actions={<ConfirmBtn id="takePhoto" msg={(x) => x.cf.takePhoto} onConfirm={() => setTaken(true)}>{t.QP_take}</ConfirmBtn>}>
        <Camera tall>{t.cameraPlaceholder}</Camera>
      </Frame>
    );
  }
  return (
    <Frame title={t.QP_title} cap={(x) => x.QP_cap2}>
      <ListenRow question={(x) => x.QP_q} parse={parsePhoto} startSignal={sig}
        onValue={(id) => press(`photo-${id}`, (x) => x.cf.photo(x.itemShort[id]), () => choose(id))} />
      <p className="hz-lbl">{t.QP_pick}</p>
      {(["spice", "medicine", "shirt"] as const).map((id) => (
        <ConfirmBtn key={id} id={`photo-${id}`} cls="hz-bt hz-pr hz-pick" msg={(x) => x.cf.photo(x.itemShort[id])} onConfirm={() => choose(id)}>
          <img src={IMG[id]} alt="" width={64} height={64} />
          <span>{t.item[id]}</span>
        </ConfirmBtn>
      ))}
    </Frame>
  );
}

function HumanNeeded() {
  const { t, go, set } = useP();
  return (
    <Frame title={t.F_title} cap={(x) => x.F_cap}
      actions={<ConfirmBtn id="f-call" msg={(x) => x.cf.call} onConfirm={() => go("G")}>{t.D_call}</ConfirmBtn>}>
      <p>{t.F_p}</p>
      <ConfirmBtn id="f-later" cls="hz-bt hz-s" msg={(x) => x.cf.later}
        onConfirm={() => { set((s) => ({ ...s, askLater: { photo: s.request.photo, carried: true } })); go("Y"); }}>
        {t.D_later}
      </ConfirmBtn>
    </Frame>
  );
}

function QuickLookAnswer() {
  const { t, go } = useP();
  return (
    <Frame title={t.Q_title} cap={(x) => `${x.Q_badge}: ${x.Q_answer}`}
      actions={<ConfirmBtn id="q-notsure" msg={(x) => x.cf.notSure} onConfirm={() => go("G")}>{t.Q_notSure}</ConfirmBtn>}>
      <span className="hz-ai"><Icon n="in" s={20} />{t.Q_badge}</span>
      <div className="hz-card">{t.Q_samplePrefix} {t.Q_answer}</div>
      <ConfirmBtn id="q-done" cls="hz-bt hz-s" msg={(x) => x.cf.doneHome} onConfirm={() => go("B", { reset: ["A", "B"], anim: "back" })}>
        {t.done}
      </ConfirmBtn>
    </Frame>
  );
}

function ChooseHelper() {
  const { t, go, s, set, say } = useP();
  const selected = s.helper && !s.unavailable.includes(s.helper) ? s.helper : null;
  const helpers: Helper[] = ["friend", "woman", "man", "anyone"];
  const pickHelper = (h: Helper) => {
    if (s.unavailable.includes(h)) { void say((x) => x.G_notFree(h)); return; }
    set((x) => ({ ...x, helper: h }));
    void say((x) => x.G_echoHelper(x.helper[h]));
  };
  const pickLang = (l: Lang) => {
    set((x) => ({ ...x, lang: l }));
    void say((x) => x.G_echoLang(x.langName[l]), l);
  };
  return (
    <Frame title={t.G_title} cap={(x) => x.G_cap}
      actions={<ConfirmBtn id="g-continue" msg={(x) => x.cf.continue} onConfirm={() => go("T")} disabled={!selected}>{t.G_continue}</ConfirmBtn>}>
      <VoiceRow label={t.G_helper} value={selected ? t.helper[selected] : t.notChosen} question={(x) => x.G_qHelper}
        parse={parseHelper} onValue={pickHelper}
        choices={helpers.map((h) => ({ label: s.unavailable.includes(h) ? `${t.helper[h]} · ${t.G_noneFree}` : t.helper[h], value: h }))} />
      <VoiceRow label={t.G_language} value={t.langName[s.lang]} question={(x) => x.G_qLang}
        parse={parseLanguage} onValue={pickLang}
        choices={(["ur", "en"] as const).map((l) => ({ label: STRINGS[l].langName[l], value: l }))} />
      {!selected && <p className="hz-note">{t.G_pickFree}</p>}
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
    <Frame title={t.T_title} cap={(x) => (busy ? x.T_starting : x.T_cap)}
      actions={<ConfirmBtn id="t-start" busy={busy} msg={(x) => x.cf.startCall} onConfirm={() => setBusy(true)}>
        {busy ? <><span className="hz-sp on-p" aria-hidden="true" />{t.T_starting}</> : t.T_start}
      </ConfirmBtn>}>
      <Tip icon="cm">{t.T_tip1}</Tip>
      <Tip icon="al">{t.T_tip2}</Tip>
    </Frame>
  );
}

function Waiting() {
  const { t, lang, go, s, set, say } = useP();
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
      void say((x, l) => x.H_accepted(accepter.name[l]));
    } else if (!accepter && left === 0) {
      setPhase("expired");
      set((x) => ({ ...x, unavailable: x.unavailable.includes(helper) ? x.unavailable : [...x.unavailable, helper] }));
    }
  }, [left, phase, accepter, helper, set, say]);

  useEffect(() => {
    if (phase === "wait") return;
    const id = setTimeout(() => go(phase === "accepted" ? "M" : "W", { replace: true, anim: "fade" }), phase === "accepted" ? 1600 : 800);
    return () => clearTimeout(id);
  }, [phase, go]);

  const ex = phase === "expired";
  return (
    <Frame title={t.H_title} cap={(x, l) => (phase === "accepted" && accepter ? x.H_accepted(accepter.name[l]) : ex ? x.W_cap : x.H_cap)} spoken={(x) => x.H_cap}>
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
  const { t, lang, s, go, say } = useP();
  const vid = s.request.volunteerId;
  const name = vName(vid, lang);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const a = setTimeout(() => setStep(1), 3000);
    const b = setTimeout(() => setStep(2), 7500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  // Imran's (or Bilal's) live captions are spoken as they arrive.
  useEffect(() => {
    if (step === 0) return;
    void say((x, l) => (step === 1 ? x.M_c1(vName(vid, l)) : x.M_c2(vName(vid, l))));
  }, [step, say, vid]);
  const p = t.M_p(name);
  const cut = p.indexOf(" (");
  return (
    <Frame title={t.M_title} cap={(x, l) => (step === 0 ? x.M_cap(vName(vid, l)) : step === 1 ? x.M_c1(vName(vid, l)) : x.M_c2(vName(vid, l)))}
      spoken={(x, l) => x.M_cap(vName(vid, l))}
      actions={<ConfirmBtn id="m-end" msg={(x) => x.cf.endCall} onConfirm={() => go("R", { reset: ["A", "B", "R"], anim: "fade" })}>{t.M_end}</ConfirmBtn>}>
      <Camera tall img={medicineImg} imgAlt={t.item.medicine} tag={t.cameraSample} />
      <p><b>{p.slice(0, cut)}</b>{p.slice(cut)}</p>
    </Frame>
  );
}

function CallEnded() {
  const { t, lang, s, set, go, say } = useP();
  const vid = s.request.volunteerId;
  const name = vName(vid, lang);
  const isFriend = !!vid && s.friends.includes(vid);
  const [rating, setRating] = useState(0);
  const [reported, setReported] = useState(false);
  const [showNo, setShowNo] = useState(false);
  const yesNo = [{ label: t.yesWord, value: "yes" as const }, { label: t.noWord, value: "no" as const }];
  const setFriend = (yes: boolean) => {
    if (!vid) return;
    set((x) => ({ ...x, friends: yes ? (x.friends.includes(vid) ? x.friends : [...x.friends, vid]) : x.friends.filter((f) => f !== vid) }));
    void say((x, l) => x.R_echoFriend(vName(vid, l), yes));
  };
  return (
    <Frame title={t.R_title} cap={(x) => x.R_cap}
      actions={<ConfirmBtn id="r-done" msg={(x) => x.cf.doneCall} onConfirm={() => go("CD", { reset: ["A", "B", "CD"], anim: "fade" })}>{t.done}</ConfirmBtn>}>
      <p>{t.R_p}</p>
      <VoiceRow label={t.R_rate} value={rating ? t.R_rateVal(rating) : t.R_rateNone} question={(x) => x.R_qRate}
        parse={parseRating} onValue={(n: number) => { setRating(n); void say((x) => x.R_echoRate(n)); }}
        choices={[1, 2, 3, 4, 5].map((n) => ({ label: t.R_rateVal(n), value: n }))} />
      <VoiceRow label={t.R_friendLabel(name)} value={isFriend ? t.yesWord : t.noWord} question={(x, l) => x.R_qFriend(vName(vid, l))}
        parse={parseYesNo} onValue={(v) => setFriend(v === "yes")} choices={yesNo} />
      <VoiceRow label={t.showNumber} value={showNo ? t.numberShownShort : t.numberHiddenShort} question={(x, l) => x.R_qNumber(vName(vid, l))}
        parse={parseYesNo} onValue={(v) => { setShowNo(v === "yes"); void say((x) => x.R_echoNumber(v === "yes")); }} choices={yesNo} />
      {reported ? (
        <div className="hz-fade-in"><Notice v="ok" icon="ck" title={t.R_reported} /></div>
      ) : (
        <ConfirmBtn id="r-report" cls="hz-bt hz-s" msg={(x) => x.cf.report} onConfirm={() => { setReported(true); void say((x) => x.R_reported); }}>
          {t.R_report}
        </ConfirmBtn>
      )}
    </Frame>
  );
}

function RequestComplete() {
  const { t, s, go } = useP();
  const no = s.request.number ?? "";
  return (
    <Frame title={t.CD_title} cap={(x) => x.CD_cap(no)} spoken={(x) => x.CD_cap(spellRequestNumber(no))}
      actions={<ConfirmBtn id="cd-home" msg={(x) => x.cf.backHome} onConfirm={() => go("B", { reset: ["A", "B"], anim: "back" })}>{t.backHome}</ConfirmBtn>}>
      <StatusCard label={t.status} status={t.stCompleted} numberLabel={t.requestNo} number={no} sample={t.sample} />
    </Frame>
  );
}

function NoVolunteer() {
  const { t, s, set, go } = useP();
  const widen = canWiden(s.helper);
  return (
    <Frame title={t.W_title} cap={(x) => x.W_cap}
      spoken={(x) => x.W_spoken([...(widen ? [x.W_widen] : []), x.W_other, x.W_later])}
      actions={<ConfirmBtn id="w-later" msg={(x) => x.cf.sendLater}
        onConfirm={() => { set((x) => ({ ...x, askLater: { photo: x.request.photo ?? "bill", carried: true } })); go("Y"); }}>
        {t.W_later}
      </ConfirmBtn>}>
      <Notice v="e" icon="al" title={t.W_cap} />
      <p>{t.W_p1}</p>
      <p className="hz-note">{t.W_p2}</p>
      {widen && <ConfirmBtn id="w-widen" cls="hz-bt hz-s" msg={(x) => x.cf.widen} onConfirm={() => go("WA")}>{t.W_widen}</ConfirmBtn>}
      <ConfirmBtn id="w-other" cls="hz-bt hz-s" msg={(x) => x.cf.other} onConfirm={() => go("D", { reset: ["A", "B", "D"], anim: "back" })}>{t.W_other}</ConfirmBtn>
    </Frame>
  );
}

function WidenToAnyone() {
  const { t, set, go, back, press } = useP();
  const [sig, setSig] = useState(0);
  const yes = () => { set((x) => ({ ...x, request: { ...x.request, widened: true, volunteerId: null } })); go("H", { replace: true, anim: "fade" }); };
  return (
    <Frame title={t.WA_title} cap={(x) => x.WA_cap} spoken={(x) => `${x.WA_p} ${x.WA_q}`} onSpoken={() => setSig((n) => n + 1)}
      actions={<ConfirmBtn id="wa-yes" msg={(x) => x.cf.waYes} onConfirm={yes}>{t.WA_yes}</ConfirmBtn>}>
      <p>{t.WA_p}</p>
      <ListenRow question={(x) => x.WA_q} parse={parseYesNo} startSignal={sig}
        onValue={(v) => (v === "yes" ? press("wa-yes", (x) => x.cf.waYes, yes) : press("wa-no", (x) => x.cf.waNo, back))} />
      <ConfirmBtn id="wa-no" cls="hz-bt hz-s" msg={(x) => x.cf.waNo} onConfirm={back}>{t.WA_no}</ConfirmBtn>
    </Frame>
  );
}

function AskLater() {
  const { t, s, set, go, say } = useP();
  const [photo, setPhoto] = useState<SampleItemId | null>(s.askLater.photo);
  const [voice, setVoice] = useState<"idle" | "rec" | "done">("idle");
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (voice !== "rec") return;
    const id = setInterval(() => setSec((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [voice]);
  useEffect(() => {
    if (voice === "rec" && sec >= 5) { setVoice("done"); void say((x) => x.Y_recordedSay); }
  }, [sec, voice, say]);
  const startRec = () => { setSec(0); setVoice("rec"); };
  const stopRec = () => { setVoice(sec > 0 ? "done" : "idle"); if (sec > 0) void say((x) => x.Y_recordedSay); };
  const canSend = !!photo || voice === "done";
  const send = () => {
    set((x) => ({ ...x, askLaterNumber: x.askLater.carried && x.request.number ? x.request.number : makeRequestNumber() }));
    go("YC", { reset: ["A", "B", "YC"], anim: "fade" });
  };
  const recBody = (
    <>
      <Icon n={voice === "rec" ? "st" : voice === "done" ? "ck" : "mc"} s={28} />
      <span>
        {voice === "rec" ? t.Y_recording : voice === "done" ? t.Y_recorded : t.Y_record}
        <br /><span dir="ltr">{formatSeconds(sec)}</span> {t.sample}
      </span>
    </>
  );
  return (
    <Frame title={t.Y_title} cap={(x) => (voice === "rec" ? x.Y_recording : x.Y_cap)} spoken={(x) => x.Y_cap}
      actions={<>
        {!canSend && <p className="hz-note">{t.Y_need}</p>}
        <ConfirmBtn id="y-send" msg={(x) => x.cf.send} onConfirm={send} disabled={!canSend}>{t.Y_send}</ConfirmBtn>
      </>}>
      {photo ? (
        <Camera img={IMG[photo]} imgAlt={t.item[photo]} tag={t.item[photo]} />
      ) : (
        <>
          <Camera>{t.Y_photoPh}</Camera>
          <ConfirmBtn id="y-photo" cls="hz-bt hz-s" msg={(x) => x.cf.addPhoto}
            onConfirm={() => { setPhoto("bill"); void say((x) => x.Y_photoAdded(x.itemShort.bill)); }}>
            {t.Y_addPhoto}
          </ConfirmBtn>
        </>
      )}
      {voice === "rec" ? (
        <button type="button" className="hz-bt hz-p" onClick={stopRec} aria-pressed="true">{recBody}</button>
      ) : (
        <ConfirmBtn id="y-rec" cls="hz-bt hz-s" msg={(x) => x.cf.record} onConfirm={startRec}>{recBody}</ConfirmBtn>
      )}
      {s.askLater.carried && s.helper && <p>{t.Y_carried(t.helper[s.helper], t.langName[s.lang])}</p>}
    </Frame>
  );
}

function AskLaterSent() {
  const { t, lang, s, go, say, press, armed, armListening } = useP();
  const [ntf, setNtf] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => {
      setNtf(true);
      void say((x, l) => x.YC_ntf(vName(ASK_LATER_REPLIER, l)));
    }, 5000);
    return () => clearTimeout(id);
  }, [say]);
  const no = s.askLaterNumber ?? "";
  const name = vName(ASK_LATER_REPLIER, lang);
  const on = armed === "yc-ntf";
  return (
    <>
      <Frame title={t.YC_title} cap={(x, l) => (ntf ? x.YC_ntf(vName(ASK_LATER_REPLIER, l)) : x.YC_cap(no))} spoken={(x) => x.YC_cap(spellRequestNumber(no))}>
        <StatusCard label={t.status} status={t.stSent} numberLabel={t.requestNo} number={no} sample={t.sample} />
      </Frame>
      {ntf && (
        <button type="button" className={`hz-ntf${on ? " is-armed" : ""}`}
          onClick={() => press("yc-ntf", (x, l) => x.cf.openReply(vName(ASK_LATER_REPLIER, l)), () => go("YR"))}>
          <Icon n="bl" />
          <span>
            <small>{t.YC_ntfFrom}</small>{t.YC_ntf(name)}
            {on && <ArmHint id="yc-ntf" listening={armListening} text={t.pressAgain} listeningText={t.listening} />}
          </span>
        </button>
      )}
    </>
  );
}

const REPLY_SECONDS = 8;
function VoiceReply() {
  const { t, lang, go, say } = useP();
  const name = vName(ASK_LATER_REPLIER, lang);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [heard, setHeard] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const start = Date.now();
    const id = setInterval(() => setPos(Math.min(REPLY_SECONDS * 0.95, (Date.now() - start) / 1000)), 100);
    return () => clearInterval(id);
  }, [playing]);
  const play = () => {
    setHeard(true);
    setPos(0);
    setPlaying(true);
    void say((x, l) => x.YR_reply(vName(ASK_LATER_REPLIER, l))).then((ok) => {
      setPlaying(false);
      if (ok) setPos(REPLY_SECONDS);
    });
  };
  const stop = () => { cancelSpeech(); setPlaying(false); };
  const body = (
    <>
      <Icon n={playing ? "pa" : "pl"} s={28} />
      {playing ? t.YR_stop : t.YR_play}
    </>
  );
  return (
    <Frame title={t.YR_title} cap={(x, l) => (heard ? x.YR_reply(vName(ASK_LATER_REPLIER, l)) : x.YR_cap)} spoken={(x) => x.YR_cap}
      actions={<ConfirmBtn id="yr-home" msg={(x) => x.cf.backHome} onConfirm={() => go("B", { reset: ["A", "B"], anim: "back" })}>{t.backHome}</ConfirmBtn>}>
      <p>{t.YR_from(name)}</p>
      {playing ? (
        <button type="button" className="hz-bt hz-p" onClick={stop}>{body}</button>
      ) : (
        <ConfirmBtn id="yr-play" cls="hz-bt hz-s" msg={(x) => x.cf.play} onConfirm={play}>{body}</ConfirmBtn>
      )}
      <div className="hz-plbar" aria-hidden="true">
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
  const [armed, setArmed] = useState<string | null>(null);
  const [armListening, setArmListening] = useState(false);
  const [voice, setVoice] = useState<VoiceState>("unknown");
  const phoneRef = useRef<HTMLDivElement>(null);
  const screen: ScreenId = stack[stack.length - 1] ?? "A";
  const blind = !VOLUNTEER_SCREENS.includes(screen);
  const t = STRINGS[s.lang];

  const langRef = useRef<Lang>(s.lang);
  langRef.current = s.lang;
  const voiceRef = useRef<VoiceState>("unknown");
  const voiceAnnounced = useRef(false);
  const armRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  useEffect(() => {
    if (!recognitionSupported()) { voiceRef.current = "off"; setVoice("off"); }
  }, []);

  /** Speaks in the app language; Urdu falls back to the English text when no Urdu voice is installed. */
  const say = useCallback((build: Say, langOverride?: Lang) => {
    const want = langOverride ?? langRef.current;
    const l: Lang = want === "ur" && !hasUrduVoice() ? "en" : want;
    return speak(build(STRINGS[l], l), l);
  }, []);

  const markVoiceOff = useCallback(async () => {
    voiceRef.current = "off";
    setVoice("off");
    if (voiceAnnounced.current) return;
    voiceAnnounced.current = true;
    await say((x) => x.voiceOff);
  }, [say]);
  const markVoiceOk = useCallback(() => {
    if (voiceRef.current !== "ok") { voiceRef.current = "ok"; setVoice("ok"); }
  }, []);

  const clearArm = useCallback(() => {
    if (armRef.current) clearTimeout(armRef.current.timer);
    armRef.current = null;
    setArmed(null);
    setArmListening(false);
  }, []);

  const press = useCallback<Ctx["press"]>((id, msg, action) => {
    if (armRef.current?.id === id) {
      clearArm();
      stopListening();
      cancelSpeech();
      action();
      return;
    }
    clearArm();
    stopListening();
    armRef.current = { id, timer: setTimeout(clearArm, 10000) };
    setArmed(id);
    void say(msg).then(async (ok) => {
      if (!ok || armRef.current?.id !== id || voiceRef.current === "off") return;
      setArmListening(true);
      const r = await listen(langRef.current, 6000);
      if (armRef.current?.id !== id) return;
      setArmListening(false);
      if (r.status === "unavailable") { await markVoiceOff(); return; }
      if (r.status === "ok") {
        markVoiceOk();
        const answer = r.alternatives.map(parseYesNo).find((v) => v !== null);
        if (answer === "yes") { clearArm(); action(); }
        else if (answer === "no") clearArm();
      }
    });
  }, [clearArm, say, markVoiceOff, markVoiceOk]);

  const leave = useCallback(() => {
    clearArm();
    stopListening();
    cancelSpeech();
  }, [clearArm]);

  const go = useCallback<Ctx["go"]>((to, opts = {}) => {
    leave();
    setStack((st) => (opts.reset ? opts.reset : opts.replace ? [...st.slice(0, -1), to] : [...st, to]));
    setAnim(opts.anim ?? "fwd");
    setNavKey((k) => k + 1);
  }, [leave]);
  const endCall = useCallback(() => {
    setConfirm(false);
    if (screen === "M") go("R", { reset: ["A", "B", "R"], anim: "fade" });
    else go("VT", { reset: ["A", "VT"], anim: "fade" });
  }, [screen, go]);
  const back = useCallback(() => {
    if (screen === "M" || screen === "VM") {
      clearArm();
      setConfirm(true);
      if (screen === "M") void say((x) => `${x.M_confirm} ${x.M_confirmBody}`);
      return;
    }
    leave();
    setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
    setAnim("back");
    setNavKey((k) => k + 1);
  }, [screen, leave, clearArm, say]);

  useEffect(() => () => { stopListening(); cancelSpeech(); }, []);

  // Move focus to the new screen title so screen readers announce it.
  useEffect(() => {
    if (navKey === 0) return;
    phoneRef.current?.querySelector<HTMLElement>("[data-screen-title]")?.focus();
  }, [navKey]);

  const Screen = SCREENS[screen];
  const set = useCallback((fn: (s: Session) => Session) => setS(fn), []);
  const ctx: Ctx = {
    t, lang: s.lang, langRef, s, blind, set, go, back, confirmEnd: () => setConfirm(true),
    say, press, armed, armListening, voiceRef, voice, markVoiceOff, markVoiceOk,
  };

  return (
    <PrototypeContext.Provider value={ctx}>
      <main className="hz-stage">
        <div ref={phoneRef} className="hz-ph" dir={s.lang === "ur" ? "rtl" : "ltr"} lang={s.lang} aria-label="Humnazar prototype">
          <div className="hz-sb" dir="ltr" aria-hidden="true"><span>9:41</span><span>4G</span></div>
          <div key={navKey} className={`hz-screen hz-anim-${anim}${blind ? " hz-blind" : ""}`}>
            <Screen />
          </div>
          <div className="hz-hi" aria-hidden="true"><i /></div>
          {confirm && <EndCallDialog t={t} blind={blind} onYes={endCall} onNo={() => { cancelSpeech(); setConfirm(false); }} />}
        </div>
      </main>
    </PrototypeContext.Provider>
  );
}

function EndCallDialog({ t, blind, onYes, onNo }: { t: Strings; blind: boolean; onYes: () => void; onNo: () => void }) {
  const noRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    noRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onNo(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNo]);
  return (
    <div className={`hz-scrim${blind ? " hz-blind" : ""}`} onClick={onNo}>
      <div className="hz-dlg" role="alertdialog" aria-modal="true" aria-labelledby="hz-dlg-t" aria-describedby="hz-dlg-d" onClick={(e) => e.stopPropagation()}>
        <h2 id="hz-dlg-t">{t.M_confirm}</h2>
        <p id="hz-dlg-d" style={{ margin: 0 }}>{t.M_confirmBody}</p>
        <button type="button" className="hz-bt hz-p" onClick={onYes}>{t.M_yes}</button>
        <button type="button" ref={noRef} className="hz-bt hz-s" onClick={onNo}>{t.M_no}</button>
      </div>
    </div>
  );
}
