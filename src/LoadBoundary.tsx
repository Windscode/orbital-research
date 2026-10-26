import {Component} from 'react';
import type {ErrorInfo,ReactNode} from 'react';
export default class LoadBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(_error:Error,_info:ErrorInfo){/* Keep the recovery UI available if a deferred asset cannot load. */}
 render(){return this.state.failed?<main className="load-recovery"><span className="eyebrow">ORBITAL / RECOVER</span><h1>这个页面暂时没有加载完成。</h1><p>请确认本地服务仍在运行，再重新加载。刷新会放弃当前未保存的编辑。</p><button className="button primary" onClick={()=>location.reload()}>重新加载页面</button></main>:this.props.children;}
}
