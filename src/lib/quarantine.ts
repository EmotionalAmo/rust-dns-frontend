import { clientGroupsApi } from '@/api/clientGroups';
import { rulesApi } from '@/api/rules';
import { clientsApi } from '@/api/clients';

const QUARANTINE_GROUP_NAME = '隔离区';
const QUARANTINE_RULE = '||*^';

export async function quarantineDevice(ip: string): Promise<void> {
  // Step 1: 查找或创建隔离区分组
  const groups = await clientGroupsApi.list();
  let quarantineGroup = groups.find((g) => g.name === QUARANTINE_GROUP_NAME);

  if (!quarantineGroup) {
    quarantineGroup = await clientGroupsApi.create({
      name: QUARANTINE_GROUP_NAME,
      color: '#ef4444',
      description: '异常设备隔离区，所有 DNS 查询被拦截',
      priority: 1,
    });
  }

  const groupId = quarantineGroup.id;

  // Step 3: 查找封锁规则是否已绑定
  const rulesResult = await clientGroupsApi.getRules(groupId, { rule_type: 'custom_rule' });
  const existingRule = rulesResult.data.find((r) => r.rule === QUARANTINE_RULE);

  if (!existingRule) {
    // Step 4a: 创建封锁规则
    const newRule = await rulesApi.createRule({
      rule: QUARANTINE_RULE,
      comment: '隔离区封锁规则：拦截所有域名',
    });

    // Step 4b: 绑定规则到分组
    await clientGroupsApi.bindRules(groupId, {
      rules: [{ rule_id: newRule.id, rule_type: 'custom_rule' }],
    });
  }

  // Step 5: 尝试注册客户端
  let clientId: string;
  try {
    const created = await clientsApi.create({
      name: ip,
      identifiers: [ip],
      filter_enabled: true,
    });
    clientId = created.id;
  } catch {
    // Step 6: 409 或其他错误，从列表中查找
    const allClients = await clientsApi.list();
    const found = allClients.find((c) => c.identifiers.includes(ip));
    if (!found) {
      throw new Error(`Client with IP ${ip} not found`);
    }
    clientId = found.id;
  }

  // Step 7: 将客户端加入隔离区
  await clientGroupsApi.addMembers(groupId, { client_ids: [clientId] });
}
