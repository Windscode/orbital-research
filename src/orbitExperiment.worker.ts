import {runOrbitExperiment} from './orbitExperiment';
import type {ExperimentConfig} from './orbitExperiment';
self.onmessage=(event:MessageEvent<{config:ExperimentConfig}>)=>{
 try{self.postMessage({ok:true,result:runOrbitExperiment(event.data.config)});}
 catch(error){self.postMessage({ok:false,error:error instanceof Error?error.message:'数值实验未完成'});}
};
