// 视界的品牌配置；index.html 保留同名初始标题。
export const CONFIG = {
  brand: {
    name: '视界',
    nameEn: 'Horizon',
    sub: '',
    tagline: '个人知识与记录',
    taglineEn: 'A personal space for notes and ideas',
  },
  // 图谱中心节点的名字
  workspace: '知识宇宙',
  // 头像放在 public/ 下，填相对路径
  avatar: 'avatar.svg',
  footer: { zh: '每一篇笔记，都是网络里的一个节点。', en: 'Every note is a node in the network.' },
};

// public/ 下的素材路径（兼容部署在子路径，如 GitHub Pages）
export const asset = (path: string) => import.meta.env.BASE_URL + path;
