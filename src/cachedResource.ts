/** Share in-flight reads, cache successful data, and allow an explicit retry after failure. */
export function cachedResource<T>(read:()=>Promise<T>){
 let value:T|undefined;
 let pending:Promise<T>|undefined;
 return {
  peek:()=>value,
  load:()=>{
   if(value!==undefined)return Promise.resolve(value);
   if(!pending)pending=Promise.resolve().then(read).then(result=>{value=result;return result;}).catch(error=>{pending=undefined;throw error;});
   return pending;
  }
 };
}
