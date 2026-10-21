"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import type { RoomState } from "@/lib/room-types";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: {
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  abort: () => void;
};
type VoiceWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
type Props = {
  room: RoomState;
  send: (action: string, extra?: Record<string, unknown>) => Promise<void>;
  connected: boolean;
  onReadyChange?: (value: boolean) => void;
};
export function RoomVoice({ room: r, send, connected, onReadyChange }: Props) {
  const [ready, setReady] = useState(false),
    [working, setWorking] = useState(false),
    [listening, setListening] = useState(false),
    [message, setMessage] = useState(""),
    [transcript, setTranscript] = useState("");
  const stream = useRef<MediaStream | null>(null),
    sendRef = useRef(send);
  const endCapture = useRef<(() => void) | null>(null);
  sendRef.current = send;
  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);
  useEffect(
    () => () => {
      endCapture.current?.();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  async function enable() {
    setWorking(true);
    setMessage("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw Error(
          "Recording is unavailable here. Choose an answer or use an in-person moderator.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      media.getTracks().forEach((t) => {
        t.enabled = false;
      });
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = media;
      setReady(true);
      const w = window as VoiceWindow;
      setMessage(
        w.SpeechRecognition || w.webkitSpeechRecognition
          ? "Mic ready. Buzz first, then speak; the first recognized response is submitted."
          : "Mic ready. This browser cannot transcribe; your moderator will judge the shared recording.",
      );
    } catch (e) {
      setMessage(
        (e as Error).message ||
          "Microphone permission is needed. You can still choose an answer.",
      );
    } finally {
      setWorking(false);
    }
  }
  const active =
    ready && connected && r.status === "locked" && r.winner === r.me;
  useEffect(() => {
    if (!active || !stream.current) return;
    let cancelled = false,
      finished = false;
    let recognition: Recognition | null = null;
    const media = stream.current;
    media.getTracks().forEach((t) => {
      t.enabled = true;
    });
    const mime = [
      "audio/webm;codecs=opus",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ].find((t) => MediaRecorder.isTypeSupported(t));
    const chunks: BlobPart[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(media, {
        ...(mime ? { mimeType: mime } : {}),
        audioBitsPerSecond: 32000,
      });
    } catch {
      setMessage("Recording failed. Choose an answer instead.");
      media.getTracks().forEach((t) => {
        t.enabled = false;
      });
      return;
    }
    let heard = "";
    const stopMic = () => {
      recognition?.abort();
      media.getTracks().forEach((t) => {
        t.enabled = false;
      });
      setListening(false);
    };
    const finish = () => {
      if (finished || cancelled) return;
      finished = true;
      recognition?.abort();
      if (recorder.state !== "inactive") recorder.stop();
    };
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      stopMic();
      if (cancelled) return;
      const blob = new Blob(chunks, { type: recorder.mimeType });
      if (!blob.size || blob.size > 135000) {
        setMessage(
          "No usable recording. Choose an answer before time runs out.",
        );
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (cancelled) return;
        const audio = String(reader.result).split(",")[1];
        setMessage("Spoken answer sent to the room.");
        void sendRef.current("voice", {
          answer: heard.slice(0, 1000),
          audio,
          mime: recorder.mimeType.split(";")[0],
        });
      };
      reader.readAsDataURL(blob);
    };
    setTranscript("");
    setListening(true);
    setMessage("You have the floor. Say one answer now.");
    recorder.start();
    const Speech =
      (window as VoiceWindow).SpeechRecognition ||
      (window as VoiceWindow).webkitSpeechRecognition;
    if (Speech) {
      recognition = new Speech();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onresult = (e) => {
        heard = Array.from(e.results)
          .map((v) => v[0].transcript)
          .join(" ")
          .trim();
        setTranscript(heard);
        if (Array.from(e.results).some((v) => v.isFinal)) finish();
      };
      recognition.onerror = (e) => {
        if (e.error !== "aborted")
          setMessage(
            "Transcription unavailable. Keep speaking; the moderator can hear your recording.",
          );
      };
      try {
        recognition.start();
      } catch {
        setMessage("Speak now. Your moderator can review the audio.");
      }
    }
    // Send before the server's five-second deadline, reserving time for upload.
    const serverOffset = Date.parse(r.server_time) - Date.now();
    const budget = Math.max(
      0,
      Math.min(
        4000,
        Date.parse(r.locked_at!) + 4300 - Date.now() - serverOffset,
      ),
    );
    const timer = setTimeout(finish, budget);
    endCapture.current = () => {
      cancelled = true;
      clearTimeout(timer);
      if (recorder.state !== "inactive") recorder.stop();
      stopMic();
    };
    return () => {
      endCapture.current?.();
      endCapture.current = null;
    };
  }, [active, r.code, r.index, r.locked_at]);
  if (r.my_role !== "player") return null;
  return (
    <details
      open={r.status === "waiting"}
      className={
        "room-voice-panel" + (ready && r.status !== "waiting" ? " compact" : "")
      }
      aria-label="Spoken answers"
    >
      <summary>
        {listening
          ? "Microphone active"
          : ready
            ? "Voice enabled"
            : "Answer options"}
      </summary>
      <div>
        <Mic size={19} />
        <strong>
          {listening
            ? "Listening — answer now"
            : ready
              ? "Spoken answers ready"
              : "Answer with your voice"}
        </strong>
      </div>
      <p>
        Enable your mic before the round. After your buzz wins, speak one answer
        within five seconds. A short clip and transcript are shared with this
        room.
      </p>
      <details>
        <summary>Voice & privacy</summary>
        <small>
          Transcription uses your browser's speech service where supported.
          Otherwise the moderator judges the recording. You can always select a
          choice.
        </small>
      </details>
      <div className="voice-actions">
        {!ready ? (
          <button
            className="game-button secondary"
            disabled={working || r.status === "locked"}
            onClick={() => void enable()}
          >
            <Mic size={16} />
            {working ? "Enabling…" : "Enable spoken answers"}
          </button>
        ) : (
          <button
            className="game-button secondary"
            onClick={() => {
              setReady(false);
              endCapture.current?.();
              stream.current?.getTracks().forEach((t) => t.stop());
              stream.current = null;
              setMessage("");
            }}
          >
            <MicOff size={16} />
            Use choices instead
          </button>
        )}
        <button
          className="game-button secondary"
          onClick={() => {
            localStorage.setItem("qf-sound", "true");
            import("@/lib/game").then((m) => m.playSound("buzz"));
          }}
        >
          <Volume2 size={16} />
          Enable buzzer sound
        </button>
      </div>
      {message && (!ready || listening || r.status === "waiting") && (
        <p className="voice-message">{message}</p>
      )}
      {transcript && listening && (
        <p className="voice-transcript">Heard: “{transcript}”</p>
      )}
    </details>
  );
}
export function SharedVoice({
  room: r,
  send,
  disabled,
}: {
  room: RoomState;
  send: Props["send"];
  disabled: boolean;
}) {
  if (!r.voice) return null;
  return (
    <section className="shared-voice" aria-label="Shared spoken answer">
      <strong>
        <Mic size={17} />
        Spoken answer · {r.members.find((m) => m.id === r.winner)?.name}
      </strong>
      <audio
        controls
        preload="metadata"
        src={"data:" + r.voice.mime + ";base64," + r.voice.audio}
      />
      <p>
        {r.voice.transcript
          ? "Heard: “" + r.voice.transcript + "”"
          : "No transcript available. Moderator: listen and judge the recording."}
      </p>
      {r.voice.needs_review && (
        <p>
          Speech recognition needs a moderator check. The score is provisional.
        </p>
      )}
      {r.my_role === "moderator" &&
        r.status === "resolved" &&
        r.voice.timely && (
          <div className="voice-actions">
            <button
              className="game-button judge-correct"
              disabled={disabled}
              onClick={() => void send("review_voice", { correct: true })}
            >
              Spoken answer is correct
            </button>
            <button
              className="game-button secondary"
              disabled={disabled}
              onClick={() => void send("review_voice", { correct: false })}
            >
              Spoken answer is incorrect
            </button>
          </div>
        )}
    </section>
  );
}
