/**
 * 一次性：把现有会员申请按邮箱关联到客户档案（D.4）。可重复运行，已关联的跳过。
 * 用法：DATABASE_URL=... pnpm dlx tsx scripts/link-applications-to-contacts.ts
 */
import { getPool } from '@/lib/db/client';
import { linkApplicationsToContacts } from '@/lib/crm/membership';
import { guardNotProduction } from './_guard';

guardNotProduction();
linkApplicationsToContacts()
  .then(async (r) => {
    console.log(`已关联 ${r.linked} 份申请，其中新建档案 ${r.created} 份`);
    await getPool().end();
  })
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
