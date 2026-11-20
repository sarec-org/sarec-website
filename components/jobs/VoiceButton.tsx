'use client';
/**
 * 说说情况：语音。点"按一下开始说"录一段（1 分钟以内），说完点"说完了"，传上去附在活儿里，接活的人能听。
 * 浏览器不支持录音的，告诉用户用手机键盘上的话筒按钮说话（会自动变成文字），不让页面空等。
 */
import { useEffect, useRef, useState } from 'react';
import s from '@/components/crm/crm.module.css';

export function VoiceButton({ url, onChange }: { url: string | null; onChange: (url: string | null) => void }) {
  const [state, setState] = useState<'idle' | 'rec' | 'up'>('idle');
  const [tip, setTip] = useState('');
  const [left, setLeft] = useState(60);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => () => { clearInterval(timer.current); rec.current?.stream.getTracks().forEach((t) => t.stop()); }, []);

  async function start() {
    setTip('');
    if (typeof window === 'undefined' || !('MediaRecorder' in window) || !navigator.mediaDevices?.getUserMedia) {
      setTip('这个浏览器不能直接录音。请点上面的输入框，用手机键盘上的话筒按钮说话，会自动变成文字。');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setTip('没有拿到话筒权限。可以在浏览器设置里允许使用话筒，或者直接打字。');
      return;
    }
    const type = ['audio/mp4', 'audio/webm', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported?.(t)) ?? '';
    const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      clearInterval(timer.current);
      void upload(new Blob(chunks.current, { type: (r.mimeType || 'audio/webm').split(';')[0] }));
    };
    rec.current = r;
    r.start();
    setState('rec');
    setLeft(60);
    timer.current = setInterval(() => setLeft((x) => { if (x <= 1) { r.state === 'recording' && r.stop(); return 0; } return x - 1; }), 1000);
  }

  async function upload(b: Blob) {
    setState('up');
    const fd = new FormData();
    fd.append('file', new File([b], `voice.${b.type.includes('mp4') ? 'm4a' : b.type.includes('ogg') ? 'ogg' : 'webm'}`, { type: b.type }));
    try {
      const res = await fetch('/api/v1/jobs/upload?kind=voice', { method: 'POST', body: fd, credentials: 'same-origin' });
      const json = (await res.json().catch(() => null)) as { ok: boolean; url?: string; error?: { message: string } } | null;
      if (json?.ok && json.url) { onChange(json.url); setTip('语音已附上。'); }
      else setTip(res.status === 401 ? '登录后才能附语音（下面登录一下就好），也可以直接打字。' : json?.error?.message ?? '语音没传上，请再试一次，或者直接打字。');
    } catch {
      setTip('网络不稳定，语音没传上，请再试一次，或者直接打字。');
    }
    setState('idle');
  }

  return (
    <div style={{ flexBasis: '100%' }}>
      {url && state === 'idle' ? (
        <div className={s.inputRow} style={{ alignItems: 'center' }}>
          <audio src={url} controls style={{ flex: '1 1 200px', maxWidth: '100%' }} />
          <button type="button" className={`${s.btn} ${s.btnQuiet}`} onClick={() => { onChange(null); setTip(''); }}>删掉语音</button>
        </div>
      ) : (
        <button type="button" className={`${s.btn} ${s.btnQuiet}`} disabled={state === 'up'} onClick={() => (state === 'rec' ? rec.current?.stop() : start())}>
          {state === 'rec' ? `说完了（还能说 ${left} 秒）` : state === 'up' ? '正在上传语音…' : '用语音说（按一下开始）'}
        </button>
      )}
      {tip && <p className={s.small} style={{ margin: '0.3rem 0 0' }}>{tip}</p>}
    </div>
  );
}
