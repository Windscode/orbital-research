import {ArrowUpRight} from 'lucide-react';
import type {Vehicle} from './types';
export default function VehicleModelRecord({vehicle}:{vehicle:Vehicle}){
 const review=vehicle.model?.review;if(!review)return null;
 return <section className="vehicle-configuration-record"><span>MODEL CONFIGURATION / {review.reviewedOn}</span><h3>{review.configuration}</h3><p>三维模型采用这一构型。以下特征对应公开资料中的系统关系；几何尺寸、内部位置与材料不由这些文字自动确定。</p><div className="vehicle-configuration-features">{review.features.map(feature=><article key={feature.title}><h4>{feature.title}</h4><p>{feature.detail}</p><a href={feature.sourceUrl} target="_blank" rel="noreferrer">核对构型资料<ArrowUpRight size={12}/></a></article>)}</div><details><summary>建模假设与未确定项 · {review.uncertainties.length}</summary><ul>{review.uncertainties.map(item=><li key={item}>{item}</li>)}</ul></details></section>;
}
