/**
 * 1.3.3 小程序邀请海报改服务器出图：活动设了官方海报时，用同一张主视觉和同样的排字；
 * 区别只有两处：右下角是这位会员的专属小程序码（scene 带本人推荐码，沿用原逻辑），片名和日期之间加“某某 邀请您”。
 * 没设官方海报返回 null，小程序退回原来的手机现画样式。结果按内容指纹存 Blob，首次出图后直接取缓存。
 */
import { createHash } from 'node:crypto';
import { head, put } from '@vercel/blob';
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { BLOB_PREFIX, blobConfigured } from '@/lib/crm/photos';
import { wxConfigured } from '@/lib/crm/wechat';
import { inviteCodePng, inviterInfo } from '@/lib/crm/cards';
import { officialVersion, renderOfficial } from '@/lib/poster/service';
import { toJpegMarked } from '@/lib/poster/compose';

const RENDER_V = 1; // 改了邀请海报排法就加 1，旧缓存作废

async function eventBySlug(slug: string) {
  const { rows } = await getPool().query<{ id: string; slug: string }>(`SELECT id, slug FROM events WHERE slug = $1`, [slug]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这场活动');
  return rows[0];
}

/** 这位会员这场活动的邀请海报版本（没设官方海报 → null） */
export async function inviteVersion(contactId: string, slug: string): Promise<string | null> {
  const ev = await eventBySlug(slug);
  const ov = await officialVersion(ev.id);
  if (!ov) return null;
  const who = await inviterInfo(contactId);
  return createHash('sha256').update(JSON.stringify([RENDER_V, ov, who.memberNo, who.name, who.label, who.avatarUrl, wxConfigured()])).digest('hex').slice(0, 24);
}

export async function invitePosterImage(contactId: string, slug: string): Promise<{ jpg: Buffer; version: string; cached: boolean }> {
  const ev = await eventBySlug(slug);
  const version = await inviteVersion(contactId, slug);
  if (!version) throw new CrmError('no_official', '这场活动还没有官方海报');
  const path = `${BLOB_PREFIX}/invite-poster/${ev.id}/${version}.jpg`;
  if (blobConfigured()) {
    const hit = await head(path).catch(() => null);
    if (hit) {
      const r = await fetch(hit.url).catch(() => null);
      if (r?.ok) return { jpg: Buffer.from(await r.arrayBuffer()), version, cached: true };
    }
  }
  const who = await inviterInfo(contactId);
  const [qr, avatar] = await Promise.all([
    inviteCodePng(slug, who.memberNo),
    who.avatarUrl ? fetch(who.avatarUrl).then((r) => (r.ok ? r.arrayBuffer().then((b) => Buffer.from(b)) : null)).catch(() => null) : Promise.resolve(null)
  ]);
  const out = await renderOfficial(ev.id, 'tall', { qr, name: who.name || 'SAREC 会员', label: who.label, avatar });
  if (!out) throw new CrmError('no_official', '这场活动还没有官方海报');
  const jpg = await toJpegMarked(out.png, out.ai ? `${ev.id}:${version}` : null, 90);
  if (blobConfigured()) await put(path, jpg, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false }).catch(() => undefined);
  return { jpg, version, cached: false };
}
