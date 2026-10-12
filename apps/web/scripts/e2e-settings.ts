export const e2ePort = Number(process.env.HORIZON_E2E_PORT || 4176);
if (!Number.isInteger(e2ePort) || e2ePort < 1 || e2ePort > 65535)
  throw Error('HORIZON_E2E_PORT 必须是 1 到 65535 之间的整数');
export const e2eURL = `http://127.0.0.1:${e2ePort}`;
