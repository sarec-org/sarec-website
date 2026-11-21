/** 找工人 · 接活儿：图片、语音上传（存 Vercel Blob，返回网址） */
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { CrmError } from '@/lib/crm/events';
import { BLOB_PREFIX, blobConfigured, uploadImage } from '@/lib/crm/photos';

const AUDIO: Record<string, string> = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/wav': 'wav' };

export async function uploadFromForm(req: Request, kind: 'image' | 'voice', maxSide = 1600): Promise<string> {
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  if (!f || typeof f === 'string') throw new CrmError('bad_request', kind === 'voice' ? '请先录一段语音' : '请选择图片');
  if (f.size > (kind === 'voice' ? 8 : 6) * 1024 * 1024) throw new CrmError('bad_request', kind === 'voice' ? '语音太长了，请说短一点（1 分钟以内）' : '图片太大了，请换一张');
  const buf = Buffer.from(await f.arrayBuffer());
  if (kind === 'image') return uploadImage('jobs', buf, { maxSide });
  if (!blobConfigured()) throw new CrmError('storage_unconfigured', '文件存储还没有配置');
  const ext = AUDIO[(f.type || '').toLowerCase()];
  if (!ext) throw new CrmError('bad_request', '语音格式不支持，请用手机自带录音');
  const r = await put(`${BLOB_PREFIX}/jobs-voice/${randomUUID()}.${ext}`, buf, { access: 'public', contentType: f.type, addRandomSuffix: false });
  return r.url;
}
