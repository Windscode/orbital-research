import type {Resource} from './types';
export const accessLabels={open:'开放与科研工具',source:'源码可见 · 有限制',commercial:'商业软件',restricted:'申请与受限使用',data:'公开数据',standard:'标准与规范'};
export function resourceAccess(r:Resource):keyof typeof accessLabels{
 if(r.accessModel)return r.accessModel;
 if(r.kind==='公开数据')return 'data';
 if(/标准|规范/.test(r.kind))return 'standard';
 if(!/开源|GPL|MIT|Apache|BSD|LGPL|MPL|公开标准/i.test(r.license)&&/商业|专有|付费/.test(r.license))return 'commercial';
 return 'open';
}
