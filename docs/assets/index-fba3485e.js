(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))n(t);new MutationObserver(t=>{for(const e of t)if(e.type==="childList")for(const s of e.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function i(t){const e={};return t.integrity&&(e.integrity=t.integrity),t.referrerPolicy&&(e.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?e.credentials="include":t.crossOrigin==="anonymous"?e.credentials="omit":e.credentials="same-origin",e}function n(t){if(t.ep)return;t.ep=!0;const e=i(t);fetch(t.href,e)}})();const S=""+new URL("A-c5f6de80.png",import.meta.url).href,_=""+new URL("B-69c7dc64.png",import.meta.url).href;async function A(){const r=document.getElementById("a"),o=new Image;o.src=S,await o.decode(),r.width=o.width,r.height=o.height;const i=r.getContext("2d");if(i===null)return;i.drawImage(o,0,0);const n=document.getElementById("b"),t=new Image;t.src=_,await t.decode(),n.width=o.width,n.height=o.height;const e=n.getContext("2d");if(e===null)return;e.fillStyle="white",e.fillRect(0,0,n.width,n.height),e.drawImage(t,0,0);const s=i.getImageData(0,0,r.width,r.height),l=cv.matFromImageData(s),a=e.getImageData(0,0,n.width,n.height),c=cv.matFromImageData(a);T(l,c);const m=O(c,l),u=O(l,c);try{const d=document.getElementById("contourArea"),f=d!=null?parseInt(d.value):1/0,v=2,R=255;for(const g of u)if(cv.contourArea(g)<f){let B=new cv.Scalar(102,194,165,R);{let h=new cv.Mat;cv.convexHull(g,h,!1,!0);let M=cv.LINE_8;const p=new cv.MatVector;p.push_back(h),cv.drawContours(c,p,0,B,v,M)}}for(const g of m)if(cv.contourArea(g)<f){let B=new cv.Scalar(240,82,104,R);{let h=new cv.Mat;cv.convexHull(g,h,!1,!0);let M=cv.LINE_8;const p=new cv.MatVector;p.push_back(h),cv.drawContours(l,p,0,B,v,M)}}const C=document.getElementById("transparency"),b=C!=null?parseFloat(C.value):0;let L=new cv.Mat,D=-1;cv.addWeighted(c,.5+b,l,.5-b,0,L,D),cv.imshow("diff",L)}catch(d){console.error(d)}l.delete(),c.delete()}cv.getBuildInformation?A():(console.log("WASM"),cv.onRuntimeInitialized=()=>{A()});const y=document.getElementById("syncIterations"),w=document.getElementById("dilateIterations"),E=document.getElementById("erodeIterations");y.addEventListener("change",()=>{y.checked&&(E.value=w.value)});w.addEventListener("input",()=>{y.checked&&(E.value=w.value)});E.addEventListener("input",()=>{y.checked&&(w.value=E.value)});let I;[document.getElementById("dilateIterations"),document.getElementById("erodeIterations"),document.getElementById("contourArea"),document.getElementById("transparency")].forEach(r=>{r!==null&&r.addEventListener("input",()=>{I!==void 0&&clearTimeout(I),I=setTimeout(()=>{A(),I=void 0},700)})});function O(r,o){let i=new cv.Mat;cv.subtract(r,o,i);const n=new cv.Mat;cv.cvtColor(i,n,cv.COLOR_BGR2GRAY);const t=1,e=new cv.Mat;cv.threshold(n,e,t,255,cv.THRESH_BINARY),cv.imshow("mask",e);const s=cv.Mat.ones(3,3,cv.CV_8U),l=new cv.Mat;let a=document.getElementById("dilateIterations"),c=a!=null?parseInt(a.value):2;cv.dilate(e,l,s,new cv.Point(-1,-1),c,cv.BORDER_CONSTANT,cv.morphologyDefaultBorderValue()),cv.imshow("dilate",l);const m=new cv.Mat;a=document.getElementById("erodeIterations"),c=a!=null?parseInt(a.value):2,cv.erode(l,m,s,new cv.Point(-1,-1),c,cv.BORDER_CONSTANT,cv.morphologyDefaultBorderValue()),cv.imshow("erode",m);const u=new cv.MatVector,d=new cv.Mat;cv.findContours(m,u,d,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);const f=[];for(let v=0;v<u.size();v++)f.push(u.get(v));return f}function T(r,o){const i=new cv.ORB,n=new cv.KeyPointVector,t=new cv.KeyPointVector,e=new cv.Mat,s=new cv.Mat;i.detectAndCompute(r,new cv.Mat,n,e),i.detectAndCompute(o,new cv.Mat,t,s);const l=new cv.BFMatcher(cv.NORM_HAMMING,!0),a=new cv.DMatchVector;l.match(e,s,a);let c=0;for(let d=0;d<a.size();d++)c+=a.get(d).distance;c/=a.size();const m=32*8;c/=m,console.log("matchScore",c);const u=document.getElementById("score");u!==null&&(u.innerText=c.toFixed(3)),n.delete(),t.delete(),e.delete(),s.delete(),a.delete()}