(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function e(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(s){if(s.ep)return;s.ep=!0;const r=e(s);fetch(s.href,r)}})();/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Zo="170",Ci={ROTATE:0,DOLLY:1,PAN:2},wi={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},wh=0,Ma=1,Rh=2,sc=1,Ch=2,_n=3,Hn=0,Pe=1,vn=2,Sn=0,ei=1,er=2,ya=3,Sa=4,Ph=5,Kn=100,Lh=101,Dh=102,Ih=103,Uh=104,Nh=200,Fh=201,Oh=202,Bh=203,no=204,io=205,kh=206,zh=207,Hh=208,Gh=209,Vh=210,Wh=211,Xh=212,$h=213,Yh=214,so=0,ro=1,oo=2,Ui=3,ao=4,lo=5,co=6,ho=7,rc=0,qh=1,jh=2,zn=0,oc=1,ac=2,lc=3,cc=4,Kh=5,hc=6,uc=7,dc=300,Ni=301,Fi=302,uo=303,fo=304,ar=306,po=1e3,Qn=1001,mo=1002,tn=1003,Zh=1004,xs=1005,an=1006,gr=1007,ti=1008,An=1009,fc=1010,pc=1011,os=1012,Jo=1013,si=1014,Mn=1015,En=1016,Qo=1017,ta=1018,Oi=1020,mc=35902,gc=1021,_c=1022,Je=1023,xc=1024,vc=1025,Pi=1026,Bi=1027,Mc=1028,ea=1029,yc=1030,na=1031,ia=1033,$s=33776,Ys=33777,qs=33778,js=33779,go=35840,_o=35841,xo=35842,vo=35843,Mo=36196,yo=37492,So=37496,Eo=37808,To=37809,bo=37810,Ao=37811,wo=37812,Ro=37813,Co=37814,Po=37815,Lo=37816,Do=37817,Io=37818,Uo=37819,No=37820,Fo=37821,Ks=36492,Oo=36494,Bo=36495,Sc=36283,ko=36284,zo=36285,Ho=36286,Jh=3200,Qh=3201,tu=0,eu=1,Bn="",Ge="srgb",zi="srgb-linear",lr="linear",ne="srgb",ui=7680,Ea=519,nu=512,iu=513,su=514,Ec=515,ru=516,ou=517,au=518,lu=519,Ta=35044,ba="300 es",yn=2e3,nr=2001;class li{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[t]===void 0&&(i[t]=[]),i[t].indexOf(e)===-1&&i[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const i=this._listeners;return i[t]!==void 0&&i[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const s=this._listeners[t];if(s!==void 0){const r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const i=this._listeners[t.type];if(i!==void 0){t.target=this;const s=i.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,t);t.target=null}}}const ye=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Zs=Math.PI/180,Go=180/Math.PI;function hs(){const n=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(ye[n&255]+ye[n>>8&255]+ye[n>>16&255]+ye[n>>24&255]+"-"+ye[t&255]+ye[t>>8&255]+"-"+ye[t>>16&15|64]+ye[t>>24&255]+"-"+ye[e&63|128]+ye[e>>8&255]+"-"+ye[e>>16&255]+ye[e>>24&255]+ye[i&255]+ye[i>>8&255]+ye[i>>16&255]+ye[i>>24&255]).toLowerCase()}function Ae(n,t,e){return Math.max(t,Math.min(e,n))}function cu(n,t){return(n%t+t)%t}function _r(n,t,e){return(1-e)*n+e*t}function qi(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function Re(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}const hu={DEG2RAD:Zs};class Ft{constructor(t=0,e=0){Ft.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,i=this.y,s=t.elements;return this.x=s[0]*e+s[3]*i+s[6],this.y=s[1]*e+s[4]*i+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(t,Math.min(e,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const i=this.dot(t)/e;return Math.acos(Ae(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,i=this.y-t.y;return e*e+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const i=Math.cos(e),s=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*i-o*s+t.x,this.y=r*s+o*i+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Vt{constructor(t,e,i,s,r,o,a,l,c){Vt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,i,s,r,o,a,l,c)}set(t,e,i,s,r,o,a,l,c){const h=this.elements;return h[0]=t,h[1]=s,h[2]=a,h[3]=e,h[4]=r,h[5]=l,h[6]=i,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],this}extractBasis(t,e,i){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const i=t.elements,s=e.elements,r=this.elements,o=i[0],a=i[3],l=i[6],c=i[1],h=i[4],u=i[7],d=i[2],m=i[5],g=i[8],x=s[0],p=s[3],f=s[6],E=s[1],T=s[4],M=s[7],N=s[2],b=s[5],C=s[8];return r[0]=o*x+a*E+l*N,r[3]=o*p+a*T+l*b,r[6]=o*f+a*M+l*C,r[1]=c*x+h*E+u*N,r[4]=c*p+h*T+u*b,r[7]=c*f+h*M+u*C,r[2]=d*x+m*E+g*N,r[5]=d*p+m*T+g*b,r[8]=d*f+m*M+g*C,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8];return e*o*h-e*a*c-i*r*h+i*a*l+s*r*c-s*o*l}invert(){const t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=h*o-a*c,d=a*l-h*r,m=c*r-o*l,g=e*u+i*d+s*m;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const x=1/g;return t[0]=u*x,t[1]=(s*c-h*i)*x,t[2]=(a*i-s*o)*x,t[3]=d*x,t[4]=(h*e-s*l)*x,t[5]=(s*r-a*e)*x,t[6]=m*x,t[7]=(i*l-c*e)*x,t[8]=(o*e-i*r)*x,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,i,s,r,o,a){const l=Math.cos(r),c=Math.sin(r);return this.set(i*l,i*c,-i*(l*o+c*a)+o+t,-s*c,s*l,-s*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return this.premultiply(xr.makeScale(t,e)),this}rotate(t){return this.premultiply(xr.makeRotation(-t)),this}translate(t,e){return this.premultiply(xr.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,i,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,i=t.elements;for(let s=0;s<9;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<9;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){const i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const xr=new Vt;function Tc(n){for(let t=n.length-1;t>=0;--t)if(n[t]>=65535)return!0;return!1}function ir(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function uu(){const n=ir("canvas");return n.style.display="block",n}const Aa={};function Qi(n){n in Aa||(Aa[n]=!0,console.warn(n))}function du(n,t,e){return new Promise(function(i,s){function r(){switch(n.clientWaitSync(t,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:s();break;case n.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:i()}}setTimeout(r,e)})}function fu(n){const t=n.elements;t[2]=.5*t[2]+.5*t[3],t[6]=.5*t[6]+.5*t[7],t[10]=.5*t[10]+.5*t[11],t[14]=.5*t[14]+.5*t[15]}function pu(n){const t=n.elements;t[11]===-1?(t[10]=-t[10]-1,t[14]=-t[14]):(t[10]=-t[10],t[14]=-t[14]+1)}const jt={enabled:!0,workingColorSpace:zi,spaces:{},convert:function(n,t,e){return this.enabled===!1||t===e||!t||!e||(this.spaces[t].transfer===ne&&(n.r=Tn(n.r),n.g=Tn(n.g),n.b=Tn(n.b)),this.spaces[t].primaries!==this.spaces[e].primaries&&(n.applyMatrix3(this.spaces[t].toXYZ),n.applyMatrix3(this.spaces[e].fromXYZ)),this.spaces[e].transfer===ne&&(n.r=Li(n.r),n.g=Li(n.g),n.b=Li(n.b))),n},fromWorkingColorSpace:function(n,t){return this.convert(n,this.workingColorSpace,t)},toWorkingColorSpace:function(n,t){return this.convert(n,t,this.workingColorSpace)},getPrimaries:function(n){return this.spaces[n].primaries},getTransfer:function(n){return n===Bn?lr:this.spaces[n].transfer},getLuminanceCoefficients:function(n,t=this.workingColorSpace){return n.fromArray(this.spaces[t].luminanceCoefficients)},define:function(n){Object.assign(this.spaces,n)},_getMatrix:function(n,t,e){return n.copy(this.spaces[t].toXYZ).multiply(this.spaces[e].fromXYZ)},_getDrawingBufferColorSpace:function(n){return this.spaces[n].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(n=this.workingColorSpace){return this.spaces[n].workingColorSpaceConfig.unpackColorSpace}};function Tn(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function Li(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}const wa=[.64,.33,.3,.6,.15,.06],Ra=[.2126,.7152,.0722],Ca=[.3127,.329],Pa=new Vt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),La=new Vt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);jt.define({[zi]:{primaries:wa,whitePoint:Ca,transfer:lr,toXYZ:Pa,fromXYZ:La,luminanceCoefficients:Ra,workingColorSpaceConfig:{unpackColorSpace:Ge},outputColorSpaceConfig:{drawingBufferColorSpace:Ge}},[Ge]:{primaries:wa,whitePoint:Ca,transfer:ne,toXYZ:Pa,fromXYZ:La,luminanceCoefficients:Ra,outputColorSpaceConfig:{drawingBufferColorSpace:Ge}}});let di;class mu{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{di===void 0&&(di=ir("canvas")),di.width=t.width,di.height=t.height;const i=di.getContext("2d");t instanceof ImageData?i.putImageData(t,0,0):i.drawImage(t,0,0,t.width,t.height),e=di}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=ir("canvas");e.width=t.width,e.height=t.height;const i=e.getContext("2d");i.drawImage(t,0,0,t.width,t.height);const s=i.getImageData(0,0,t.width,t.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Tn(r[o]/255)*255;return i.putImageData(s,0,0),e}else if(t.data){const e=t.data.slice(0);for(let i=0;i<e.length;i++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[i]=Math.floor(Tn(e[i]/255)*255):e[i]=Tn(e[i]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let gu=0;class bc{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:gu++}),this.uuid=hs(),this.data=t,this.dataReady=!0,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(vr(s[o].image)):r.push(vr(s[o]))}else r=vr(s);i.url=r}return e||(t.images[this.uuid]=i),i}}function vr(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?mu.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let _u=0;class Le extends li{constructor(t=Le.DEFAULT_IMAGE,e=Le.DEFAULT_MAPPING,i=Qn,s=Qn,r=an,o=ti,a=Je,l=An,c=Le.DEFAULT_ANISOTROPY,h=Bn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:_u++}),this.uuid=hs(),this.name="",this.source=new bc(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Ft(0,0),this.repeat=new Ft(1,1),this.center=new Ft(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Vt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),e||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==dc)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case po:t.x=t.x-Math.floor(t.x);break;case Qn:t.x=t.x<0?0:1;break;case mo:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case po:t.y=t.y-Math.floor(t.y);break;case Qn:t.y=t.y<0?0:1;break;case mo:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}Le.DEFAULT_IMAGE=null;Le.DEFAULT_MAPPING=dc;Le.DEFAULT_ANISOTROPY=1;class he{constructor(t=0,e=0,i=0,s=1){he.prototype.isVector4=!0,this.x=t,this.y=e,this.z=i,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,i,s){return this.x=t,this.y=e,this.z=i,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,i=this.y,s=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*i+o[8]*s+o[12]*r,this.y=o[1]*e+o[5]*i+o[9]*s+o[13]*r,this.z=o[2]*e+o[6]*i+o[10]*s+o[14]*r,this.w=o[3]*e+o[7]*i+o[11]*s+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,i,s,r;const l=t.elements,c=l[0],h=l[4],u=l[8],d=l[1],m=l[5],g=l[9],x=l[2],p=l[6],f=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-x)<.01&&Math.abs(g-p)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+x)<.1&&Math.abs(g+p)<.1&&Math.abs(c+m+f-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const T=(c+1)/2,M=(m+1)/2,N=(f+1)/2,b=(h+d)/4,C=(u+x)/4,L=(g+p)/4;return T>M&&T>N?T<.01?(i=0,s=.707106781,r=.707106781):(i=Math.sqrt(T),s=b/i,r=C/i):M>N?M<.01?(i=.707106781,s=0,r=.707106781):(s=Math.sqrt(M),i=b/s,r=L/s):N<.01?(i=.707106781,s=.707106781,r=0):(r=Math.sqrt(N),i=C/r,s=L/r),this.set(i,s,r,e),this}let E=Math.sqrt((p-g)*(p-g)+(u-x)*(u-x)+(d-h)*(d-h));return Math.abs(E)<.001&&(E=1),this.x=(p-g)/E,this.y=(u-x)/E,this.z=(d-h)/E,this.w=Math.acos((c+m+f-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this.w=Math.max(t.w,Math.min(e.w,this.w)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this.w=Math.max(t,Math.min(e,this.w)),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(t,Math.min(e,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this.w=t.w+(e.w-t.w)*i,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class xu extends li{constructor(t=1,e=1,i={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new he(0,0,t,e),this.scissorTest=!1,this.viewport=new he(0,0,t,e);const s={width:t,height:e,depth:1};i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:an,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},i);const r=new Le(s,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace);r.flipY=!1,r.generateMipmaps=i.generateMipmaps,r.internalFormat=i.internalFormat,this.textures=[];const o=i.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0;this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.depthTexture=i.depthTexture,this.samples=i.samples}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}setSize(t,e,i=1){if(this.width!==t||this.height!==e||this.depth!==i){this.width=t,this.height=e,this.depth=i;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=i;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let i=0,s=t.textures.length;i<s;i++)this.textures[i]=t.textures[i].clone(),this.textures[i].isRenderTargetTexture=!0;const e=Object.assign({},t.texture.image);return this.texture.source=new bc(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class en extends xu{constructor(t=1,e=1,i={}){super(t,e,i),this.isWebGLRenderTarget=!0}}class Ac extends Le{constructor(t=null,e=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=tn,this.minFilter=tn,this.wrapR=Qn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class vu extends Le{constructor(t=null,e=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=tn,this.minFilter=tn,this.wrapR=Qn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class cn{constructor(t=0,e=0,i=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=i,this._w=s}static slerpFlat(t,e,i,s,r,o,a){let l=i[s+0],c=i[s+1],h=i[s+2],u=i[s+3];const d=r[o+0],m=r[o+1],g=r[o+2],x=r[o+3];if(a===0){t[e+0]=l,t[e+1]=c,t[e+2]=h,t[e+3]=u;return}if(a===1){t[e+0]=d,t[e+1]=m,t[e+2]=g,t[e+3]=x;return}if(u!==x||l!==d||c!==m||h!==g){let p=1-a;const f=l*d+c*m+h*g+u*x,E=f>=0?1:-1,T=1-f*f;if(T>Number.EPSILON){const N=Math.sqrt(T),b=Math.atan2(N,f*E);p=Math.sin(p*b)/N,a=Math.sin(a*b)/N}const M=a*E;if(l=l*p+d*M,c=c*p+m*M,h=h*p+g*M,u=u*p+x*M,p===1-a){const N=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=N,c*=N,h*=N,u*=N}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=u}static multiplyQuaternionsFlat(t,e,i,s,r,o){const a=i[s],l=i[s+1],c=i[s+2],h=i[s+3],u=r[o],d=r[o+1],m=r[o+2],g=r[o+3];return t[e]=a*g+h*u+l*m-c*d,t[e+1]=l*g+h*d+c*u-a*m,t[e+2]=c*g+h*m+a*d-l*u,t[e+3]=h*g-a*u-l*d-c*m,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,i,s){return this._x=t,this._y=e,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const i=t._x,s=t._y,r=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(i/2),h=a(s/2),u=a(r/2),d=l(i/2),m=l(s/2),g=l(r/2);switch(o){case"XYZ":this._x=d*h*u+c*m*g,this._y=c*m*u-d*h*g,this._z=c*h*g+d*m*u,this._w=c*h*u-d*m*g;break;case"YXZ":this._x=d*h*u+c*m*g,this._y=c*m*u-d*h*g,this._z=c*h*g-d*m*u,this._w=c*h*u+d*m*g;break;case"ZXY":this._x=d*h*u-c*m*g,this._y=c*m*u+d*h*g,this._z=c*h*g+d*m*u,this._w=c*h*u-d*m*g;break;case"ZYX":this._x=d*h*u-c*m*g,this._y=c*m*u+d*h*g,this._z=c*h*g-d*m*u,this._w=c*h*u+d*m*g;break;case"YZX":this._x=d*h*u+c*m*g,this._y=c*m*u+d*h*g,this._z=c*h*g-d*m*u,this._w=c*h*u-d*m*g;break;case"XZY":this._x=d*h*u-c*m*g,this._y=c*m*u-d*h*g,this._z=c*h*g+d*m*u,this._w=c*h*u+d*m*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const i=e/2,s=Math.sin(i);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,i=e[0],s=e[4],r=e[8],o=e[1],a=e[5],l=e[9],c=e[2],h=e[6],u=e[10],d=i+a+u;if(d>0){const m=.5/Math.sqrt(d+1);this._w=.25/m,this._x=(h-l)*m,this._y=(r-c)*m,this._z=(o-s)*m}else if(i>a&&i>u){const m=2*Math.sqrt(1+i-a-u);this._w=(h-l)/m,this._x=.25*m,this._y=(s+o)/m,this._z=(r+c)/m}else if(a>u){const m=2*Math.sqrt(1+a-i-u);this._w=(r-c)/m,this._x=(s+o)/m,this._y=.25*m,this._z=(l+h)/m}else{const m=2*Math.sqrt(1+u-i-a);this._w=(o-s)/m,this._x=(r+c)/m,this._y=(l+h)/m,this._z=.25*m}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let i=t.dot(e)+1;return i<Number.EPSILON?(i=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=i):(this._x=0,this._y=-t.z,this._z=t.y,this._w=i)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=i),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Ae(this.dot(t),-1,1)))}rotateTowards(t,e){const i=this.angleTo(t);if(i===0)return this;const s=Math.min(1,e/i);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const i=t._x,s=t._y,r=t._z,o=t._w,a=e._x,l=e._y,c=e._z,h=e._w;return this._x=i*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-i*c,this._z=r*h+o*c+i*l-s*a,this._w=o*h-i*a-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const i=this._x,s=this._y,r=this._z,o=this._w;let a=o*t._w+i*t._x+s*t._y+r*t._z;if(a<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,a=-a):this.copy(t),a>=1)return this._w=o,this._x=i,this._y=s,this._z=r,this;const l=1-a*a;if(l<=Number.EPSILON){const m=1-e;return this._w=m*o+e*this._w,this._x=m*i+e*this._x,this._y=m*s+e*this._y,this._z=m*r+e*this._z,this.normalize(),this}const c=Math.sqrt(l),h=Math.atan2(c,a),u=Math.sin((1-e)*h)/c,d=Math.sin(e*h)/c;return this._w=o*u+this._w*d,this._x=i*u+this._x*d,this._y=s*u+this._y*d,this._z=r*u+this._z*d,this._onChangeCallback(),this}slerpQuaternions(t,e,i){return this.copy(t).slerp(e,i)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),i=Math.random(),s=Math.sqrt(1-i),r=Math.sqrt(i);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class H{constructor(t=0,e=0,i=0){H.prototype.isVector3=!0,this.x=t,this.y=e,this.z=i}set(t,e,i){return i===void 0&&(i=this.z),this.x=t,this.y=e,this.z=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Da.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Da.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,i=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*i+r[6]*s,this.y=r[1]*e+r[4]*i+r[7]*s,this.z=r[2]*e+r[5]*i+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,i=this.y,s=this.z,r=t.elements,o=1/(r[3]*e+r[7]*i+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*i+r[8]*s+r[12])*o,this.y=(r[1]*e+r[5]*i+r[9]*s+r[13])*o,this.z=(r[2]*e+r[6]*i+r[10]*s+r[14])*o,this}applyQuaternion(t){const e=this.x,i=this.y,s=this.z,r=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*s-a*i),h=2*(a*e-r*s),u=2*(r*i-o*e);return this.x=e+l*c+o*u-a*h,this.y=i+l*h+a*c-r*u,this.z=s+l*u+r*h-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,i=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*i+r[8]*s,this.y=r[1]*e+r[5]*i+r[9]*s,this.z=r[2]*e+r[6]*i+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(t,Math.min(e,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const i=t.x,s=t.y,r=t.z,o=e.x,a=e.y,l=e.z;return this.x=s*l-r*a,this.y=r*o-i*l,this.z=i*a-s*o,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const i=t.dot(this)/e;return this.copy(t).multiplyScalar(i)}projectOnPlane(t){return Mr.copy(this).projectOnVector(t),this.sub(Mr)}reflect(t){return this.sub(Mr.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const i=this.dot(t)/e;return Math.acos(Ae(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,i=this.y-t.y,s=this.z-t.z;return e*e+i*i+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,i){const s=Math.sin(e)*t;return this.x=s*Math.sin(i),this.y=Math.cos(e)*t,this.z=s*Math.cos(i),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,i){return this.x=t*Math.sin(e),this.y=i,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),i=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=i,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,i=Math.sqrt(1-e*e);return this.x=i*Math.cos(t),this.y=e,this.z=i*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Mr=new H,Da=new cn;class us{constructor(t=new H(1/0,1/0,1/0),e=new H(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e+=3)this.expandByPoint(Xe.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,i=t.count;e<i;e++)this.expandByPoint(Xe.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const i=Xe.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(i),this.max.copy(t).add(i),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const i=t.geometry;if(i!==void 0){const r=i.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,Xe):Xe.fromBufferAttribute(r,o),Xe.applyMatrix4(t.matrixWorld),this.expandByPoint(Xe);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),vs.copy(t.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),vs.copy(i.boundingBox)),vs.applyMatrix4(t.matrixWorld),this.union(vs)}const s=t.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Xe),Xe.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,i;return t.normal.x>0?(e=t.normal.x*this.min.x,i=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,i=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,i+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,i+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,i+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,i+=t.normal.z*this.min.z),e<=-t.constant&&i>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(ji),Ms.subVectors(this.max,ji),fi.subVectors(t.a,ji),pi.subVectors(t.b,ji),mi.subVectors(t.c,ji),Ln.subVectors(pi,fi),Dn.subVectors(mi,pi),Gn.subVectors(fi,mi);let e=[0,-Ln.z,Ln.y,0,-Dn.z,Dn.y,0,-Gn.z,Gn.y,Ln.z,0,-Ln.x,Dn.z,0,-Dn.x,Gn.z,0,-Gn.x,-Ln.y,Ln.x,0,-Dn.y,Dn.x,0,-Gn.y,Gn.x,0];return!yr(e,fi,pi,mi,Ms)||(e=[1,0,0,0,1,0,0,0,1],!yr(e,fi,pi,mi,Ms))?!1:(ys.crossVectors(Ln,Dn),e=[ys.x,ys.y,ys.z],yr(e,fi,pi,mi,Ms))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Xe).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Xe).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(dn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),dn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),dn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),dn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),dn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),dn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),dn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),dn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(dn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const dn=[new H,new H,new H,new H,new H,new H,new H,new H],Xe=new H,vs=new us,fi=new H,pi=new H,mi=new H,Ln=new H,Dn=new H,Gn=new H,ji=new H,Ms=new H,ys=new H,Vn=new H;function yr(n,t,e,i,s){for(let r=0,o=n.length-3;r<=o;r+=3){Vn.fromArray(n,r);const a=s.x*Math.abs(Vn.x)+s.y*Math.abs(Vn.y)+s.z*Math.abs(Vn.z),l=t.dot(Vn),c=e.dot(Vn),h=i.dot(Vn);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}const Mu=new us,Ki=new H,Sr=new H;class cr{constructor(t=new H,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const i=this.center;e!==void 0?i.copy(e):Mu.setFromPoints(t).getCenter(i);let s=0;for(let r=0,o=t.length;r<o;r++)s=Math.max(s,i.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const i=this.center.distanceToSquared(t);return e.copy(t),i>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Ki.subVectors(t,this.center);const e=Ki.lengthSq();if(e>this.radius*this.radius){const i=Math.sqrt(e),s=(i-this.radius)*.5;this.center.addScaledVector(Ki,s/i),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Sr.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Ki.copy(t.center).add(Sr)),this.expandByPoint(Ki.copy(t.center).sub(Sr))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const fn=new H,Er=new H,Ss=new H,In=new H,Tr=new H,Es=new H,br=new H;class sa{constructor(t=new H,e=new H(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,fn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const i=e.dot(this.direction);return i<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=fn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(fn.copy(this.origin).addScaledVector(this.direction,e),fn.distanceToSquared(t))}distanceSqToSegment(t,e,i,s){Er.copy(t).add(e).multiplyScalar(.5),Ss.copy(e).sub(t).normalize(),In.copy(this.origin).sub(Er);const r=t.distanceTo(e)*.5,o=-this.direction.dot(Ss),a=In.dot(this.direction),l=-In.dot(Ss),c=In.lengthSq(),h=Math.abs(1-o*o);let u,d,m,g;if(h>0)if(u=o*l-a,d=o*a-l,g=r*h,u>=0)if(d>=-g)if(d<=g){const x=1/h;u*=x,d*=x,m=u*(u+o*d+2*a)+d*(o*u+d+2*l)+c}else d=r,u=Math.max(0,-(o*d+a)),m=-u*u+d*(d+2*l)+c;else d=-r,u=Math.max(0,-(o*d+a)),m=-u*u+d*(d+2*l)+c;else d<=-g?(u=Math.max(0,-(-o*r+a)),d=u>0?-r:Math.min(Math.max(-r,-l),r),m=-u*u+d*(d+2*l)+c):d<=g?(u=0,d=Math.min(Math.max(-r,-l),r),m=d*(d+2*l)+c):(u=Math.max(0,-(o*r+a)),d=u>0?r:Math.min(Math.max(-r,-l),r),m=-u*u+d*(d+2*l)+c);else d=o>0?-r:r,u=Math.max(0,-(o*d+a)),m=-u*u+d*(d+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(Er).addScaledVector(Ss,d),m}intersectSphere(t,e){fn.subVectors(t.center,this.origin);const i=fn.dot(this.direction),s=fn.dot(fn)-i*i,r=t.radius*t.radius;if(s>r)return null;const o=Math.sqrt(r-s),a=i-o,l=i+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(t.normal)+t.constant)/e;return i>=0?i:null}intersectPlane(t,e){const i=this.distanceToPlane(t);return i===null?null:this.at(i,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let i,s,r,o,a,l;const c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(i=(t.min.x-d.x)*c,s=(t.max.x-d.x)*c):(i=(t.max.x-d.x)*c,s=(t.min.x-d.x)*c),h>=0?(r=(t.min.y-d.y)*h,o=(t.max.y-d.y)*h):(r=(t.max.y-d.y)*h,o=(t.min.y-d.y)*h),i>o||r>s||((r>i||isNaN(i))&&(i=r),(o<s||isNaN(s))&&(s=o),u>=0?(a=(t.min.z-d.z)*u,l=(t.max.z-d.z)*u):(a=(t.max.z-d.z)*u,l=(t.min.z-d.z)*u),i>l||a>s)||((a>i||i!==i)&&(i=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(i>=0?i:s,e)}intersectsBox(t){return this.intersectBox(t,fn)!==null}intersectTriangle(t,e,i,s,r){Tr.subVectors(e,t),Es.subVectors(i,t),br.crossVectors(Tr,Es);let o=this.direction.dot(br),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;In.subVectors(this.origin,t);const l=a*this.direction.dot(Es.crossVectors(In,Es));if(l<0)return null;const c=a*this.direction.dot(Tr.cross(In));if(c<0||l+c>o)return null;const h=-a*In.dot(br);return h<0?null:this.at(h/o,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ue{constructor(t,e,i,s,r,o,a,l,c,h,u,d,m,g,x,p){ue.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,i,s,r,o,a,l,c,h,u,d,m,g,x,p)}set(t,e,i,s,r,o,a,l,c,h,u,d,m,g,x,p){const f=this.elements;return f[0]=t,f[4]=e,f[8]=i,f[12]=s,f[1]=r,f[5]=o,f[9]=a,f[13]=l,f[2]=c,f[6]=h,f[10]=u,f[14]=d,f[3]=m,f[7]=g,f[11]=x,f[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ue().fromArray(this.elements)}copy(t){const e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],e[9]=i[9],e[10]=i[10],e[11]=i[11],e[12]=i[12],e[13]=i[13],e[14]=i[14],e[15]=i[15],this}copyPosition(t){const e=this.elements,i=t.elements;return e[12]=i[12],e[13]=i[13],e[14]=i[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,i){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(t,e,i){return this.set(t.x,e.x,i.x,0,t.y,e.y,i.y,0,t.z,e.z,i.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,i=t.elements,s=1/gi.setFromMatrixColumn(t,0).length(),r=1/gi.setFromMatrixColumn(t,1).length(),o=1/gi.setFromMatrixColumn(t,2).length();return e[0]=i[0]*s,e[1]=i[1]*s,e[2]=i[2]*s,e[3]=0,e[4]=i[4]*r,e[5]=i[5]*r,e[6]=i[6]*r,e[7]=0,e[8]=i[8]*o,e[9]=i[9]*o,e[10]=i[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,i=t.x,s=t.y,r=t.z,o=Math.cos(i),a=Math.sin(i),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(t.order==="XYZ"){const d=o*h,m=o*u,g=a*h,x=a*u;e[0]=l*h,e[4]=-l*u,e[8]=c,e[1]=m+g*c,e[5]=d-x*c,e[9]=-a*l,e[2]=x-d*c,e[6]=g+m*c,e[10]=o*l}else if(t.order==="YXZ"){const d=l*h,m=l*u,g=c*h,x=c*u;e[0]=d+x*a,e[4]=g*a-m,e[8]=o*c,e[1]=o*u,e[5]=o*h,e[9]=-a,e[2]=m*a-g,e[6]=x+d*a,e[10]=o*l}else if(t.order==="ZXY"){const d=l*h,m=l*u,g=c*h,x=c*u;e[0]=d-x*a,e[4]=-o*u,e[8]=g+m*a,e[1]=m+g*a,e[5]=o*h,e[9]=x-d*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){const d=o*h,m=o*u,g=a*h,x=a*u;e[0]=l*h,e[4]=g*c-m,e[8]=d*c+x,e[1]=l*u,e[5]=x*c+d,e[9]=m*c-g,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){const d=o*l,m=o*c,g=a*l,x=a*c;e[0]=l*h,e[4]=x-d*u,e[8]=g*u+m,e[1]=u,e[5]=o*h,e[9]=-a*h,e[2]=-c*h,e[6]=m*u+g,e[10]=d-x*u}else if(t.order==="XZY"){const d=o*l,m=o*c,g=a*l,x=a*c;e[0]=l*h,e[4]=-u,e[8]=c*h,e[1]=d*u+x,e[5]=o*h,e[9]=m*u-g,e[2]=g*u-m,e[6]=a*h,e[10]=x*u+d}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(yu,t,Su)}lookAt(t,e,i){const s=this.elements;return Ne.subVectors(t,e),Ne.lengthSq()===0&&(Ne.z=1),Ne.normalize(),Un.crossVectors(i,Ne),Un.lengthSq()===0&&(Math.abs(i.z)===1?Ne.x+=1e-4:Ne.z+=1e-4,Ne.normalize(),Un.crossVectors(i,Ne)),Un.normalize(),Ts.crossVectors(Ne,Un),s[0]=Un.x,s[4]=Ts.x,s[8]=Ne.x,s[1]=Un.y,s[5]=Ts.y,s[9]=Ne.y,s[2]=Un.z,s[6]=Ts.z,s[10]=Ne.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const i=t.elements,s=e.elements,r=this.elements,o=i[0],a=i[4],l=i[8],c=i[12],h=i[1],u=i[5],d=i[9],m=i[13],g=i[2],x=i[6],p=i[10],f=i[14],E=i[3],T=i[7],M=i[11],N=i[15],b=s[0],C=s[4],L=s[8],y=s[12],v=s[1],P=s[5],G=s[9],V=s[13],J=s[2],tt=s[6],Q=s[10],W=s[14],$=s[3],rt=s[7],vt=s[11],gt=s[15];return r[0]=o*b+a*v+l*J+c*$,r[4]=o*C+a*P+l*tt+c*rt,r[8]=o*L+a*G+l*Q+c*vt,r[12]=o*y+a*V+l*W+c*gt,r[1]=h*b+u*v+d*J+m*$,r[5]=h*C+u*P+d*tt+m*rt,r[9]=h*L+u*G+d*Q+m*vt,r[13]=h*y+u*V+d*W+m*gt,r[2]=g*b+x*v+p*J+f*$,r[6]=g*C+x*P+p*tt+f*rt,r[10]=g*L+x*G+p*Q+f*vt,r[14]=g*y+x*V+p*W+f*gt,r[3]=E*b+T*v+M*J+N*$,r[7]=E*C+T*P+M*tt+N*rt,r[11]=E*L+T*G+M*Q+N*vt,r[15]=E*y+T*V+M*W+N*gt,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],i=t[4],s=t[8],r=t[12],o=t[1],a=t[5],l=t[9],c=t[13],h=t[2],u=t[6],d=t[10],m=t[14],g=t[3],x=t[7],p=t[11],f=t[15];return g*(+r*l*u-s*c*u-r*a*d+i*c*d+s*a*m-i*l*m)+x*(+e*l*m-e*c*d+r*o*d-s*o*m+s*c*h-r*l*h)+p*(+e*c*u-e*a*m-r*o*u+i*o*m+r*a*h-i*c*h)+f*(-s*a*h-e*l*u+e*a*d+s*o*u-i*o*d+i*l*h)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,i){const s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=i),this}invert(){const t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=t[9],d=t[10],m=t[11],g=t[12],x=t[13],p=t[14],f=t[15],E=u*p*c-x*d*c+x*l*m-a*p*m-u*l*f+a*d*f,T=g*d*c-h*p*c-g*l*m+o*p*m+h*l*f-o*d*f,M=h*x*c-g*u*c+g*a*m-o*x*m-h*a*f+o*u*f,N=g*u*l-h*x*l-g*a*d+o*x*d+h*a*p-o*u*p,b=e*E+i*T+s*M+r*N;if(b===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const C=1/b;return t[0]=E*C,t[1]=(x*d*r-u*p*r-x*s*m+i*p*m+u*s*f-i*d*f)*C,t[2]=(a*p*r-x*l*r+x*s*c-i*p*c-a*s*f+i*l*f)*C,t[3]=(u*l*r-a*d*r-u*s*c+i*d*c+a*s*m-i*l*m)*C,t[4]=T*C,t[5]=(h*p*r-g*d*r+g*s*m-e*p*m-h*s*f+e*d*f)*C,t[6]=(g*l*r-o*p*r-g*s*c+e*p*c+o*s*f-e*l*f)*C,t[7]=(o*d*r-h*l*r+h*s*c-e*d*c-o*s*m+e*l*m)*C,t[8]=M*C,t[9]=(g*u*r-h*x*r-g*i*m+e*x*m+h*i*f-e*u*f)*C,t[10]=(o*x*r-g*a*r+g*i*c-e*x*c-o*i*f+e*a*f)*C,t[11]=(h*a*r-o*u*r-h*i*c+e*u*c+o*i*m-e*a*m)*C,t[12]=N*C,t[13]=(h*x*s-g*u*s+g*i*d-e*x*d-h*i*p+e*u*p)*C,t[14]=(g*a*s-o*x*s-g*i*l+e*x*l+o*i*p-e*a*p)*C,t[15]=(o*u*s-h*a*s+h*i*l-e*u*l-o*i*d+e*a*d)*C,this}scale(t){const e=this.elements,i=t.x,s=t.y,r=t.z;return e[0]*=i,e[4]*=s,e[8]*=r,e[1]*=i,e[5]*=s,e[9]*=r,e[2]*=i,e[6]*=s,e[10]*=r,e[3]*=i,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,i,s))}makeTranslation(t,e,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,i,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,e,-i,0,0,i,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,0,i,0,0,1,0,0,-i,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,0,i,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const i=Math.cos(e),s=Math.sin(e),r=1-i,o=t.x,a=t.y,l=t.z,c=r*o,h=r*a;return this.set(c*o+i,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+i,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+i,0,0,0,0,1),this}makeScale(t,e,i){return this.set(t,0,0,0,0,e,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,e,i,s,r,o){return this.set(1,i,r,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,i){const s=this.elements,r=e._x,o=e._y,a=e._z,l=e._w,c=r+r,h=o+o,u=a+a,d=r*c,m=r*h,g=r*u,x=o*h,p=o*u,f=a*u,E=l*c,T=l*h,M=l*u,N=i.x,b=i.y,C=i.z;return s[0]=(1-(x+f))*N,s[1]=(m+M)*N,s[2]=(g-T)*N,s[3]=0,s[4]=(m-M)*b,s[5]=(1-(d+f))*b,s[6]=(p+E)*b,s[7]=0,s[8]=(g+T)*C,s[9]=(p-E)*C,s[10]=(1-(d+x))*C,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,i){const s=this.elements;let r=gi.set(s[0],s[1],s[2]).length();const o=gi.set(s[4],s[5],s[6]).length(),a=gi.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),t.x=s[12],t.y=s[13],t.z=s[14],$e.copy(this);const c=1/r,h=1/o,u=1/a;return $e.elements[0]*=c,$e.elements[1]*=c,$e.elements[2]*=c,$e.elements[4]*=h,$e.elements[5]*=h,$e.elements[6]*=h,$e.elements[8]*=u,$e.elements[9]*=u,$e.elements[10]*=u,e.setFromRotationMatrix($e),i.x=r,i.y=o,i.z=a,this}makePerspective(t,e,i,s,r,o,a=yn){const l=this.elements,c=2*r/(e-t),h=2*r/(i-s),u=(e+t)/(e-t),d=(i+s)/(i-s);let m,g;if(a===yn)m=-(o+r)/(o-r),g=-2*o*r/(o-r);else if(a===nr)m=-o/(o-r),g=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=c,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=h,l[9]=d,l[13]=0,l[2]=0,l[6]=0,l[10]=m,l[14]=g,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,i,s,r,o,a=yn){const l=this.elements,c=1/(e-t),h=1/(i-s),u=1/(o-r),d=(e+t)*c,m=(i+s)*h;let g,x;if(a===yn)g=(o+r)*u,x=-2*u;else if(a===nr)g=r*u,x=-1*u;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-d,l[1]=0,l[5]=2*h,l[9]=0,l[13]=-m,l[2]=0,l[6]=0,l[10]=x,l[14]=-g,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){const e=this.elements,i=t.elements;for(let s=0;s<16;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<16;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){const i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t[e+9]=i[9],t[e+10]=i[10],t[e+11]=i[11],t[e+12]=i[12],t[e+13]=i[13],t[e+14]=i[14],t[e+15]=i[15],t}}const gi=new H,$e=new ue,yu=new H(0,0,0),Su=new H(1,1,1),Un=new H,Ts=new H,Ne=new H,Ia=new ue,Ua=new cn;class wn{constructor(t=0,e=0,i=0,s=wn.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=i,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,i,s=this._order){return this._x=t,this._y=e,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,i=!0){const s=t.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],u=s[2],d=s[6],m=s[10];switch(e){case"XYZ":this._y=Math.asin(Ae(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,m),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ae(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,m),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ae(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,m),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Ae(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,m),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Ae(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,m));break;case"XZY":this._z=Math.asin(-Ae(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,m),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,i){return Ia.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Ia,e,i)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Ua.setFromEuler(this),this.setFromQuaternion(Ua,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}wn.DEFAULT_ORDER="XYZ";class wc{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let Eu=0;const Na=new H,_i=new cn,pn=new ue,bs=new H,Zi=new H,Tu=new H,bu=new cn,Fa=new H(1,0,0),Oa=new H(0,1,0),Ba=new H(0,0,1),ka={type:"added"},Au={type:"removed"},xi={type:"childadded",child:null},Ar={type:"childremoved",child:null};class De extends li{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Eu++}),this.uuid=hs(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=De.DEFAULT_UP.clone();const t=new H,e=new wn,i=new cn,s=new H(1,1,1);function r(){i.setFromEuler(e,!1)}function o(){e.setFromQuaternion(i,void 0,!1)}e._onChange(r),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new ue},normalMatrix:{value:new Vt}}),this.matrix=new ue,this.matrixWorld=new ue,this.matrixAutoUpdate=De.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=De.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new wc,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return _i.setFromAxisAngle(t,e),this.quaternion.multiply(_i),this}rotateOnWorldAxis(t,e){return _i.setFromAxisAngle(t,e),this.quaternion.premultiply(_i),this}rotateX(t){return this.rotateOnAxis(Fa,t)}rotateY(t){return this.rotateOnAxis(Oa,t)}rotateZ(t){return this.rotateOnAxis(Ba,t)}translateOnAxis(t,e){return Na.copy(t).applyQuaternion(this.quaternion),this.position.add(Na.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Fa,t)}translateY(t){return this.translateOnAxis(Oa,t)}translateZ(t){return this.translateOnAxis(Ba,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(pn.copy(this.matrixWorld).invert())}lookAt(t,e,i){t.isVector3?bs.copy(t):bs.set(t,e,i);const s=this.parent;this.updateWorldMatrix(!0,!1),Zi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?pn.lookAt(Zi,bs,this.up):pn.lookAt(bs,Zi,this.up),this.quaternion.setFromRotationMatrix(pn),s&&(pn.extractRotation(s.matrixWorld),_i.setFromRotationMatrix(pn),this.quaternion.premultiply(_i.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(ka),xi.child=t,this.dispatchEvent(xi),xi.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Au),Ar.child=t,this.dispatchEvent(Ar),Ar.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),pn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),pn.multiply(t.parent.matrixWorld)),t.applyMatrix4(pn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(ka),xi.child=t,this.dispatchEvent(xi),xi.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let i=0,s=this.children.length;i<s;i++){const o=this.children[i].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,i=[]){this[t]===e&&i.push(this);const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(t,e,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Zi,t,Tu),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Zi,bu,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].updateMatrixWorld(t)}updateWorldMatrix(t,e){const i=this.parent;if(t===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",i={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.visibility=this._visibility,s.active=this._active,s.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.geometryCount=this._geometryCount,s.matricesTexture=this._matricesTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere={center:s.boundingSphere.center.toArray(),radius:s.boundingSphere.radius}),this.boundingBox!==null&&(s.boundingBox={min:s.boundingBox.min.toArray(),max:s.boundingBox.max.toArray()}));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const u=l[c];r(t.shapes,u)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(t.materials,this.material[l]));s.material=a}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];s.animations.push(r(t.animations,l))}}if(e){const a=o(t.geometries),l=o(t.materials),c=o(t.textures),h=o(t.images),u=o(t.shapes),d=o(t.skeletons),m=o(t.animations),g=o(t.nodes);a.length>0&&(i.geometries=a),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),h.length>0&&(i.images=h),u.length>0&&(i.shapes=u),d.length>0&&(i.skeletons=d),m.length>0&&(i.animations=m),g.length>0&&(i.nodes=g)}return i.object=s,i;function o(a){const l=[];for(const c in a){const h=a[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let i=0;i<t.children.length;i++){const s=t.children[i];this.add(s.clone())}return this}}De.DEFAULT_UP=new H(0,1,0);De.DEFAULT_MATRIX_AUTO_UPDATE=!0;De.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Ye=new H,mn=new H,wr=new H,gn=new H,vi=new H,Mi=new H,za=new H,Rr=new H,Cr=new H,Pr=new H,Lr=new he,Dr=new he,Ir=new he;class Ke{constructor(t=new H,e=new H,i=new H){this.a=t,this.b=e,this.c=i}static getNormal(t,e,i,s){s.subVectors(i,e),Ye.subVectors(t,e),s.cross(Ye);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,i,s,r){Ye.subVectors(s,e),mn.subVectors(i,e),wr.subVectors(t,e);const o=Ye.dot(Ye),a=Ye.dot(mn),l=Ye.dot(wr),c=mn.dot(mn),h=mn.dot(wr),u=o*c-a*a;if(u===0)return r.set(0,0,0),null;const d=1/u,m=(c*l-a*h)*d,g=(o*h-a*l)*d;return r.set(1-m-g,g,m)}static containsPoint(t,e,i,s){return this.getBarycoord(t,e,i,s,gn)===null?!1:gn.x>=0&&gn.y>=0&&gn.x+gn.y<=1}static getInterpolation(t,e,i,s,r,o,a,l){return this.getBarycoord(t,e,i,s,gn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,gn.x),l.addScaledVector(o,gn.y),l.addScaledVector(a,gn.z),l)}static getInterpolatedAttribute(t,e,i,s,r,o){return Lr.setScalar(0),Dr.setScalar(0),Ir.setScalar(0),Lr.fromBufferAttribute(t,e),Dr.fromBufferAttribute(t,i),Ir.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(Lr,r.x),o.addScaledVector(Dr,r.y),o.addScaledVector(Ir,r.z),o}static isFrontFacing(t,e,i,s){return Ye.subVectors(i,e),mn.subVectors(t,e),Ye.cross(mn).dot(s)<0}set(t,e,i){return this.a.copy(t),this.b.copy(e),this.c.copy(i),this}setFromPointsAndIndices(t,e,i,s){return this.a.copy(t[e]),this.b.copy(t[i]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,i,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Ye.subVectors(this.c,this.b),mn.subVectors(this.a,this.b),Ye.cross(mn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return Ke.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return Ke.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,i,s,r){return Ke.getInterpolation(t,this.a,this.b,this.c,e,i,s,r)}containsPoint(t){return Ke.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return Ke.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const i=this.a,s=this.b,r=this.c;let o,a;vi.subVectors(s,i),Mi.subVectors(r,i),Rr.subVectors(t,i);const l=vi.dot(Rr),c=Mi.dot(Rr);if(l<=0&&c<=0)return e.copy(i);Cr.subVectors(t,s);const h=vi.dot(Cr),u=Mi.dot(Cr);if(h>=0&&u<=h)return e.copy(s);const d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return o=l/(l-h),e.copy(i).addScaledVector(vi,o);Pr.subVectors(t,r);const m=vi.dot(Pr),g=Mi.dot(Pr);if(g>=0&&m<=g)return e.copy(r);const x=m*c-l*g;if(x<=0&&c>=0&&g<=0)return a=c/(c-g),e.copy(i).addScaledVector(Mi,a);const p=h*g-m*u;if(p<=0&&u-h>=0&&m-g>=0)return za.subVectors(r,s),a=(u-h)/(u-h+(m-g)),e.copy(s).addScaledVector(za,a);const f=1/(p+x+d);return o=x*f,a=d*f,e.copy(i).addScaledVector(vi,o).addScaledVector(Mi,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const Rc={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Nn={h:0,s:0,l:0},As={h:0,s:0,l:0};function Ur(n,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?n+(t-n)*6*e:e<1/2?t:e<2/3?n+(t-n)*6*(2/3-e):n}class Kt{constructor(t,e,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,i)}set(t,e,i){if(e===void 0&&i===void 0){const s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,i);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Ge){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,jt.toWorkingColorSpace(this,e),this}setRGB(t,e,i,s=jt.workingColorSpace){return this.r=t,this.g=e,this.b=i,jt.toWorkingColorSpace(this,s),this}setHSL(t,e,i,s=jt.workingColorSpace){if(t=cu(t,1),e=Ae(e,0,1),i=Ae(i,0,1),e===0)this.r=this.g=this.b=i;else{const r=i<=.5?i*(1+e):i+e-i*e,o=2*i-r;this.r=Ur(o,r,t+1/3),this.g=Ur(o,r,t),this.b=Ur(o,r,t-1/3)}return jt.toWorkingColorSpace(this,s),this}setStyle(t,e=Ge){function i(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r;const o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){const r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Ge){const i=Rc[t.toLowerCase()];return i!==void 0?this.setHex(i,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Tn(t.r),this.g=Tn(t.g),this.b=Tn(t.b),this}copyLinearToSRGB(t){return this.r=Li(t.r),this.g=Li(t.g),this.b=Li(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Ge){return jt.fromWorkingColorSpace(Se.copy(this),t),Math.round(Ae(Se.r*255,0,255))*65536+Math.round(Ae(Se.g*255,0,255))*256+Math.round(Ae(Se.b*255,0,255))}getHexString(t=Ge){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=jt.workingColorSpace){jt.fromWorkingColorSpace(Se.copy(this),e);const i=Se.r,s=Se.g,r=Se.b,o=Math.max(i,s,r),a=Math.min(i,s,r);let l,c;const h=(a+o)/2;if(a===o)l=0,c=0;else{const u=o-a;switch(c=h<=.5?u/(o+a):u/(2-o-a),o){case i:l=(s-r)/u+(s<r?6:0);break;case s:l=(r-i)/u+2;break;case r:l=(i-s)/u+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=jt.workingColorSpace){return jt.fromWorkingColorSpace(Se.copy(this),e),t.r=Se.r,t.g=Se.g,t.b=Se.b,t}getStyle(t=Ge){jt.fromWorkingColorSpace(Se.copy(this),t);const e=Se.r,i=Se.g,s=Se.b;return t!==Ge?`color(${t} ${e.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(t,e,i){return this.getHSL(Nn),this.setHSL(Nn.h+t,Nn.s+e,Nn.l+i)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,i){return this.r=t.r+(e.r-t.r)*i,this.g=t.g+(e.g-t.g)*i,this.b=t.b+(e.b-t.b)*i,this}lerpHSL(t,e){this.getHSL(Nn),t.getHSL(As);const i=_r(Nn.h,As.h,e),s=_r(Nn.s,As.s,e),r=_r(Nn.l,As.l,e);return this.setHSL(i,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,i=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*i+r[6]*s,this.g=r[1]*e+r[4]*i+r[7]*s,this.b=r[2]*e+r[5]*i+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Se=new Kt;Kt.NAMES=Rc;let wu=0;class ds extends li{static get type(){return"Material"}get type(){return this.constructor.type}set type(t){}constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:wu++}),this.uuid=hs(),this.name="",this.blending=ei,this.side=Hn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=no,this.blendDst=io,this.blendEquation=Kn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Kt(0,0,0),this.blendAlpha=0,this.depthFunc=Ui,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Ea,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ui,this.stencilZFail=ui,this.stencilZPass=ui,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const i=t[e];if(i===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[e]=i}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(t).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(t).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(t).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(t).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(t).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==ei&&(i.blending=this.blending),this.side!==Hn&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==no&&(i.blendSrc=this.blendSrc),this.blendDst!==io&&(i.blendDst=this.blendDst),this.blendEquation!==Kn&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Ui&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Ea&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==ui&&(i.stencilFail=this.stencilFail),this.stencilZFail!==ui&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==ui&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(r){const o=[];for(const a in r){const l=r[a];delete l.metadata,o.push(l)}return o}if(e){const r=s(t.textures),o=s(t.images);r.length>0&&(i.textures=r),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let i=null;if(e!==null){const s=e.length;i=new Array(s);for(let r=0;r!==s;++r)i[r]=e[r].clone()}return this.clippingPlanes=i,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class ra extends ds{static get type(){return"MeshBasicMaterial"}constructor(t){super(),this.isMeshBasicMaterial=!0,this.color=new Kt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new wn,this.combine=rc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const fe=new H,ws=new Ft;class xe{constructor(t,e,i=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=i,this.usage=Ta,this.updateRanges=[],this.gpuType=Mn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,i){t*=this.itemSize,i*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[i+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,i=this.count;e<i;e++)ws.fromBufferAttribute(this,e),ws.applyMatrix3(t),this.setXY(e,ws.x,ws.y);else if(this.itemSize===3)for(let e=0,i=this.count;e<i;e++)fe.fromBufferAttribute(this,e),fe.applyMatrix3(t),this.setXYZ(e,fe.x,fe.y,fe.z);return this}applyMatrix4(t){for(let e=0,i=this.count;e<i;e++)fe.fromBufferAttribute(this,e),fe.applyMatrix4(t),this.setXYZ(e,fe.x,fe.y,fe.z);return this}applyNormalMatrix(t){for(let e=0,i=this.count;e<i;e++)fe.fromBufferAttribute(this,e),fe.applyNormalMatrix(t),this.setXYZ(e,fe.x,fe.y,fe.z);return this}transformDirection(t){for(let e=0,i=this.count;e<i;e++)fe.fromBufferAttribute(this,e),fe.transformDirection(t),this.setXYZ(e,fe.x,fe.y,fe.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let i=this.array[t*this.itemSize+e];return this.normalized&&(i=qi(i,this.array)),i}setComponent(t,e,i){return this.normalized&&(i=Re(i,this.array)),this.array[t*this.itemSize+e]=i,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=qi(e,this.array)),e}setX(t,e){return this.normalized&&(e=Re(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=qi(e,this.array)),e}setY(t,e){return this.normalized&&(e=Re(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=qi(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Re(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=qi(e,this.array)),e}setW(t,e){return this.normalized&&(e=Re(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,i){return t*=this.itemSize,this.normalized&&(e=Re(e,this.array),i=Re(i,this.array)),this.array[t+0]=e,this.array[t+1]=i,this}setXYZ(t,e,i,s){return t*=this.itemSize,this.normalized&&(e=Re(e,this.array),i=Re(i,this.array),s=Re(s,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this}setXYZW(t,e,i,s,r){return t*=this.itemSize,this.normalized&&(e=Re(e,this.array),i=Re(i,this.array),s=Re(s,this.array),r=Re(r,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Ta&&(t.usage=this.usage),t}}class Cc extends xe{constructor(t,e,i){super(new Uint16Array(t),e,i)}}class Pc extends xe{constructor(t,e,i){super(new Uint32Array(t),e,i)}}class bn extends xe{constructor(t,e,i){super(new Float32Array(t),e,i)}}let Ru=0;const ke=new ue,Nr=new De,yi=new H,Fe=new us,Ji=new us,_e=new H;class hn extends li{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Ru++}),this.uuid=hs(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Tc(t)?Pc:Cc)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,i=0){this.groups.push({start:t,count:e,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const r=new Vt().getNormalMatrix(t);i.applyNormalMatrix(r),i.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return ke.makeRotationFromQuaternion(t),this.applyMatrix4(ke),this}rotateX(t){return ke.makeRotationX(t),this.applyMatrix4(ke),this}rotateY(t){return ke.makeRotationY(t),this.applyMatrix4(ke),this}rotateZ(t){return ke.makeRotationZ(t),this.applyMatrix4(ke),this}translate(t,e,i){return ke.makeTranslation(t,e,i),this.applyMatrix4(ke),this}scale(t,e,i){return ke.makeScale(t,e,i),this.applyMatrix4(ke),this}lookAt(t){return Nr.lookAt(t),Nr.updateMatrix(),this.applyMatrix4(Nr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(yi).negate(),this.translate(yi.x,yi.y,yi.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const i=[];for(let s=0,r=t.length;s<r;s++){const o=t[s];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new bn(i,3))}else{for(let i=0,s=e.count;i<s;i++){const r=t[i];e.setXYZ(i,r.x,r.y,r.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new us);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new H(-1/0,-1/0,-1/0),new H(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let i=0,s=e.length;i<s;i++){const r=e[i];Fe.setFromBufferAttribute(r),this.morphTargetsRelative?(_e.addVectors(this.boundingBox.min,Fe.min),this.boundingBox.expandByPoint(_e),_e.addVectors(this.boundingBox.max,Fe.max),this.boundingBox.expandByPoint(_e)):(this.boundingBox.expandByPoint(Fe.min),this.boundingBox.expandByPoint(Fe.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new cr);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new H,1/0);return}if(t){const i=this.boundingSphere.center;if(Fe.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){const a=e[r];Ji.setFromBufferAttribute(a),this.morphTargetsRelative?(_e.addVectors(Fe.min,Ji.min),Fe.expandByPoint(_e),_e.addVectors(Fe.max,Ji.max),Fe.expandByPoint(_e)):(Fe.expandByPoint(Ji.min),Fe.expandByPoint(Ji.max))}Fe.getCenter(i);let s=0;for(let r=0,o=t.count;r<o;r++)_e.fromBufferAttribute(t,r),s=Math.max(s,i.distanceToSquared(_e));if(e)for(let r=0,o=e.length;r<o;r++){const a=e[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)_e.fromBufferAttribute(a,c),l&&(yi.fromBufferAttribute(t,c),_e.add(yi)),s=Math.max(s,i.distanceToSquared(_e))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=e.position,s=e.normal,r=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new xe(new Float32Array(4*i.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let L=0;L<i.count;L++)a[L]=new H,l[L]=new H;const c=new H,h=new H,u=new H,d=new Ft,m=new Ft,g=new Ft,x=new H,p=new H;function f(L,y,v){c.fromBufferAttribute(i,L),h.fromBufferAttribute(i,y),u.fromBufferAttribute(i,v),d.fromBufferAttribute(r,L),m.fromBufferAttribute(r,y),g.fromBufferAttribute(r,v),h.sub(c),u.sub(c),m.sub(d),g.sub(d);const P=1/(m.x*g.y-g.x*m.y);isFinite(P)&&(x.copy(h).multiplyScalar(g.y).addScaledVector(u,-m.y).multiplyScalar(P),p.copy(u).multiplyScalar(m.x).addScaledVector(h,-g.x).multiplyScalar(P),a[L].add(x),a[y].add(x),a[v].add(x),l[L].add(p),l[y].add(p),l[v].add(p))}let E=this.groups;E.length===0&&(E=[{start:0,count:t.count}]);for(let L=0,y=E.length;L<y;++L){const v=E[L],P=v.start,G=v.count;for(let V=P,J=P+G;V<J;V+=3)f(t.getX(V+0),t.getX(V+1),t.getX(V+2))}const T=new H,M=new H,N=new H,b=new H;function C(L){N.fromBufferAttribute(s,L),b.copy(N);const y=a[L];T.copy(y),T.sub(N.multiplyScalar(N.dot(y))).normalize(),M.crossVectors(b,y);const P=M.dot(l[L])<0?-1:1;o.setXYZW(L,T.x,T.y,T.z,P)}for(let L=0,y=E.length;L<y;++L){const v=E[L],P=v.start,G=v.count;for(let V=P,J=P+G;V<J;V+=3)C(t.getX(V+0)),C(t.getX(V+1)),C(t.getX(V+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new xe(new Float32Array(e.count*3),3),this.setAttribute("normal",i);else for(let d=0,m=i.count;d<m;d++)i.setXYZ(d,0,0,0);const s=new H,r=new H,o=new H,a=new H,l=new H,c=new H,h=new H,u=new H;if(t)for(let d=0,m=t.count;d<m;d+=3){const g=t.getX(d+0),x=t.getX(d+1),p=t.getX(d+2);s.fromBufferAttribute(e,g),r.fromBufferAttribute(e,x),o.fromBufferAttribute(e,p),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),a.fromBufferAttribute(i,g),l.fromBufferAttribute(i,x),c.fromBufferAttribute(i,p),a.add(h),l.add(h),c.add(h),i.setXYZ(g,a.x,a.y,a.z),i.setXYZ(x,l.x,l.y,l.z),i.setXYZ(p,c.x,c.y,c.z)}else for(let d=0,m=e.count;d<m;d+=3)s.fromBufferAttribute(e,d+0),r.fromBufferAttribute(e,d+1),o.fromBufferAttribute(e,d+2),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),i.setXYZ(d+0,h.x,h.y,h.z),i.setXYZ(d+1,h.x,h.y,h.z),i.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,i=t.count;e<i;e++)_e.fromBufferAttribute(t,e),_e.normalize(),t.setXYZ(e,_e.x,_e.y,_e.z)}toNonIndexed(){function t(a,l){const c=a.array,h=a.itemSize,u=a.normalized,d=new c.constructor(l.length*h);let m=0,g=0;for(let x=0,p=l.length;x<p;x++){a.isInterleavedBufferAttribute?m=l[x]*a.data.stride+a.offset:m=l[x]*h;for(let f=0;f<h;f++)d[g++]=c[m++]}return new xe(d,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new hn,i=this.index.array,s=this.attributes;for(const a in s){const l=s[a],c=t(l,i);e.setAttribute(a,c)}const r=this.morphAttributes;for(const a in r){const l=[],c=r[a];for(let h=0,u=c.length;h<u;h++){const d=c[h],m=t(d,i);l.push(m)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const i=this.attributes;for(const l in i){const c=i[l];t.data.attributes[l]=c.toJSON(t.data)}const s={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){const m=c[u];h.push(m.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(t.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const i=t.index;i!==null&&this.setIndex(i.clone(e));const s=t.attributes;for(const c in s){const h=s[c];this.setAttribute(c,h.clone(e))}const r=t.morphAttributes;for(const c in r){const h=[],u=r[c];for(let d=0,m=u.length;d<m;d++)h.push(u[d].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;const o=t.groups;for(let c=0,h=o.length;c<h;c++){const u=o[c];this.addGroup(u.start,u.count,u.materialIndex)}const a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Ha=new ue,Wn=new sa,Rs=new cr,Ga=new H,Cs=new H,Ps=new H,Ls=new H,Fr=new H,Ds=new H,Va=new H,Is=new H;class ln extends De{constructor(t=new hn,e=new ra){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){const s=e[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){const i=this.geometry,s=i.attributes.position,r=i.morphAttributes.position,o=i.morphTargetsRelative;e.fromBufferAttribute(s,t);const a=this.morphTargetInfluences;if(r&&a){Ds.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const h=a[l],u=r[l];h!==0&&(Fr.fromBufferAttribute(u,t),o?Ds.addScaledVector(Fr,h):Ds.addScaledVector(Fr.sub(e),h))}e.add(Ds)}return e}raycast(t,e){const i=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Rs.copy(i.boundingSphere),Rs.applyMatrix4(r),Wn.copy(t.ray).recast(t.near),!(Rs.containsPoint(Wn.origin)===!1&&(Wn.intersectSphere(Rs,Ga)===null||Wn.origin.distanceToSquared(Ga)>(t.far-t.near)**2))&&(Ha.copy(r).invert(),Wn.copy(t.ray).applyMatrix4(Ha),!(i.boundingBox!==null&&Wn.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(t,e,Wn)))}_computeIntersections(t,e,i){let s;const r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,m=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,x=d.length;g<x;g++){const p=d[g],f=o[p.materialIndex],E=Math.max(p.start,m.start),T=Math.min(a.count,Math.min(p.start+p.count,m.start+m.count));for(let M=E,N=T;M<N;M+=3){const b=a.getX(M),C=a.getX(M+1),L=a.getX(M+2);s=Us(this,f,t,i,c,h,u,b,C,L),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=p.materialIndex,e.push(s))}}else{const g=Math.max(0,m.start),x=Math.min(a.count,m.start+m.count);for(let p=g,f=x;p<f;p+=3){const E=a.getX(p),T=a.getX(p+1),M=a.getX(p+2);s=Us(this,o,t,i,c,h,u,E,T,M),s&&(s.faceIndex=Math.floor(p/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,x=d.length;g<x;g++){const p=d[g],f=o[p.materialIndex],E=Math.max(p.start,m.start),T=Math.min(l.count,Math.min(p.start+p.count,m.start+m.count));for(let M=E,N=T;M<N;M+=3){const b=M,C=M+1,L=M+2;s=Us(this,f,t,i,c,h,u,b,C,L),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=p.materialIndex,e.push(s))}}else{const g=Math.max(0,m.start),x=Math.min(l.count,m.start+m.count);for(let p=g,f=x;p<f;p+=3){const E=p,T=p+1,M=p+2;s=Us(this,o,t,i,c,h,u,E,T,M),s&&(s.faceIndex=Math.floor(p/3),e.push(s))}}}}function Cu(n,t,e,i,s,r,o,a){let l;if(t.side===Pe?l=i.intersectTriangle(o,r,s,!0,a):l=i.intersectTriangle(s,r,o,t.side===Hn,a),l===null)return null;Is.copy(a),Is.applyMatrix4(n.matrixWorld);const c=e.ray.origin.distanceTo(Is);return c<e.near||c>e.far?null:{distance:c,point:Is.clone(),object:n}}function Us(n,t,e,i,s,r,o,a,l,c){n.getVertexPosition(a,Cs),n.getVertexPosition(l,Ps),n.getVertexPosition(c,Ls);const h=Cu(n,t,e,i,Cs,Ps,Ls,Va);if(h){const u=new H;Ke.getBarycoord(Va,Cs,Ps,Ls,u),s&&(h.uv=Ke.getInterpolatedAttribute(s,a,l,c,u,new Ft)),r&&(h.uv1=Ke.getInterpolatedAttribute(r,a,l,c,u,new Ft)),o&&(h.normal=Ke.getInterpolatedAttribute(o,a,l,c,u,new H),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));const d={a,b:l,c,normal:new H,materialIndex:0};Ke.getNormal(Cs,Ps,Ls,d.normal),h.face=d,h.barycoord=u}return h}class fs extends hn{constructor(t=1,e=1,i=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:i,widthSegments:s,heightSegments:r,depthSegments:o};const a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);const l=[],c=[],h=[],u=[];let d=0,m=0;g("z","y","x",-1,-1,i,e,t,o,r,0),g("z","y","x",1,-1,i,e,-t,o,r,1),g("x","z","y",1,1,t,i,e,s,o,2),g("x","z","y",1,-1,t,i,-e,s,o,3),g("x","y","z",1,-1,t,e,i,s,r,4),g("x","y","z",-1,-1,t,e,-i,s,r,5),this.setIndex(l),this.setAttribute("position",new bn(c,3)),this.setAttribute("normal",new bn(h,3)),this.setAttribute("uv",new bn(u,2));function g(x,p,f,E,T,M,N,b,C,L,y){const v=M/C,P=N/L,G=M/2,V=N/2,J=b/2,tt=C+1,Q=L+1;let W=0,$=0;const rt=new H;for(let vt=0;vt<Q;vt++){const gt=vt*P-V;for(let nt=0;nt<tt;nt++){const Ht=nt*v-G;rt[x]=Ht*E,rt[p]=gt*T,rt[f]=J,c.push(rt.x,rt.y,rt.z),rt[x]=0,rt[p]=0,rt[f]=b>0?1:-1,h.push(rt.x,rt.y,rt.z),u.push(nt/C),u.push(1-vt/L),W+=1}}for(let vt=0;vt<L;vt++)for(let gt=0;gt<C;gt++){const nt=d+gt+tt*vt,Ht=d+gt+tt*(vt+1),et=d+(gt+1)+tt*(vt+1),lt=d+(gt+1)+tt*vt;l.push(nt,Ht,lt),l.push(Ht,et,lt),$+=6}a.addGroup(m,$,y),m+=$,d+=W}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new fs(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function ki(n){const t={};for(const e in n){t[e]={};for(const i in n[e]){const s=n[e][i];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][i]=null):t[e][i]=s.clone():Array.isArray(s)?t[e][i]=s.slice():t[e][i]=s}}return t}function be(n){const t={};for(let e=0;e<n.length;e++){const i=ki(n[e]);for(const s in i)t[s]=i[s]}return t}function Pu(n){const t=[];for(let e=0;e<n.length;e++)t.push(n[e].clone());return t}function Lc(n){const t=n.getRenderTarget();return t===null?n.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:jt.workingColorSpace}const as={clone:ki,merge:be};var Lu=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Du=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Ee extends ds{static get type(){return"ShaderMaterial"}constructor(t){super(),this.isShaderMaterial=!0,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Lu,this.fragmentShader=Du,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=ki(t.uniforms),this.uniformsGroups=Pu(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const s in this.uniforms){const o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const i={};for(const s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(e.extensions=i),e}}class Dc extends De{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ue,this.projectionMatrix=new ue,this.projectionMatrixInverse=new ue,this.coordinateSystem=yn}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Fn=new H,Wa=new Ft,Xa=new Ft;class je extends Dc{constructor(t=50,e=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=Go*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(Zs*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Go*2*Math.atan(Math.tan(Zs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,i){Fn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Fn.x,Fn.y).multiplyScalar(-t/Fn.z),Fn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Fn.x,Fn.y).multiplyScalar(-t/Fn.z)}getViewSize(t,e){return this.getViewBounds(t,Wa,Xa),e.subVectors(Xa,Wa)}setViewOffset(t,e,i,s,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(Zs*.5*this.fov)/this.zoom,i=2*e,s=this.aspect*i,r=-.5*s;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,e-=o.offsetY*i/c,s*=o.width/l,i*=o.height/c}const a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-i,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const Si=-90,Ei=1;class Iu extends De{constructor(t,e,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new je(Si,Ei,t,e);s.layers=this.layers,this.add(s);const r=new je(Si,Ei,t,e);r.layers=this.layers,this.add(r);const o=new je(Si,Ei,t,e);o.layers=this.layers,this.add(o);const a=new je(Si,Ei,t,e);a.layers=this.layers,this.add(a);const l=new je(Si,Ei,t,e);l.layers=this.layers,this.add(l);const c=new je(Si,Ei,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[i,s,r,o,a,l]=e;for(const c of e)this.remove(c);if(t===yn)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===nr)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,l,c,h]=this.children,u=t.getRenderTarget(),d=t.getActiveCubeFace(),m=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;const x=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,t.setRenderTarget(i,0,s),t.render(e,r),t.setRenderTarget(i,1,s),t.render(e,o),t.setRenderTarget(i,2,s),t.render(e,a),t.setRenderTarget(i,3,s),t.render(e,l),t.setRenderTarget(i,4,s),t.render(e,c),i.texture.generateMipmaps=x,t.setRenderTarget(i,5,s),t.render(e,h),t.setRenderTarget(u,d,m),t.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class Ic extends Le{constructor(t,e,i,s,r,o,a,l,c,h){t=t!==void 0?t:[],e=e!==void 0?e:Ni,super(t,e,i,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class Uu extends en{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const i={width:t,height:t,depth:1},s=[i,i,i,i,i,i];this.texture=new Ic(s,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:an}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new fs(5,5,5),r=new Ee({name:"CubemapFromEquirect",uniforms:ki(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Pe,blending:Sn});r.uniforms.tEquirect.value=e;const o=new ln(s,r),a=e.minFilter;return e.minFilter===ti&&(e.minFilter=an),new Iu(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e,i,s){const r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,i,s);t.setRenderTarget(r)}}const Or=new H,Nu=new H,Fu=new Vt;class On{constructor(t=new H(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,i,s){return this.normal.set(t,e,i),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,i){const s=Or.subVectors(i,e).cross(Nu.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const i=t.delta(Or),s=this.normal.dot(i);if(s===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const r=-(t.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:e.copy(t.start).addScaledVector(i,r)}intersectsLine(t){const e=this.distanceToPoint(t.start),i=this.distanceToPoint(t.end);return e<0&&i>0||i<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const i=e||Fu.getNormalMatrix(t),s=this.coplanarPoint(Or).applyMatrix4(t),r=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Xn=new cr,Ns=new H;class Uc{constructor(t=new On,e=new On,i=new On,s=new On,r=new On,o=new On){this.planes=[t,e,i,s,r,o]}set(t,e,i,s,r,o){const a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(i),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(t){const e=this.planes;for(let i=0;i<6;i++)e[i].copy(t.planes[i]);return this}setFromProjectionMatrix(t,e=yn){const i=this.planes,s=t.elements,r=s[0],o=s[1],a=s[2],l=s[3],c=s[4],h=s[5],u=s[6],d=s[7],m=s[8],g=s[9],x=s[10],p=s[11],f=s[12],E=s[13],T=s[14],M=s[15];if(i[0].setComponents(l-r,d-c,p-m,M-f).normalize(),i[1].setComponents(l+r,d+c,p+m,M+f).normalize(),i[2].setComponents(l+o,d+h,p+g,M+E).normalize(),i[3].setComponents(l-o,d-h,p-g,M-E).normalize(),i[4].setComponents(l-a,d-u,p-x,M-T).normalize(),e===yn)i[5].setComponents(l+a,d+u,p+x,M+T).normalize();else if(e===nr)i[5].setComponents(a,u,x,T).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Xn.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Xn.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Xn)}intersectsSprite(t){return Xn.center.set(0,0,0),Xn.radius=.7071067811865476,Xn.applyMatrix4(t.matrixWorld),this.intersectsSphere(Xn)}intersectsSphere(t){const e=this.planes,i=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(i)<s)return!1;return!0}intersectsBox(t){const e=this.planes;for(let i=0;i<6;i++){const s=e[i];if(Ns.x=s.normal.x>0?t.max.x:t.min.x,Ns.y=s.normal.y>0?t.max.y:t.min.y,Ns.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(Ns)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let i=0;i<6;i++)if(e[i].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function Nc(){let n=null,t=!1,e=null,i=null;function s(r,o){e(r,o),i=n.requestAnimationFrame(s)}return{start:function(){t!==!0&&e!==null&&(i=n.requestAnimationFrame(s),t=!0)},stop:function(){n.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){n=r}}}function Ou(n){const t=new WeakMap;function e(a,l){const c=a.array,h=a.usage,u=c.byteLength,d=n.createBuffer();n.bindBuffer(l,d),n.bufferData(l,c,h),a.onUploadCallback();let m;if(c instanceof Float32Array)m=n.FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?m=n.HALF_FLOAT:m=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)m=n.SHORT;else if(c instanceof Uint32Array)m=n.UNSIGNED_INT;else if(c instanceof Int32Array)m=n.INT;else if(c instanceof Int8Array)m=n.BYTE;else if(c instanceof Uint8Array)m=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)m=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:m,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:u}}function i(a,l,c){const h=l.array,u=l.updateRanges;if(n.bindBuffer(c,a),u.length===0)n.bufferSubData(c,0,h);else{u.sort((m,g)=>m.start-g.start);let d=0;for(let m=1;m<u.length;m++){const g=u[d],x=u[m];x.start<=g.start+g.count+1?g.count=Math.max(g.count,x.start+x.count-g.start):(++d,u[d]=x)}u.length=d+1;for(let m=0,g=u.length;m<g;m++){const x=u[m];n.bufferSubData(c,x.start*h.BYTES_PER_ELEMENT,h,x.start,x.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=t.get(a);l&&(n.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}class hr extends hn{constructor(t=1,e=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:i,heightSegments:s};const r=t/2,o=e/2,a=Math.floor(i),l=Math.floor(s),c=a+1,h=l+1,u=t/a,d=e/l,m=[],g=[],x=[],p=[];for(let f=0;f<h;f++){const E=f*d-o;for(let T=0;T<c;T++){const M=T*u-r;g.push(M,-E,0),x.push(0,0,1),p.push(T/a),p.push(1-f/l)}}for(let f=0;f<l;f++)for(let E=0;E<a;E++){const T=E+c*f,M=E+c*(f+1),N=E+1+c*(f+1),b=E+1+c*f;m.push(T,M,b),m.push(M,N,b)}this.setIndex(m),this.setAttribute("position",new bn(g,3)),this.setAttribute("normal",new bn(x,3)),this.setAttribute("uv",new bn(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new hr(t.width,t.height,t.widthSegments,t.heightSegments)}}var Bu=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,ku=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,zu=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Hu=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Gu=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Vu=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Wu=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Xu=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,$u=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,Yu=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,qu=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,ju=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Ku=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Zu=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Ju=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Qu=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,td=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,ed=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,nd=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,id=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,sd=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,rd=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,od=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,ad=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,ld=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,cd=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,hd=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,ud=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,dd=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,fd=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,pd="gl_FragColor = linearToOutputTexel( gl_FragColor );",md=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,gd=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,_d=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,xd=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,vd=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Md=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,yd=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Sd=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Ed=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Td=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,bd=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Ad=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,wd=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Rd=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Cd=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Pd=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Ld=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Dd=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Id=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Ud=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Nd=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Fd=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Od=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Bd=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,kd=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,zd=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Hd=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Gd=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Vd=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Wd=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Xd=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,$d=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Yd=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,qd=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,jd=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Kd=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Zd=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Jd=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Qd=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,tf=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,ef=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,nf=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,sf=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,rf=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,of=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,af=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,lf=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,cf=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,hf=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,uf=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,df=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,ff=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,pf=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,mf=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,gf=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,_f=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,xf=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,vf=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Mf=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,yf=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Sf=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Ef=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Tf=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,bf=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Af=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,wf=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Rf=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Cf=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Pf=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Lf=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Df=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,If=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Uf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Nf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Ff=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Of=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Bf=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,kf=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,zf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Hf=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Gf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Vf=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Wf=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Xf=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,$f=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Yf=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,qf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,jf=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Kf=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Zf=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Jf=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Qf=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,tp=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,ep=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,np=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,ip=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,sp=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,rp=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,op=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,ap=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,lp=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,cp=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,hp=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,up=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,dp=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,fp=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,pp=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,mp=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,gp=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,_p=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Xt={alphahash_fragment:Bu,alphahash_pars_fragment:ku,alphamap_fragment:zu,alphamap_pars_fragment:Hu,alphatest_fragment:Gu,alphatest_pars_fragment:Vu,aomap_fragment:Wu,aomap_pars_fragment:Xu,batching_pars_vertex:$u,batching_vertex:Yu,begin_vertex:qu,beginnormal_vertex:ju,bsdfs:Ku,iridescence_fragment:Zu,bumpmap_pars_fragment:Ju,clipping_planes_fragment:Qu,clipping_planes_pars_fragment:td,clipping_planes_pars_vertex:ed,clipping_planes_vertex:nd,color_fragment:id,color_pars_fragment:sd,color_pars_vertex:rd,color_vertex:od,common:ad,cube_uv_reflection_fragment:ld,defaultnormal_vertex:cd,displacementmap_pars_vertex:hd,displacementmap_vertex:ud,emissivemap_fragment:dd,emissivemap_pars_fragment:fd,colorspace_fragment:pd,colorspace_pars_fragment:md,envmap_fragment:gd,envmap_common_pars_fragment:_d,envmap_pars_fragment:xd,envmap_pars_vertex:vd,envmap_physical_pars_fragment:Pd,envmap_vertex:Md,fog_vertex:yd,fog_pars_vertex:Sd,fog_fragment:Ed,fog_pars_fragment:Td,gradientmap_pars_fragment:bd,lightmap_pars_fragment:Ad,lights_lambert_fragment:wd,lights_lambert_pars_fragment:Rd,lights_pars_begin:Cd,lights_toon_fragment:Ld,lights_toon_pars_fragment:Dd,lights_phong_fragment:Id,lights_phong_pars_fragment:Ud,lights_physical_fragment:Nd,lights_physical_pars_fragment:Fd,lights_fragment_begin:Od,lights_fragment_maps:Bd,lights_fragment_end:kd,logdepthbuf_fragment:zd,logdepthbuf_pars_fragment:Hd,logdepthbuf_pars_vertex:Gd,logdepthbuf_vertex:Vd,map_fragment:Wd,map_pars_fragment:Xd,map_particle_fragment:$d,map_particle_pars_fragment:Yd,metalnessmap_fragment:qd,metalnessmap_pars_fragment:jd,morphinstance_vertex:Kd,morphcolor_vertex:Zd,morphnormal_vertex:Jd,morphtarget_pars_vertex:Qd,morphtarget_vertex:tf,normal_fragment_begin:ef,normal_fragment_maps:nf,normal_pars_fragment:sf,normal_pars_vertex:rf,normal_vertex:of,normalmap_pars_fragment:af,clearcoat_normal_fragment_begin:lf,clearcoat_normal_fragment_maps:cf,clearcoat_pars_fragment:hf,iridescence_pars_fragment:uf,opaque_fragment:df,packing:ff,premultiplied_alpha_fragment:pf,project_vertex:mf,dithering_fragment:gf,dithering_pars_fragment:_f,roughnessmap_fragment:xf,roughnessmap_pars_fragment:vf,shadowmap_pars_fragment:Mf,shadowmap_pars_vertex:yf,shadowmap_vertex:Sf,shadowmask_pars_fragment:Ef,skinbase_vertex:Tf,skinning_pars_vertex:bf,skinning_vertex:Af,skinnormal_vertex:wf,specularmap_fragment:Rf,specularmap_pars_fragment:Cf,tonemapping_fragment:Pf,tonemapping_pars_fragment:Lf,transmission_fragment:Df,transmission_pars_fragment:If,uv_pars_fragment:Uf,uv_pars_vertex:Nf,uv_vertex:Ff,worldpos_vertex:Of,background_vert:Bf,background_frag:kf,backgroundCube_vert:zf,backgroundCube_frag:Hf,cube_vert:Gf,cube_frag:Vf,depth_vert:Wf,depth_frag:Xf,distanceRGBA_vert:$f,distanceRGBA_frag:Yf,equirect_vert:qf,equirect_frag:jf,linedashed_vert:Kf,linedashed_frag:Zf,meshbasic_vert:Jf,meshbasic_frag:Qf,meshlambert_vert:tp,meshlambert_frag:ep,meshmatcap_vert:np,meshmatcap_frag:ip,meshnormal_vert:sp,meshnormal_frag:rp,meshphong_vert:op,meshphong_frag:ap,meshphysical_vert:lp,meshphysical_frag:cp,meshtoon_vert:hp,meshtoon_frag:up,points_vert:dp,points_frag:fp,shadow_vert:pp,shadow_frag:mp,sprite_vert:gp,sprite_frag:_p},Mt={common:{diffuse:{value:new Kt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Vt},alphaMap:{value:null},alphaMapTransform:{value:new Vt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Vt}},envmap:{envMap:{value:null},envMapRotation:{value:new Vt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Vt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Vt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Vt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Vt},normalScale:{value:new Ft(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Vt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Vt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Vt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Vt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Kt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Kt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Vt},alphaTest:{value:0},uvTransform:{value:new Vt}},sprite:{diffuse:{value:new Kt(16777215)},opacity:{value:1},center:{value:new Ft(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Vt},alphaMap:{value:null},alphaMapTransform:{value:new Vt},alphaTest:{value:0}}},on={basic:{uniforms:be([Mt.common,Mt.specularmap,Mt.envmap,Mt.aomap,Mt.lightmap,Mt.fog]),vertexShader:Xt.meshbasic_vert,fragmentShader:Xt.meshbasic_frag},lambert:{uniforms:be([Mt.common,Mt.specularmap,Mt.envmap,Mt.aomap,Mt.lightmap,Mt.emissivemap,Mt.bumpmap,Mt.normalmap,Mt.displacementmap,Mt.fog,Mt.lights,{emissive:{value:new Kt(0)}}]),vertexShader:Xt.meshlambert_vert,fragmentShader:Xt.meshlambert_frag},phong:{uniforms:be([Mt.common,Mt.specularmap,Mt.envmap,Mt.aomap,Mt.lightmap,Mt.emissivemap,Mt.bumpmap,Mt.normalmap,Mt.displacementmap,Mt.fog,Mt.lights,{emissive:{value:new Kt(0)},specular:{value:new Kt(1118481)},shininess:{value:30}}]),vertexShader:Xt.meshphong_vert,fragmentShader:Xt.meshphong_frag},standard:{uniforms:be([Mt.common,Mt.envmap,Mt.aomap,Mt.lightmap,Mt.emissivemap,Mt.bumpmap,Mt.normalmap,Mt.displacementmap,Mt.roughnessmap,Mt.metalnessmap,Mt.fog,Mt.lights,{emissive:{value:new Kt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Xt.meshphysical_vert,fragmentShader:Xt.meshphysical_frag},toon:{uniforms:be([Mt.common,Mt.aomap,Mt.lightmap,Mt.emissivemap,Mt.bumpmap,Mt.normalmap,Mt.displacementmap,Mt.gradientmap,Mt.fog,Mt.lights,{emissive:{value:new Kt(0)}}]),vertexShader:Xt.meshtoon_vert,fragmentShader:Xt.meshtoon_frag},matcap:{uniforms:be([Mt.common,Mt.bumpmap,Mt.normalmap,Mt.displacementmap,Mt.fog,{matcap:{value:null}}]),vertexShader:Xt.meshmatcap_vert,fragmentShader:Xt.meshmatcap_frag},points:{uniforms:be([Mt.points,Mt.fog]),vertexShader:Xt.points_vert,fragmentShader:Xt.points_frag},dashed:{uniforms:be([Mt.common,Mt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Xt.linedashed_vert,fragmentShader:Xt.linedashed_frag},depth:{uniforms:be([Mt.common,Mt.displacementmap]),vertexShader:Xt.depth_vert,fragmentShader:Xt.depth_frag},normal:{uniforms:be([Mt.common,Mt.bumpmap,Mt.normalmap,Mt.displacementmap,{opacity:{value:1}}]),vertexShader:Xt.meshnormal_vert,fragmentShader:Xt.meshnormal_frag},sprite:{uniforms:be([Mt.sprite,Mt.fog]),vertexShader:Xt.sprite_vert,fragmentShader:Xt.sprite_frag},background:{uniforms:{uvTransform:{value:new Vt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Xt.background_vert,fragmentShader:Xt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Vt}},vertexShader:Xt.backgroundCube_vert,fragmentShader:Xt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Xt.cube_vert,fragmentShader:Xt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Xt.equirect_vert,fragmentShader:Xt.equirect_frag},distanceRGBA:{uniforms:be([Mt.common,Mt.displacementmap,{referencePosition:{value:new H},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Xt.distanceRGBA_vert,fragmentShader:Xt.distanceRGBA_frag},shadow:{uniforms:be([Mt.lights,Mt.fog,{color:{value:new Kt(0)},opacity:{value:1}}]),vertexShader:Xt.shadow_vert,fragmentShader:Xt.shadow_frag}};on.physical={uniforms:be([on.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Vt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Vt},clearcoatNormalScale:{value:new Ft(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Vt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Vt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Vt},sheen:{value:0},sheenColor:{value:new Kt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Vt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Vt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Vt},transmissionSamplerSize:{value:new Ft},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Vt},attenuationDistance:{value:0},attenuationColor:{value:new Kt(0)},specularColor:{value:new Kt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Vt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Vt},anisotropyVector:{value:new Ft},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Vt}}]),vertexShader:Xt.meshphysical_vert,fragmentShader:Xt.meshphysical_frag};const Fs={r:0,b:0,g:0},$n=new wn,xp=new ue;function vp(n,t,e,i,s,r,o){const a=new Kt(0);let l=r===!0?0:1,c,h,u=null,d=0,m=null;function g(E){let T=E.isScene===!0?E.background:null;return T&&T.isTexture&&(T=(E.backgroundBlurriness>0?e:t).get(T)),T}function x(E){let T=!1;const M=g(E);M===null?f(a,l):M&&M.isColor&&(f(M,1),T=!0);const N=n.xr.getEnvironmentBlendMode();N==="additive"?i.buffers.color.setClear(0,0,0,1,o):N==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(n.autoClear||T)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function p(E,T){const M=g(T);M&&(M.isCubeTexture||M.mapping===ar)?(h===void 0&&(h=new ln(new fs(1,1,1),new Ee({name:"BackgroundCubeMaterial",uniforms:ki(on.backgroundCube.uniforms),vertexShader:on.backgroundCube.vertexShader,fragmentShader:on.backgroundCube.fragmentShader,side:Pe,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(N,b,C){this.matrixWorld.copyPosition(C.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(h)),$n.copy(T.backgroundRotation),$n.x*=-1,$n.y*=-1,$n.z*=-1,M.isCubeTexture&&M.isRenderTargetTexture===!1&&($n.y*=-1,$n.z*=-1),h.material.uniforms.envMap.value=M,h.material.uniforms.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=T.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(xp.makeRotationFromEuler($n)),h.material.toneMapped=jt.getTransfer(M.colorSpace)!==ne,(u!==M||d!==M.version||m!==n.toneMapping)&&(h.material.needsUpdate=!0,u=M,d=M.version,m=n.toneMapping),h.layers.enableAll(),E.unshift(h,h.geometry,h.material,0,0,null)):M&&M.isTexture&&(c===void 0&&(c=new ln(new hr(2,2),new Ee({name:"BackgroundMaterial",uniforms:ki(on.background.uniforms),vertexShader:on.background.vertexShader,fragmentShader:on.background.fragmentShader,side:Hn,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(c)),c.material.uniforms.t2D.value=M,c.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,c.material.toneMapped=jt.getTransfer(M.colorSpace)!==ne,M.matrixAutoUpdate===!0&&M.updateMatrix(),c.material.uniforms.uvTransform.value.copy(M.matrix),(u!==M||d!==M.version||m!==n.toneMapping)&&(c.material.needsUpdate=!0,u=M,d=M.version,m=n.toneMapping),c.layers.enableAll(),E.unshift(c,c.geometry,c.material,0,0,null))}function f(E,T){E.getRGB(Fs,Lc(n)),i.buffers.color.setClear(Fs.r,Fs.g,Fs.b,T,o)}return{getClearColor:function(){return a},setClearColor:function(E,T=1){a.set(E),l=T,f(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(E){l=E,f(a,l)},render:x,addToRenderList:p}}function Mp(n,t){const e=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},s=d(null);let r=s,o=!1;function a(v,P,G,V,J){let tt=!1;const Q=u(V,G,P);r!==Q&&(r=Q,c(r.object)),tt=m(v,V,G,J),tt&&g(v,V,G,J),J!==null&&t.update(J,n.ELEMENT_ARRAY_BUFFER),(tt||o)&&(o=!1,M(v,P,G,V),J!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,t.get(J).buffer))}function l(){return n.createVertexArray()}function c(v){return n.bindVertexArray(v)}function h(v){return n.deleteVertexArray(v)}function u(v,P,G){const V=G.wireframe===!0;let J=i[v.id];J===void 0&&(J={},i[v.id]=J);let tt=J[P.id];tt===void 0&&(tt={},J[P.id]=tt);let Q=tt[V];return Q===void 0&&(Q=d(l()),tt[V]=Q),Q}function d(v){const P=[],G=[],V=[];for(let J=0;J<e;J++)P[J]=0,G[J]=0,V[J]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:P,enabledAttributes:G,attributeDivisors:V,object:v,attributes:{},index:null}}function m(v,P,G,V){const J=r.attributes,tt=P.attributes;let Q=0;const W=G.getAttributes();for(const $ in W)if(W[$].location>=0){const vt=J[$];let gt=tt[$];if(gt===void 0&&($==="instanceMatrix"&&v.instanceMatrix&&(gt=v.instanceMatrix),$==="instanceColor"&&v.instanceColor&&(gt=v.instanceColor)),vt===void 0||vt.attribute!==gt||gt&&vt.data!==gt.data)return!0;Q++}return r.attributesNum!==Q||r.index!==V}function g(v,P,G,V){const J={},tt=P.attributes;let Q=0;const W=G.getAttributes();for(const $ in W)if(W[$].location>=0){let vt=tt[$];vt===void 0&&($==="instanceMatrix"&&v.instanceMatrix&&(vt=v.instanceMatrix),$==="instanceColor"&&v.instanceColor&&(vt=v.instanceColor));const gt={};gt.attribute=vt,vt&&vt.data&&(gt.data=vt.data),J[$]=gt,Q++}r.attributes=J,r.attributesNum=Q,r.index=V}function x(){const v=r.newAttributes;for(let P=0,G=v.length;P<G;P++)v[P]=0}function p(v){f(v,0)}function f(v,P){const G=r.newAttributes,V=r.enabledAttributes,J=r.attributeDivisors;G[v]=1,V[v]===0&&(n.enableVertexAttribArray(v),V[v]=1),J[v]!==P&&(n.vertexAttribDivisor(v,P),J[v]=P)}function E(){const v=r.newAttributes,P=r.enabledAttributes;for(let G=0,V=P.length;G<V;G++)P[G]!==v[G]&&(n.disableVertexAttribArray(G),P[G]=0)}function T(v,P,G,V,J,tt,Q){Q===!0?n.vertexAttribIPointer(v,P,G,J,tt):n.vertexAttribPointer(v,P,G,V,J,tt)}function M(v,P,G,V){x();const J=V.attributes,tt=G.getAttributes(),Q=P.defaultAttributeValues;for(const W in tt){const $=tt[W];if($.location>=0){let rt=J[W];if(rt===void 0&&(W==="instanceMatrix"&&v.instanceMatrix&&(rt=v.instanceMatrix),W==="instanceColor"&&v.instanceColor&&(rt=v.instanceColor)),rt!==void 0){const vt=rt.normalized,gt=rt.itemSize,nt=t.get(rt);if(nt===void 0)continue;const Ht=nt.buffer,et=nt.type,lt=nt.bytesPerElement,pt=et===n.INT||et===n.UNSIGNED_INT||rt.gpuType===Jo;if(rt.isInterleavedBufferAttribute){const ft=rt.data,it=ft.stride,ct=rt.offset;if(ft.isInstancedInterleavedBuffer){for(let ht=0;ht<$.locationSize;ht++)f($.location+ht,ft.meshPerAttribute);v.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=ft.meshPerAttribute*ft.count)}else for(let ht=0;ht<$.locationSize;ht++)p($.location+ht);n.bindBuffer(n.ARRAY_BUFFER,Ht);for(let ht=0;ht<$.locationSize;ht++)T($.location+ht,gt/$.locationSize,et,vt,it*lt,(ct+gt/$.locationSize*ht)*lt,pt)}else{if(rt.isInstancedBufferAttribute){for(let ft=0;ft<$.locationSize;ft++)f($.location+ft,rt.meshPerAttribute);v.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=rt.meshPerAttribute*rt.count)}else for(let ft=0;ft<$.locationSize;ft++)p($.location+ft);n.bindBuffer(n.ARRAY_BUFFER,Ht);for(let ft=0;ft<$.locationSize;ft++)T($.location+ft,gt/$.locationSize,et,vt,gt*lt,gt/$.locationSize*ft*lt,pt)}}else if(Q!==void 0){const vt=Q[W];if(vt!==void 0)switch(vt.length){case 2:n.vertexAttrib2fv($.location,vt);break;case 3:n.vertexAttrib3fv($.location,vt);break;case 4:n.vertexAttrib4fv($.location,vt);break;default:n.vertexAttrib1fv($.location,vt)}}}}E()}function N(){L();for(const v in i){const P=i[v];for(const G in P){const V=P[G];for(const J in V)h(V[J].object),delete V[J];delete P[G]}delete i[v]}}function b(v){if(i[v.id]===void 0)return;const P=i[v.id];for(const G in P){const V=P[G];for(const J in V)h(V[J].object),delete V[J];delete P[G]}delete i[v.id]}function C(v){for(const P in i){const G=i[P];if(G[v.id]===void 0)continue;const V=G[v.id];for(const J in V)h(V[J].object),delete V[J];delete G[v.id]}}function L(){y(),o=!0,r!==s&&(r=s,c(r.object))}function y(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:L,resetDefaultState:y,dispose:N,releaseStatesOfGeometry:b,releaseStatesOfProgram:C,initAttributes:x,enableAttribute:p,disableUnusedAttributes:E}}function yp(n,t,e){let i;function s(c){i=c}function r(c,h){n.drawArrays(i,c,h),e.update(h,i,1)}function o(c,h,u){u!==0&&(n.drawArraysInstanced(i,c,h,u),e.update(h,i,u))}function a(c,h,u){if(u===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,c,0,h,0,u);let m=0;for(let g=0;g<u;g++)m+=h[g];e.update(m,i,1)}function l(c,h,u,d){if(u===0)return;const m=t.get("WEBGL_multi_draw");if(m===null)for(let g=0;g<c.length;g++)o(c[g],h[g],d[g]);else{m.multiDrawArraysInstancedWEBGL(i,c,0,h,0,d,0,u);let g=0;for(let x=0;x<u;x++)g+=h[x]*d[x];e.update(g,i,1)}}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function Sp(n,t,e,i){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){const C=t.get("EXT_texture_filter_anisotropic");s=n.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(C){return!(C!==Je&&i.convert(C)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(C){const L=C===En&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(C!==An&&i.convert(C)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&C!==Mn&&!L)}function l(C){if(C==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";C="mediump"}return C==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp";const h=l(c);h!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const u=e.logarithmicDepthBuffer===!0,d=e.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),m=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=n.getParameter(n.MAX_TEXTURE_SIZE),p=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),f=n.getParameter(n.MAX_VERTEX_ATTRIBS),E=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),T=n.getParameter(n.MAX_VARYING_VECTORS),M=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),N=g>0,b=n.getParameter(n.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:u,reverseDepthBuffer:d,maxTextures:m,maxVertexTextures:g,maxTextureSize:x,maxCubemapSize:p,maxAttributes:f,maxVertexUniforms:E,maxVaryings:T,maxFragmentUniforms:M,vertexTextures:N,maxSamples:b}}function Ep(n){const t=this;let e=null,i=0,s=!1,r=!1;const o=new On,a=new Vt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){const m=u.length!==0||d||i!==0||s;return s=d,i=u.length,m},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){e=h(u,d,0)},this.setState=function(u,d,m){const g=u.clippingPlanes,x=u.clipIntersection,p=u.clipShadows,f=n.get(u);if(!s||g===null||g.length===0||r&&!p)r?h(null):c();else{const E=r?0:i,T=E*4;let M=f.clippingState||null;l.value=M,M=h(g,d,T,m);for(let N=0;N!==T;++N)M[N]=e[N];f.clippingState=M,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=E}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function h(u,d,m,g){const x=u!==null?u.length:0;let p=null;if(x!==0){if(p=l.value,g!==!0||p===null){const f=m+x*4,E=d.matrixWorldInverse;a.getNormalMatrix(E),(p===null||p.length<f)&&(p=new Float32Array(f));for(let T=0,M=m;T!==x;++T,M+=4)o.copy(u[T]).applyMatrix4(E,a),o.normal.toArray(p,M),p[M+3]=o.constant}l.value=p,l.needsUpdate=!0}return t.numPlanes=x,t.numIntersection=0,p}}function Tp(n){let t=new WeakMap;function e(o,a){return a===uo?o.mapping=Ni:a===fo&&(o.mapping=Fi),o}function i(o){if(o&&o.isTexture){const a=o.mapping;if(a===uo||a===fo)if(t.has(o)){const l=t.get(o).texture;return e(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new Uu(l.height);return c.fromEquirectangularTexture(n,o),t.set(o,c),o.addEventListener("dispose",s),e(c.texture,o.mapping)}else return null}}return o}function s(o){const a=o.target;a.removeEventListener("dispose",s);const l=t.get(a);l!==void 0&&(t.delete(a),l.dispose())}function r(){t=new WeakMap}return{get:i,dispose:r}}class ps extends Dc{constructor(t=-1,e=1,i=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=i,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,i,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=i-t,o=i+t,a=s+e,l=s-e;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}const Ri=4,$a=[.125,.215,.35,.446,.526,.582],Zn=20,Br=new ps,Ya=new Kt;let kr=null,zr=0,Hr=0,Gr=!1;const jn=(1+Math.sqrt(5))/2,Ti=1/jn,qa=[new H(-jn,Ti,0),new H(jn,Ti,0),new H(-Ti,0,jn),new H(Ti,0,jn),new H(0,jn,-Ti),new H(0,jn,Ti),new H(-1,1,-1),new H(1,1,-1),new H(-1,1,1),new H(1,1,1)];class ja{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,i=.1,s=100){kr=this._renderer.getRenderTarget(),zr=this._renderer.getActiveCubeFace(),Hr=this._renderer.getActiveMipmapLevel(),Gr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const r=this._allocateTargets();return r.depthBuffer=!0,this._sceneToCubeUV(t,i,s,r),e>0&&this._blur(r,0,0,e),this._applyPMREM(r),this._cleanup(r),r}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Ja(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Za(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(kr,zr,Hr),this._renderer.xr.enabled=Gr,t.scissorTest=!1,Os(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Ni||t.mapping===Fi?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),kr=this._renderer.getRenderTarget(),zr=this._renderer.getActiveCubeFace(),Hr=this._renderer.getActiveMipmapLevel(),Gr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=e||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,i={magFilter:an,minFilter:an,generateMipmaps:!1,type:En,format:Je,colorSpace:zi,depthBuffer:!1},s=Ka(t,e,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Ka(t,e,i);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=bp(r)),this._blurMaterial=Ap(r,t,e)}return s}_compileMaterial(t){const e=new ln(this._lodPlanes[0],t);this._renderer.compile(e,Br)}_sceneToCubeUV(t,e,i,s){const a=new je(90,1,e,i),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],h=this._renderer,u=h.autoClear,d=h.toneMapping;h.getClearColor(Ya),h.toneMapping=zn,h.autoClear=!1;const m=new ra({name:"PMREM.Background",side:Pe,depthWrite:!1,depthTest:!1}),g=new ln(new fs,m);let x=!1;const p=t.background;p?p.isColor&&(m.color.copy(p),t.background=null,x=!0):(m.color.copy(Ya),x=!0);for(let f=0;f<6;f++){const E=f%3;E===0?(a.up.set(0,l[f],0),a.lookAt(c[f],0,0)):E===1?(a.up.set(0,0,l[f]),a.lookAt(0,c[f],0)):(a.up.set(0,l[f],0),a.lookAt(0,0,c[f]));const T=this._cubeSize;Os(s,E*T,f>2?T:0,T,T),h.setRenderTarget(s),x&&h.render(g,a),h.render(t,a)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=d,h.autoClear=u,t.background=p}_textureToCubeUV(t,e){const i=this._renderer,s=t.mapping===Ni||t.mapping===Fi;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Ja()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Za());const r=s?this._cubemapMaterial:this._equirectMaterial,o=new ln(this._lodPlanes[0],r),a=r.uniforms;a.envMap.value=t;const l=this._cubeSize;Os(e,0,0,3*l,2*l),i.setRenderTarget(e),i.render(o,Br)}_applyPMREM(t){const e=this._renderer,i=e.autoClear;e.autoClear=!1;const s=this._lodPlanes.length;for(let r=1;r<s;r++){const o=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),a=qa[(s-r-1)%qa.length];this._blur(t,r-1,r,o,a)}e.autoClear=i}_blur(t,e,i,s,r){const o=this._pingPongRenderTarget;this._halfBlur(t,o,e,i,s,"latitudinal",r),this._halfBlur(o,t,i,i,s,"longitudinal",r)}_halfBlur(t,e,i,s,r,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,u=new ln(this._lodPlanes[s],c),d=c.uniforms,m=this._sizeLods[i]-1,g=isFinite(r)?Math.PI/(2*m):2*Math.PI/(2*Zn-1),x=r/g,p=isFinite(r)?1+Math.floor(h*x):Zn;p>Zn&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${Zn}`);const f=[];let E=0;for(let C=0;C<Zn;++C){const L=C/x,y=Math.exp(-L*L/2);f.push(y),C===0?E+=y:C<p&&(E+=2*y)}for(let C=0;C<f.length;C++)f[C]=f[C]/E;d.envMap.value=t.texture,d.samples.value=p,d.weights.value=f,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);const{_lodMax:T}=this;d.dTheta.value=g,d.mipInt.value=T-i;const M=this._sizeLods[s],N=3*M*(s>T-Ri?s-T+Ri:0),b=4*(this._cubeSize-M);Os(e,N,b,3*M,2*M),l.setRenderTarget(e),l.render(u,Br)}}function bp(n){const t=[],e=[],i=[];let s=n;const r=n-Ri+1+$a.length;for(let o=0;o<r;o++){const a=Math.pow(2,s);e.push(a);let l=1/a;o>n-Ri?l=$a[o-n+Ri-1]:o===0&&(l=0),i.push(l);const c=1/(a-2),h=-c,u=1+c,d=[h,h,u,h,u,u,h,h,u,u,h,u],m=6,g=6,x=3,p=2,f=1,E=new Float32Array(x*g*m),T=new Float32Array(p*g*m),M=new Float32Array(f*g*m);for(let b=0;b<m;b++){const C=b%3*2/3-1,L=b>2?0:-1,y=[C,L,0,C+2/3,L,0,C+2/3,L+1,0,C,L,0,C+2/3,L+1,0,C,L+1,0];E.set(y,x*g*b),T.set(d,p*g*b);const v=[b,b,b,b,b,b];M.set(v,f*g*b)}const N=new hn;N.setAttribute("position",new xe(E,x)),N.setAttribute("uv",new xe(T,p)),N.setAttribute("faceIndex",new xe(M,f)),t.push(N),s>Ri&&s--}return{lodPlanes:t,sizeLods:e,sigmas:i}}function Ka(n,t,e){const i=new en(n,t,e);return i.texture.mapping=ar,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Os(n,t,e,i,s){n.viewport.set(t,e,i,s),n.scissor.set(t,e,i,s)}function Ap(n,t,e){const i=new Float32Array(Zn),s=new H(0,1,0);return new Ee({name:"SphericalGaussianBlur",defines:{n:Zn,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:oa(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Sn,depthTest:!1,depthWrite:!1})}function Za(){return new Ee({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:oa(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Sn,depthTest:!1,depthWrite:!1})}function Ja(){return new Ee({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:oa(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Sn,depthTest:!1,depthWrite:!1})}function oa(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function wp(n){let t=new WeakMap,e=null;function i(a){if(a&&a.isTexture){const l=a.mapping,c=l===uo||l===fo,h=l===Ni||l===Fi;if(c||h){let u=t.get(a);const d=u!==void 0?u.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return e===null&&(e=new ja(n)),u=c?e.fromEquirectangular(a,u):e.fromCubemap(a,u),u.texture.pmremVersion=a.pmremVersion,t.set(a,u),u.texture;if(u!==void 0)return u.texture;{const m=a.image;return c&&m&&m.height>0||h&&m&&s(m)?(e===null&&(e=new ja(n)),u=c?e.fromEquirectangular(a):e.fromCubemap(a),u.texture.pmremVersion=a.pmremVersion,t.set(a,u),a.addEventListener("dispose",r),u.texture):null}}}return a}function s(a){let l=0;const c=6;for(let h=0;h<c;h++)a[h]!==void 0&&l++;return l===c}function r(a){const l=a.target;l.removeEventListener("dispose",r);const c=t.get(l);c!==void 0&&(t.delete(l),c.dispose())}function o(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:i,dispose:o}}function Rp(n){const t={};function e(i){if(t[i]!==void 0)return t[i];let s;switch(i){case"WEBGL_depth_texture":s=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=n.getExtension(i)}return t[i]=s,s}return{has:function(i){return e(i)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(i){const s=e(i);return s===null&&Qi("THREE.WebGLRenderer: "+i+" extension not supported."),s}}}function Cp(n,t,e,i){const s={},r=new WeakMap;function o(u){const d=u.target;d.index!==null&&t.remove(d.index);for(const g in d.attributes)t.remove(d.attributes[g]);for(const g in d.morphAttributes){const x=d.morphAttributes[g];for(let p=0,f=x.length;p<f;p++)t.remove(x[p])}d.removeEventListener("dispose",o),delete s[d.id];const m=r.get(d);m&&(t.remove(m),r.delete(d)),i.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,e.memory.geometries--}function a(u,d){return s[d.id]===!0||(d.addEventListener("dispose",o),s[d.id]=!0,e.memory.geometries++),d}function l(u){const d=u.attributes;for(const g in d)t.update(d[g],n.ARRAY_BUFFER);const m=u.morphAttributes;for(const g in m){const x=m[g];for(let p=0,f=x.length;p<f;p++)t.update(x[p],n.ARRAY_BUFFER)}}function c(u){const d=[],m=u.index,g=u.attributes.position;let x=0;if(m!==null){const E=m.array;x=m.version;for(let T=0,M=E.length;T<M;T+=3){const N=E[T+0],b=E[T+1],C=E[T+2];d.push(N,b,b,C,C,N)}}else if(g!==void 0){const E=g.array;x=g.version;for(let T=0,M=E.length/3-1;T<M;T+=3){const N=T+0,b=T+1,C=T+2;d.push(N,b,b,C,C,N)}}else return;const p=new(Tc(d)?Pc:Cc)(d,1);p.version=x;const f=r.get(u);f&&t.remove(f),r.set(u,p)}function h(u){const d=r.get(u);if(d){const m=u.index;m!==null&&d.version<m.version&&c(u)}else c(u);return r.get(u)}return{get:a,update:l,getWireframeAttribute:h}}function Pp(n,t,e){let i;function s(d){i=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function l(d,m){n.drawElements(i,m,r,d*o),e.update(m,i,1)}function c(d,m,g){g!==0&&(n.drawElementsInstanced(i,m,r,d*o,g),e.update(m,i,g))}function h(d,m,g){if(g===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,m,0,r,d,0,g);let p=0;for(let f=0;f<g;f++)p+=m[f];e.update(p,i,1)}function u(d,m,g,x){if(g===0)return;const p=t.get("WEBGL_multi_draw");if(p===null)for(let f=0;f<d.length;f++)c(d[f]/o,m[f],x[f]);else{p.multiDrawElementsInstancedWEBGL(i,m,0,r,d,0,x,0,g);let f=0;for(let E=0;E<g;E++)f+=m[E]*x[E];e.update(f,i,1)}}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function Lp(n){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,o,a){switch(e.calls++,o){case n.TRIANGLES:e.triangles+=a*(r/3);break;case n.LINES:e.lines+=a*(r/2);break;case n.LINE_STRIP:e.lines+=a*(r-1);break;case n.LINE_LOOP:e.lines+=a*r;break;case n.POINTS:e.points+=a*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:i}}function Dp(n,t,e){const i=new WeakMap,s=new he;function r(o,a,l){const c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0;let d=i.get(a);if(d===void 0||d.count!==u){let v=function(){L.dispose(),i.delete(a),a.removeEventListener("dispose",v)};var m=v;d!==void 0&&d.texture.dispose();const g=a.morphAttributes.position!==void 0,x=a.morphAttributes.normal!==void 0,p=a.morphAttributes.color!==void 0,f=a.morphAttributes.position||[],E=a.morphAttributes.normal||[],T=a.morphAttributes.color||[];let M=0;g===!0&&(M=1),x===!0&&(M=2),p===!0&&(M=3);let N=a.attributes.position.count*M,b=1;N>t.maxTextureSize&&(b=Math.ceil(N/t.maxTextureSize),N=t.maxTextureSize);const C=new Float32Array(N*b*4*u),L=new Ac(C,N,b,u);L.type=Mn,L.needsUpdate=!0;const y=M*4;for(let P=0;P<u;P++){const G=f[P],V=E[P],J=T[P],tt=N*b*4*P;for(let Q=0;Q<G.count;Q++){const W=Q*y;g===!0&&(s.fromBufferAttribute(G,Q),C[tt+W+0]=s.x,C[tt+W+1]=s.y,C[tt+W+2]=s.z,C[tt+W+3]=0),x===!0&&(s.fromBufferAttribute(V,Q),C[tt+W+4]=s.x,C[tt+W+5]=s.y,C[tt+W+6]=s.z,C[tt+W+7]=0),p===!0&&(s.fromBufferAttribute(J,Q),C[tt+W+8]=s.x,C[tt+W+9]=s.y,C[tt+W+10]=s.z,C[tt+W+11]=J.itemSize===4?s.w:1)}}d={count:u,texture:L,size:new Ft(N,b)},i.set(a,d),a.addEventListener("dispose",v)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",o.morphTexture,e);else{let g=0;for(let p=0;p<c.length;p++)g+=c[p];const x=a.morphTargetsRelative?1:1-g;l.getUniforms().setValue(n,"morphTargetBaseInfluence",x),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",d.texture,e),l.getUniforms().setValue(n,"morphTargetsTextureSize",d.size)}return{update:r}}function Ip(n,t,e,i){let s=new WeakMap;function r(l){const c=i.render.frame,h=l.geometry,u=t.get(l,h);if(s.get(u)!==c&&(t.update(u),s.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),s.get(l)!==c&&(e.update(l.instanceMatrix,n.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,n.ARRAY_BUFFER),s.set(l,c))),l.isSkinnedMesh){const d=l.skeleton;s.get(d)!==c&&(d.update(),s.set(d,c))}return u}function o(){s=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),e.remove(c.instanceMatrix),c.instanceColor!==null&&e.remove(c.instanceColor)}return{update:r,dispose:o}}class Fc extends Le{constructor(t,e,i,s,r,o,a,l,c,h=Pi){if(h!==Pi&&h!==Bi)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&h===Pi&&(i=si),i===void 0&&h===Bi&&(i=Oi),super(null,s,r,o,a,l,h,i,c),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=a!==void 0?a:tn,this.minFilter=l!==void 0?l:tn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}const Oc=new Le,Qa=new Fc(1,1),Bc=new Ac,kc=new vu,zc=new Ic,tl=[],el=[],nl=new Float32Array(16),il=new Float32Array(9),sl=new Float32Array(4);function Hi(n,t,e){const i=n[0];if(i<=0||i>0)return n;const s=t*e;let r=tl[s];if(r===void 0&&(r=new Float32Array(s),tl[s]=r),t!==0){i.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,n[o].toArray(r,a)}return r}function me(n,t){if(n.length!==t.length)return!1;for(let e=0,i=n.length;e<i;e++)if(n[e]!==t[e])return!1;return!0}function ge(n,t){for(let e=0,i=t.length;e<i;e++)n[e]=t[e]}function ur(n,t){let e=el[t];e===void 0&&(e=new Int32Array(t),el[t]=e);for(let i=0;i!==t;++i)e[i]=n.allocateTextureUnit();return e}function Up(n,t){const e=this.cache;e[0]!==t&&(n.uniform1f(this.addr,t),e[0]=t)}function Np(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(me(e,t))return;n.uniform2fv(this.addr,t),ge(e,t)}}function Fp(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(n.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(me(e,t))return;n.uniform3fv(this.addr,t),ge(e,t)}}function Op(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(me(e,t))return;n.uniform4fv(this.addr,t),ge(e,t)}}function Bp(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(me(e,t))return;n.uniformMatrix2fv(this.addr,!1,t),ge(e,t)}else{if(me(e,i))return;sl.set(i),n.uniformMatrix2fv(this.addr,!1,sl),ge(e,i)}}function kp(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(me(e,t))return;n.uniformMatrix3fv(this.addr,!1,t),ge(e,t)}else{if(me(e,i))return;il.set(i),n.uniformMatrix3fv(this.addr,!1,il),ge(e,i)}}function zp(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(me(e,t))return;n.uniformMatrix4fv(this.addr,!1,t),ge(e,t)}else{if(me(e,i))return;nl.set(i),n.uniformMatrix4fv(this.addr,!1,nl),ge(e,i)}}function Hp(n,t){const e=this.cache;e[0]!==t&&(n.uniform1i(this.addr,t),e[0]=t)}function Gp(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(me(e,t))return;n.uniform2iv(this.addr,t),ge(e,t)}}function Vp(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(me(e,t))return;n.uniform3iv(this.addr,t),ge(e,t)}}function Wp(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(me(e,t))return;n.uniform4iv(this.addr,t),ge(e,t)}}function Xp(n,t){const e=this.cache;e[0]!==t&&(n.uniform1ui(this.addr,t),e[0]=t)}function $p(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(me(e,t))return;n.uniform2uiv(this.addr,t),ge(e,t)}}function Yp(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(me(e,t))return;n.uniform3uiv(this.addr,t),ge(e,t)}}function qp(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(me(e,t))return;n.uniform4uiv(this.addr,t),ge(e,t)}}function jp(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let r;this.type===n.SAMPLER_2D_SHADOW?(Qa.compareFunction=Ec,r=Qa):r=Oc,e.setTexture2D(t||r,s)}function Kp(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture3D(t||kc,s)}function Zp(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTextureCube(t||zc,s)}function Jp(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture2DArray(t||Bc,s)}function Qp(n){switch(n){case 5126:return Up;case 35664:return Np;case 35665:return Fp;case 35666:return Op;case 35674:return Bp;case 35675:return kp;case 35676:return zp;case 5124:case 35670:return Hp;case 35667:case 35671:return Gp;case 35668:case 35672:return Vp;case 35669:case 35673:return Wp;case 5125:return Xp;case 36294:return $p;case 36295:return Yp;case 36296:return qp;case 35678:case 36198:case 36298:case 36306:case 35682:return jp;case 35679:case 36299:case 36307:return Kp;case 35680:case 36300:case 36308:case 36293:return Zp;case 36289:case 36303:case 36311:case 36292:return Jp}}function tm(n,t){n.uniform1fv(this.addr,t)}function em(n,t){const e=Hi(t,this.size,2);n.uniform2fv(this.addr,e)}function nm(n,t){const e=Hi(t,this.size,3);n.uniform3fv(this.addr,e)}function im(n,t){const e=Hi(t,this.size,4);n.uniform4fv(this.addr,e)}function sm(n,t){const e=Hi(t,this.size,4);n.uniformMatrix2fv(this.addr,!1,e)}function rm(n,t){const e=Hi(t,this.size,9);n.uniformMatrix3fv(this.addr,!1,e)}function om(n,t){const e=Hi(t,this.size,16);n.uniformMatrix4fv(this.addr,!1,e)}function am(n,t){n.uniform1iv(this.addr,t)}function lm(n,t){n.uniform2iv(this.addr,t)}function cm(n,t){n.uniform3iv(this.addr,t)}function hm(n,t){n.uniform4iv(this.addr,t)}function um(n,t){n.uniform1uiv(this.addr,t)}function dm(n,t){n.uniform2uiv(this.addr,t)}function fm(n,t){n.uniform3uiv(this.addr,t)}function pm(n,t){n.uniform4uiv(this.addr,t)}function mm(n,t,e){const i=this.cache,s=t.length,r=ur(e,s);me(i,r)||(n.uniform1iv(this.addr,r),ge(i,r));for(let o=0;o!==s;++o)e.setTexture2D(t[o]||Oc,r[o])}function gm(n,t,e){const i=this.cache,s=t.length,r=ur(e,s);me(i,r)||(n.uniform1iv(this.addr,r),ge(i,r));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||kc,r[o])}function _m(n,t,e){const i=this.cache,s=t.length,r=ur(e,s);me(i,r)||(n.uniform1iv(this.addr,r),ge(i,r));for(let o=0;o!==s;++o)e.setTextureCube(t[o]||zc,r[o])}function xm(n,t,e){const i=this.cache,s=t.length,r=ur(e,s);me(i,r)||(n.uniform1iv(this.addr,r),ge(i,r));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||Bc,r[o])}function vm(n){switch(n){case 5126:return tm;case 35664:return em;case 35665:return nm;case 35666:return im;case 35674:return sm;case 35675:return rm;case 35676:return om;case 5124:case 35670:return am;case 35667:case 35671:return lm;case 35668:case 35672:return cm;case 35669:case 35673:return hm;case 5125:return um;case 36294:return dm;case 36295:return fm;case 36296:return pm;case 35678:case 36198:case 36298:case 36306:case 35682:return mm;case 35679:case 36299:case 36307:return gm;case 35680:case 36300:case 36308:case 36293:return _m;case 36289:case 36303:case 36311:case 36292:return xm}}class Mm{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.setValue=Qp(e.type)}}class ym{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=vm(e.type)}}class Sm{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,i){const s=this.seq;for(let r=0,o=s.length;r!==o;++r){const a=s[r];a.setValue(t,e[a.id],i)}}}const Vr=/(\w+)(\])?(\[|\.)?/g;function rl(n,t){n.seq.push(t),n.map[t.id]=t}function Em(n,t,e){const i=n.name,s=i.length;for(Vr.lastIndex=0;;){const r=Vr.exec(i),o=Vr.lastIndex;let a=r[1];const l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){rl(e,c===void 0?new Mm(a,n,t):new ym(a,n,t));break}else{let u=e.map[a];u===void 0&&(u=new Sm(a),rl(e,u)),e=u}}}class Js{constructor(t,e){this.seq=[],this.map={};const i=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let s=0;s<i;++s){const r=t.getActiveUniform(e,s),o=t.getUniformLocation(e,r.name);Em(r,o,this)}}setValue(t,e,i,s){const r=this.map[e];r!==void 0&&r.setValue(t,i,s)}setOptional(t,e,i){const s=e[i];s!==void 0&&this.setValue(t,i,s)}static upload(t,e,i,s){for(let r=0,o=e.length;r!==o;++r){const a=e[r],l=i[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,s)}}static seqWithValue(t,e){const i=[];for(let s=0,r=t.length;s!==r;++s){const o=t[s];o.id in e&&i.push(o)}return i}}function ol(n,t,e){const i=n.createShader(t);return n.shaderSource(i,e),n.compileShader(i),i}const Tm=37297;let bm=0;function Am(n,t){const e=n.split(`
`),i=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=s;o<r;o++){const a=o+1;i.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return i.join(`
`)}const al=new Vt;function wm(n){jt._getMatrix(al,jt.workingColorSpace,n);const t=`mat3( ${al.elements.map(e=>e.toFixed(4))} )`;switch(jt.getTransfer(n)){case lr:return[t,"LinearTransferOETF"];case ne:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",n),[t,"LinearTransferOETF"]}}function ll(n,t,e){const i=n.getShaderParameter(t,n.COMPILE_STATUS),s=n.getShaderInfoLog(t).trim();if(i&&s==="")return"";const r=/ERROR: 0:(\d+)/.exec(s);if(r){const o=parseInt(r[1]);return e.toUpperCase()+`

`+s+`

`+Am(n.getShaderSource(t),o)}else return s}function Rm(n,t){const e=wm(t);return[`vec4 ${n}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function Cm(n,t){let e;switch(t){case oc:e="Linear";break;case ac:e="Reinhard";break;case lc:e="Cineon";break;case cc:e="ACESFilmic";break;case hc:e="AgX";break;case uc:e="Neutral";break;case Kh:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+n+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const Bs=new H;function Pm(){jt.getLuminanceCoefficients(Bs);const n=Bs.x.toFixed(4),t=Bs.y.toFixed(4),e=Bs.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Lm(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(ts).join(`
`)}function Dm(n){const t=[];for(const e in n){const i=n[e];i!==!1&&t.push("#define "+e+" "+i)}return t.join(`
`)}function Im(n,t){const e={},i=n.getProgramParameter(t,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){const r=n.getActiveAttrib(t,s),o=r.name;let a=1;r.type===n.FLOAT_MAT2&&(a=2),r.type===n.FLOAT_MAT3&&(a=3),r.type===n.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:n.getAttribLocation(t,o),locationSize:a}}return e}function ts(n){return n!==""}function cl(n,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function hl(n,t){return n.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const Um=/^[ \t]*#include +<([\w\d./]+)>/gm;function Vo(n){return n.replace(Um,Fm)}const Nm=new Map;function Fm(n,t){let e=Xt[t];if(e===void 0){const i=Nm.get(t);if(i!==void 0)e=Xt[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("Can not resolve #include <"+t+">")}return Vo(e)}const Om=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ul(n){return n.replace(Om,Bm)}function Bm(n,t,e,i){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function dl(n){let t=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?t+=`
#define HIGH_PRECISION`:n.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function km(n){let t="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===sc?t="SHADOWMAP_TYPE_PCF":n.shadowMapType===Ch?t="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===_n&&(t="SHADOWMAP_TYPE_VSM"),t}function zm(n){let t="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case Ni:case Fi:t="ENVMAP_TYPE_CUBE";break;case ar:t="ENVMAP_TYPE_CUBE_UV";break}return t}function Hm(n){let t="ENVMAP_MODE_REFLECTION";if(n.envMap)switch(n.envMapMode){case Fi:t="ENVMAP_MODE_REFRACTION";break}return t}function Gm(n){let t="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case rc:t="ENVMAP_BLENDING_MULTIPLY";break;case qh:t="ENVMAP_BLENDING_MIX";break;case jh:t="ENVMAP_BLENDING_ADD";break}return t}function Vm(n){const t=n.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:i,maxMip:e}}function Wm(n,t,e,i){const s=n.getContext(),r=e.defines;let o=e.vertexShader,a=e.fragmentShader;const l=km(e),c=zm(e),h=Hm(e),u=Gm(e),d=Vm(e),m=Lm(e),g=Dm(r),x=s.createProgram();let p,f,E=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(ts).join(`
`),p.length>0&&(p+=`
`),f=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(ts).join(`
`),f.length>0&&(f+=`
`)):(p=[dl(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(ts).join(`
`),f=[dl(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==zn?"#define TONE_MAPPING":"",e.toneMapping!==zn?Xt.tonemapping_pars_fragment:"",e.toneMapping!==zn?Cm("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Xt.colorspace_pars_fragment,Rm("linearToOutputTexel",e.outputColorSpace),Pm(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(ts).join(`
`)),o=Vo(o),o=cl(o,e),o=hl(o,e),a=Vo(a),a=cl(a,e),a=hl(a,e),o=ul(o),a=ul(a),e.isRawShaderMaterial!==!0&&(E=`#version 300 es
`,p=[m,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,f=["#define varying in",e.glslVersion===ba?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===ba?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+f);const T=E+p+o,M=E+f+a,N=ol(s,s.VERTEX_SHADER,T),b=ol(s,s.FRAGMENT_SHADER,M);s.attachShader(x,N),s.attachShader(x,b),e.index0AttributeName!==void 0?s.bindAttribLocation(x,0,e.index0AttributeName):e.morphTargets===!0&&s.bindAttribLocation(x,0,"position"),s.linkProgram(x);function C(P){if(n.debug.checkShaderErrors){const G=s.getProgramInfoLog(x).trim(),V=s.getShaderInfoLog(N).trim(),J=s.getShaderInfoLog(b).trim();let tt=!0,Q=!0;if(s.getProgramParameter(x,s.LINK_STATUS)===!1)if(tt=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,x,N,b);else{const W=ll(s,N,"vertex"),$=ll(s,b,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(x,s.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+G+`
`+W+`
`+$)}else G!==""?console.warn("THREE.WebGLProgram: Program Info Log:",G):(V===""||J==="")&&(Q=!1);Q&&(P.diagnostics={runnable:tt,programLog:G,vertexShader:{log:V,prefix:p},fragmentShader:{log:J,prefix:f}})}s.deleteShader(N),s.deleteShader(b),L=new Js(s,x),y=Im(s,x)}let L;this.getUniforms=function(){return L===void 0&&C(this),L};let y;this.getAttributes=function(){return y===void 0&&C(this),y};let v=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return v===!1&&(v=s.getProgramParameter(x,Tm)),v},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(x),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=bm++,this.cacheKey=t,this.usedTimes=1,this.program=x,this.vertexShader=N,this.fragmentShader=b,this}let Xm=0;class $m{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,i=t.fragmentShader,s=this._getShaderStage(e),r=this._getShaderStage(i),o=this._getShaderCacheForMaterial(t);return o.has(s)===!1&&(o.add(s),s.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const i of e)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let i=e.get(t);return i===void 0&&(i=new Set,e.set(t,i)),i}_getShaderStage(t){const e=this.shaderCache;let i=e.get(t);return i===void 0&&(i=new Ym(t),e.set(t,i)),i}}class Ym{constructor(t){this.id=Xm++,this.code=t,this.usedTimes=0}}function qm(n,t,e,i,s,r,o){const a=new wc,l=new $m,c=new Set,h=[],u=s.logarithmicDepthBuffer,d=s.vertexTextures;let m=s.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(y){return c.add(y),y===0?"uv":`uv${y}`}function p(y,v,P,G,V){const J=G.fog,tt=V.geometry,Q=y.isMeshStandardMaterial?G.environment:null,W=(y.isMeshStandardMaterial?e:t).get(y.envMap||Q),$=W&&W.mapping===ar?W.image.height:null,rt=g[y.type];y.precision!==null&&(m=s.getMaxPrecision(y.precision),m!==y.precision&&console.warn("THREE.WebGLProgram.getParameters:",y.precision,"not supported, using",m,"instead."));const vt=tt.morphAttributes.position||tt.morphAttributes.normal||tt.morphAttributes.color,gt=vt!==void 0?vt.length:0;let nt=0;tt.morphAttributes.position!==void 0&&(nt=1),tt.morphAttributes.normal!==void 0&&(nt=2),tt.morphAttributes.color!==void 0&&(nt=3);let Ht,et,lt,pt;if(rt){const qt=on[rt];Ht=qt.vertexShader,et=qt.fragmentShader}else Ht=y.vertexShader,et=y.fragmentShader,l.update(y),lt=l.getVertexShaderID(y),pt=l.getFragmentShaderID(y);const ft=n.getRenderTarget(),it=n.state.buffers.depth.getReversed(),ct=V.isInstancedMesh===!0,ht=V.isBatchedMesh===!0,Tt=!!y.map,yt=!!y.matcap,Lt=!!W,D=!!y.aoMap,Yt=!!y.lightMap,Ot=!!y.bumpMap,zt=!!y.normalMap,bt=!!y.displacementMap,Wt=!!y.emissiveMap,At=!!y.metalnessMap,A=!!y.roughnessMap,_=y.anisotropy>0,R=y.clearcoat>0,w=y.dispersion>0,I=y.iridescence>0,U=y.sheen>0,Z=y.transmission>0,B=_&&!!y.anisotropyMap,Y=R&&!!y.clearcoatMap,ot=R&&!!y.clearcoatNormalMap,X=R&&!!y.clearcoatRoughnessMap,st=I&&!!y.iridescenceMap,ut=I&&!!y.iridescenceThicknessMap,St=U&&!!y.sheenColorMap,dt=U&&!!y.sheenRoughnessMap,Ut=!!y.specularMap,Pt=!!y.specularColorMap,Bt=!!y.specularIntensityMap,F=Z&&!!y.transmissionMap,xt=Z&&!!y.thicknessMap,O=!!y.gradientMap,K=!!y.alphaMap,at=y.alphaTest>0,_t=!!y.alphaHash,It=!!y.extensions;let $t=zn;y.toneMapped&&(ft===null||ft.isXRRenderTarget===!0)&&($t=n.toneMapping);const Jt={shaderID:rt,shaderType:y.type,shaderName:y.name,vertexShader:Ht,fragmentShader:et,defines:y.defines,customVertexShaderID:lt,customFragmentShaderID:pt,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:m,batching:ht,batchingColor:ht&&V._colorsTexture!==null,instancing:ct,instancingColor:ct&&V.instanceColor!==null,instancingMorph:ct&&V.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:ft===null?n.outputColorSpace:ft.isXRRenderTarget===!0?ft.texture.colorSpace:zi,alphaToCoverage:!!y.alphaToCoverage,map:Tt,matcap:yt,envMap:Lt,envMapMode:Lt&&W.mapping,envMapCubeUVHeight:$,aoMap:D,lightMap:Yt,bumpMap:Ot,normalMap:zt,displacementMap:d&&bt,emissiveMap:Wt,normalMapObjectSpace:zt&&y.normalMapType===eu,normalMapTangentSpace:zt&&y.normalMapType===tu,metalnessMap:At,roughnessMap:A,anisotropy:_,anisotropyMap:B,clearcoat:R,clearcoatMap:Y,clearcoatNormalMap:ot,clearcoatRoughnessMap:X,dispersion:w,iridescence:I,iridescenceMap:st,iridescenceThicknessMap:ut,sheen:U,sheenColorMap:St,sheenRoughnessMap:dt,specularMap:Ut,specularColorMap:Pt,specularIntensityMap:Bt,transmission:Z,transmissionMap:F,thicknessMap:xt,gradientMap:O,opaque:y.transparent===!1&&y.blending===ei&&y.alphaToCoverage===!1,alphaMap:K,alphaTest:at,alphaHash:_t,combine:y.combine,mapUv:Tt&&x(y.map.channel),aoMapUv:D&&x(y.aoMap.channel),lightMapUv:Yt&&x(y.lightMap.channel),bumpMapUv:Ot&&x(y.bumpMap.channel),normalMapUv:zt&&x(y.normalMap.channel),displacementMapUv:bt&&x(y.displacementMap.channel),emissiveMapUv:Wt&&x(y.emissiveMap.channel),metalnessMapUv:At&&x(y.metalnessMap.channel),roughnessMapUv:A&&x(y.roughnessMap.channel),anisotropyMapUv:B&&x(y.anisotropyMap.channel),clearcoatMapUv:Y&&x(y.clearcoatMap.channel),clearcoatNormalMapUv:ot&&x(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:X&&x(y.clearcoatRoughnessMap.channel),iridescenceMapUv:st&&x(y.iridescenceMap.channel),iridescenceThicknessMapUv:ut&&x(y.iridescenceThicknessMap.channel),sheenColorMapUv:St&&x(y.sheenColorMap.channel),sheenRoughnessMapUv:dt&&x(y.sheenRoughnessMap.channel),specularMapUv:Ut&&x(y.specularMap.channel),specularColorMapUv:Pt&&x(y.specularColorMap.channel),specularIntensityMapUv:Bt&&x(y.specularIntensityMap.channel),transmissionMapUv:F&&x(y.transmissionMap.channel),thicknessMapUv:xt&&x(y.thicknessMap.channel),alphaMapUv:K&&x(y.alphaMap.channel),vertexTangents:!!tt.attributes.tangent&&(zt||_),vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!tt.attributes.color&&tt.attributes.color.itemSize===4,pointsUvs:V.isPoints===!0&&!!tt.attributes.uv&&(Tt||K),fog:!!J,useFog:y.fog===!0,fogExp2:!!J&&J.isFogExp2,flatShading:y.flatShading===!0,sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:u,reverseDepthBuffer:it,skinning:V.isSkinnedMesh===!0,morphTargets:tt.morphAttributes.position!==void 0,morphNormals:tt.morphAttributes.normal!==void 0,morphColors:tt.morphAttributes.color!==void 0,morphTargetsCount:gt,morphTextureStride:nt,numDirLights:v.directional.length,numPointLights:v.point.length,numSpotLights:v.spot.length,numSpotLightMaps:v.spotLightMap.length,numRectAreaLights:v.rectArea.length,numHemiLights:v.hemi.length,numDirLightShadows:v.directionalShadowMap.length,numPointLightShadows:v.pointShadowMap.length,numSpotLightShadows:v.spotShadowMap.length,numSpotLightShadowsWithMaps:v.numSpotLightShadowsWithMaps,numLightProbes:v.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:y.dithering,shadowMapEnabled:n.shadowMap.enabled&&P.length>0,shadowMapType:n.shadowMap.type,toneMapping:$t,decodeVideoTexture:Tt&&y.map.isVideoTexture===!0&&jt.getTransfer(y.map.colorSpace)===ne,decodeVideoTextureEmissive:Wt&&y.emissiveMap.isVideoTexture===!0&&jt.getTransfer(y.emissiveMap.colorSpace)===ne,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===vn,flipSided:y.side===Pe,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:It&&y.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(It&&y.extensions.multiDraw===!0||ht)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return Jt.vertexUv1s=c.has(1),Jt.vertexUv2s=c.has(2),Jt.vertexUv3s=c.has(3),c.clear(),Jt}function f(y){const v=[];if(y.shaderID?v.push(y.shaderID):(v.push(y.customVertexShaderID),v.push(y.customFragmentShaderID)),y.defines!==void 0)for(const P in y.defines)v.push(P),v.push(y.defines[P]);return y.isRawShaderMaterial===!1&&(E(v,y),T(v,y),v.push(n.outputColorSpace)),v.push(y.customProgramCacheKey),v.join()}function E(y,v){y.push(v.precision),y.push(v.outputColorSpace),y.push(v.envMapMode),y.push(v.envMapCubeUVHeight),y.push(v.mapUv),y.push(v.alphaMapUv),y.push(v.lightMapUv),y.push(v.aoMapUv),y.push(v.bumpMapUv),y.push(v.normalMapUv),y.push(v.displacementMapUv),y.push(v.emissiveMapUv),y.push(v.metalnessMapUv),y.push(v.roughnessMapUv),y.push(v.anisotropyMapUv),y.push(v.clearcoatMapUv),y.push(v.clearcoatNormalMapUv),y.push(v.clearcoatRoughnessMapUv),y.push(v.iridescenceMapUv),y.push(v.iridescenceThicknessMapUv),y.push(v.sheenColorMapUv),y.push(v.sheenRoughnessMapUv),y.push(v.specularMapUv),y.push(v.specularColorMapUv),y.push(v.specularIntensityMapUv),y.push(v.transmissionMapUv),y.push(v.thicknessMapUv),y.push(v.combine),y.push(v.fogExp2),y.push(v.sizeAttenuation),y.push(v.morphTargetsCount),y.push(v.morphAttributeCount),y.push(v.numDirLights),y.push(v.numPointLights),y.push(v.numSpotLights),y.push(v.numSpotLightMaps),y.push(v.numHemiLights),y.push(v.numRectAreaLights),y.push(v.numDirLightShadows),y.push(v.numPointLightShadows),y.push(v.numSpotLightShadows),y.push(v.numSpotLightShadowsWithMaps),y.push(v.numLightProbes),y.push(v.shadowMapType),y.push(v.toneMapping),y.push(v.numClippingPlanes),y.push(v.numClipIntersection),y.push(v.depthPacking)}function T(y,v){a.disableAll(),v.supportsVertexTextures&&a.enable(0),v.instancing&&a.enable(1),v.instancingColor&&a.enable(2),v.instancingMorph&&a.enable(3),v.matcap&&a.enable(4),v.envMap&&a.enable(5),v.normalMapObjectSpace&&a.enable(6),v.normalMapTangentSpace&&a.enable(7),v.clearcoat&&a.enable(8),v.iridescence&&a.enable(9),v.alphaTest&&a.enable(10),v.vertexColors&&a.enable(11),v.vertexAlphas&&a.enable(12),v.vertexUv1s&&a.enable(13),v.vertexUv2s&&a.enable(14),v.vertexUv3s&&a.enable(15),v.vertexTangents&&a.enable(16),v.anisotropy&&a.enable(17),v.alphaHash&&a.enable(18),v.batching&&a.enable(19),v.dispersion&&a.enable(20),v.batchingColor&&a.enable(21),y.push(a.mask),a.disableAll(),v.fog&&a.enable(0),v.useFog&&a.enable(1),v.flatShading&&a.enable(2),v.logarithmicDepthBuffer&&a.enable(3),v.reverseDepthBuffer&&a.enable(4),v.skinning&&a.enable(5),v.morphTargets&&a.enable(6),v.morphNormals&&a.enable(7),v.morphColors&&a.enable(8),v.premultipliedAlpha&&a.enable(9),v.shadowMapEnabled&&a.enable(10),v.doubleSided&&a.enable(11),v.flipSided&&a.enable(12),v.useDepthPacking&&a.enable(13),v.dithering&&a.enable(14),v.transmission&&a.enable(15),v.sheen&&a.enable(16),v.opaque&&a.enable(17),v.pointsUvs&&a.enable(18),v.decodeVideoTexture&&a.enable(19),v.decodeVideoTextureEmissive&&a.enable(20),v.alphaToCoverage&&a.enable(21),y.push(a.mask)}function M(y){const v=g[y.type];let P;if(v){const G=on[v];P=as.clone(G.uniforms)}else P=y.uniforms;return P}function N(y,v){let P;for(let G=0,V=h.length;G<V;G++){const J=h[G];if(J.cacheKey===v){P=J,++P.usedTimes;break}}return P===void 0&&(P=new Wm(n,v,y,r),h.push(P)),P}function b(y){if(--y.usedTimes===0){const v=h.indexOf(y);h[v]=h[h.length-1],h.pop(),y.destroy()}}function C(y){l.remove(y)}function L(){l.dispose()}return{getParameters:p,getProgramCacheKey:f,getUniforms:M,acquireProgram:N,releaseProgram:b,releaseShaderCache:C,programs:h,dispose:L}}function jm(){let n=new WeakMap;function t(o){return n.has(o)}function e(o){let a=n.get(o);return a===void 0&&(a={},n.set(o,a)),a}function i(o){n.delete(o)}function s(o,a,l){n.get(o)[a]=l}function r(){n=new WeakMap}return{has:t,get:e,remove:i,update:s,dispose:r}}function Km(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.material.id!==t.material.id?n.material.id-t.material.id:n.z!==t.z?n.z-t.z:n.id-t.id}function fl(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.z!==t.z?t.z-n.z:n.id-t.id}function pl(){const n=[];let t=0;const e=[],i=[],s=[];function r(){t=0,e.length=0,i.length=0,s.length=0}function o(u,d,m,g,x,p){let f=n[t];return f===void 0?(f={id:u.id,object:u,geometry:d,material:m,groupOrder:g,renderOrder:u.renderOrder,z:x,group:p},n[t]=f):(f.id=u.id,f.object=u,f.geometry=d,f.material=m,f.groupOrder=g,f.renderOrder=u.renderOrder,f.z=x,f.group=p),t++,f}function a(u,d,m,g,x,p){const f=o(u,d,m,g,x,p);m.transmission>0?i.push(f):m.transparent===!0?s.push(f):e.push(f)}function l(u,d,m,g,x,p){const f=o(u,d,m,g,x,p);m.transmission>0?i.unshift(f):m.transparent===!0?s.unshift(f):e.unshift(f)}function c(u,d){e.length>1&&e.sort(u||Km),i.length>1&&i.sort(d||fl),s.length>1&&s.sort(d||fl)}function h(){for(let u=t,d=n.length;u<d;u++){const m=n[u];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:e,transmissive:i,transparent:s,init:r,push:a,unshift:l,finish:h,sort:c}}function Zm(){let n=new WeakMap;function t(i,s){const r=n.get(i);let o;return r===void 0?(o=new pl,n.set(i,[o])):s>=r.length?(o=new pl,r.push(o)):o=r[s],o}function e(){n=new WeakMap}return{get:t,dispose:e}}function Jm(){const n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new H,color:new Kt};break;case"SpotLight":e={position:new H,direction:new H,color:new Kt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new H,color:new Kt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new H,skyColor:new Kt,groundColor:new Kt};break;case"RectAreaLight":e={color:new Kt,position:new H,halfWidth:new H,halfHeight:new H};break}return n[t.id]=e,e}}}function Qm(){const n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ft};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ft};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ft,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[t.id]=e,e}}}let t0=0;function e0(n,t){return(t.castShadow?2:0)-(n.castShadow?2:0)+(t.map?1:0)-(n.map?1:0)}function n0(n){const t=new Jm,e=Qm(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new H);const s=new H,r=new ue,o=new ue;function a(c){let h=0,u=0,d=0;for(let y=0;y<9;y++)i.probe[y].set(0,0,0);let m=0,g=0,x=0,p=0,f=0,E=0,T=0,M=0,N=0,b=0,C=0;c.sort(e0);for(let y=0,v=c.length;y<v;y++){const P=c[y],G=P.color,V=P.intensity,J=P.distance,tt=P.shadow&&P.shadow.map?P.shadow.map.texture:null;if(P.isAmbientLight)h+=G.r*V,u+=G.g*V,d+=G.b*V;else if(P.isLightProbe){for(let Q=0;Q<9;Q++)i.probe[Q].addScaledVector(P.sh.coefficients[Q],V);C++}else if(P.isDirectionalLight){const Q=t.get(P);if(Q.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){const W=P.shadow,$=e.get(P);$.shadowIntensity=W.intensity,$.shadowBias=W.bias,$.shadowNormalBias=W.normalBias,$.shadowRadius=W.radius,$.shadowMapSize=W.mapSize,i.directionalShadow[m]=$,i.directionalShadowMap[m]=tt,i.directionalShadowMatrix[m]=P.shadow.matrix,E++}i.directional[m]=Q,m++}else if(P.isSpotLight){const Q=t.get(P);Q.position.setFromMatrixPosition(P.matrixWorld),Q.color.copy(G).multiplyScalar(V),Q.distance=J,Q.coneCos=Math.cos(P.angle),Q.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),Q.decay=P.decay,i.spot[x]=Q;const W=P.shadow;if(P.map&&(i.spotLightMap[N]=P.map,N++,W.updateMatrices(P),P.castShadow&&b++),i.spotLightMatrix[x]=W.matrix,P.castShadow){const $=e.get(P);$.shadowIntensity=W.intensity,$.shadowBias=W.bias,$.shadowNormalBias=W.normalBias,$.shadowRadius=W.radius,$.shadowMapSize=W.mapSize,i.spotShadow[x]=$,i.spotShadowMap[x]=tt,M++}x++}else if(P.isRectAreaLight){const Q=t.get(P);Q.color.copy(G).multiplyScalar(V),Q.halfWidth.set(P.width*.5,0,0),Q.halfHeight.set(0,P.height*.5,0),i.rectArea[p]=Q,p++}else if(P.isPointLight){const Q=t.get(P);if(Q.color.copy(P.color).multiplyScalar(P.intensity),Q.distance=P.distance,Q.decay=P.decay,P.castShadow){const W=P.shadow,$=e.get(P);$.shadowIntensity=W.intensity,$.shadowBias=W.bias,$.shadowNormalBias=W.normalBias,$.shadowRadius=W.radius,$.shadowMapSize=W.mapSize,$.shadowCameraNear=W.camera.near,$.shadowCameraFar=W.camera.far,i.pointShadow[g]=$,i.pointShadowMap[g]=tt,i.pointShadowMatrix[g]=P.shadow.matrix,T++}i.point[g]=Q,g++}else if(P.isHemisphereLight){const Q=t.get(P);Q.skyColor.copy(P.color).multiplyScalar(V),Q.groundColor.copy(P.groundColor).multiplyScalar(V),i.hemi[f]=Q,f++}}p>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=Mt.LTC_FLOAT_1,i.rectAreaLTC2=Mt.LTC_FLOAT_2):(i.rectAreaLTC1=Mt.LTC_HALF_1,i.rectAreaLTC2=Mt.LTC_HALF_2)),i.ambient[0]=h,i.ambient[1]=u,i.ambient[2]=d;const L=i.hash;(L.directionalLength!==m||L.pointLength!==g||L.spotLength!==x||L.rectAreaLength!==p||L.hemiLength!==f||L.numDirectionalShadows!==E||L.numPointShadows!==T||L.numSpotShadows!==M||L.numSpotMaps!==N||L.numLightProbes!==C)&&(i.directional.length=m,i.spot.length=x,i.rectArea.length=p,i.point.length=g,i.hemi.length=f,i.directionalShadow.length=E,i.directionalShadowMap.length=E,i.pointShadow.length=T,i.pointShadowMap.length=T,i.spotShadow.length=M,i.spotShadowMap.length=M,i.directionalShadowMatrix.length=E,i.pointShadowMatrix.length=T,i.spotLightMatrix.length=M+N-b,i.spotLightMap.length=N,i.numSpotLightShadowsWithMaps=b,i.numLightProbes=C,L.directionalLength=m,L.pointLength=g,L.spotLength=x,L.rectAreaLength=p,L.hemiLength=f,L.numDirectionalShadows=E,L.numPointShadows=T,L.numSpotShadows=M,L.numSpotMaps=N,L.numLightProbes=C,i.version=t0++)}function l(c,h){let u=0,d=0,m=0,g=0,x=0;const p=h.matrixWorldInverse;for(let f=0,E=c.length;f<E;f++){const T=c[f];if(T.isDirectionalLight){const M=i.directional[u];M.direction.setFromMatrixPosition(T.matrixWorld),s.setFromMatrixPosition(T.target.matrixWorld),M.direction.sub(s),M.direction.transformDirection(p),u++}else if(T.isSpotLight){const M=i.spot[m];M.position.setFromMatrixPosition(T.matrixWorld),M.position.applyMatrix4(p),M.direction.setFromMatrixPosition(T.matrixWorld),s.setFromMatrixPosition(T.target.matrixWorld),M.direction.sub(s),M.direction.transformDirection(p),m++}else if(T.isRectAreaLight){const M=i.rectArea[g];M.position.setFromMatrixPosition(T.matrixWorld),M.position.applyMatrix4(p),o.identity(),r.copy(T.matrixWorld),r.premultiply(p),o.extractRotation(r),M.halfWidth.set(T.width*.5,0,0),M.halfHeight.set(0,T.height*.5,0),M.halfWidth.applyMatrix4(o),M.halfHeight.applyMatrix4(o),g++}else if(T.isPointLight){const M=i.point[d];M.position.setFromMatrixPosition(T.matrixWorld),M.position.applyMatrix4(p),d++}else if(T.isHemisphereLight){const M=i.hemi[x];M.direction.setFromMatrixPosition(T.matrixWorld),M.direction.transformDirection(p),x++}}}return{setup:a,setupView:l,state:i}}function ml(n){const t=new n0(n),e=[],i=[];function s(h){c.camera=h,e.length=0,i.length=0}function r(h){e.push(h)}function o(h){i.push(h)}function a(){t.setup(e)}function l(h){t.setupView(e,h)}const c={lightsArray:e,shadowsArray:i,camera:null,lights:t,transmissionRenderTarget:{}};return{init:s,state:c,setupLights:a,setupLightsView:l,pushLight:r,pushShadow:o}}function i0(n){let t=new WeakMap;function e(s,r=0){const o=t.get(s);let a;return o===void 0?(a=new ml(n),t.set(s,[a])):r>=o.length?(a=new ml(n),o.push(a)):a=o[r],a}function i(){t=new WeakMap}return{get:e,dispose:i}}class s0 extends ds{static get type(){return"MeshDepthMaterial"}constructor(t){super(),this.isMeshDepthMaterial=!0,this.depthPacking=Jh,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class r0 extends ds{static get type(){return"MeshDistanceMaterial"}constructor(t){super(),this.isMeshDistanceMaterial=!0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}const o0=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,a0=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function l0(n,t,e){let i=new Uc;const s=new Ft,r=new Ft,o=new he,a=new s0({depthPacking:Qh}),l=new r0,c={},h=e.maxTextureSize,u={[Hn]:Pe,[Pe]:Hn,[vn]:vn},d=new Ee({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ft},radius:{value:4}},vertexShader:o0,fragmentShader:a0}),m=d.clone();m.defines.HORIZONTAL_PASS=1;const g=new hn;g.setAttribute("position",new xe(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new ln(g,d),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=sc;let f=this.type;this.render=function(b,C,L){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||b.length===0)return;const y=n.getRenderTarget(),v=n.getActiveCubeFace(),P=n.getActiveMipmapLevel(),G=n.state;G.setBlending(Sn),G.buffers.color.setClear(1,1,1,1),G.buffers.depth.setTest(!0),G.setScissorTest(!1);const V=f!==_n&&this.type===_n,J=f===_n&&this.type!==_n;for(let tt=0,Q=b.length;tt<Q;tt++){const W=b[tt],$=W.shadow;if($===void 0){console.warn("THREE.WebGLShadowMap:",W,"has no shadow.");continue}if($.autoUpdate===!1&&$.needsUpdate===!1)continue;s.copy($.mapSize);const rt=$.getFrameExtents();if(s.multiply(rt),r.copy($.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/rt.x),s.x=r.x*rt.x,$.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/rt.y),s.y=r.y*rt.y,$.mapSize.y=r.y)),$.map===null||V===!0||J===!0){const gt=this.type!==_n?{minFilter:tn,magFilter:tn}:{};$.map!==null&&$.map.dispose(),$.map=new en(s.x,s.y,gt),$.map.texture.name=W.name+".shadowMap",$.camera.updateProjectionMatrix()}n.setRenderTarget($.map),n.clear();const vt=$.getViewportCount();for(let gt=0;gt<vt;gt++){const nt=$.getViewport(gt);o.set(r.x*nt.x,r.y*nt.y,r.x*nt.z,r.y*nt.w),G.viewport(o),$.updateMatrices(W,gt),i=$.getFrustum(),M(C,L,$.camera,W,this.type)}$.isPointLightShadow!==!0&&this.type===_n&&E($,L),$.needsUpdate=!1}f=this.type,p.needsUpdate=!1,n.setRenderTarget(y,v,P)};function E(b,C){const L=t.update(x);d.defines.VSM_SAMPLES!==b.blurSamples&&(d.defines.VSM_SAMPLES=b.blurSamples,m.defines.VSM_SAMPLES=b.blurSamples,d.needsUpdate=!0,m.needsUpdate=!0),b.mapPass===null&&(b.mapPass=new en(s.x,s.y)),d.uniforms.shadow_pass.value=b.map.texture,d.uniforms.resolution.value=b.mapSize,d.uniforms.radius.value=b.radius,n.setRenderTarget(b.mapPass),n.clear(),n.renderBufferDirect(C,null,L,d,x,null),m.uniforms.shadow_pass.value=b.mapPass.texture,m.uniforms.resolution.value=b.mapSize,m.uniforms.radius.value=b.radius,n.setRenderTarget(b.map),n.clear(),n.renderBufferDirect(C,null,L,m,x,null)}function T(b,C,L,y){let v=null;const P=L.isPointLight===!0?b.customDistanceMaterial:b.customDepthMaterial;if(P!==void 0)v=P;else if(v=L.isPointLight===!0?l:a,n.localClippingEnabled&&C.clipShadows===!0&&Array.isArray(C.clippingPlanes)&&C.clippingPlanes.length!==0||C.displacementMap&&C.displacementScale!==0||C.alphaMap&&C.alphaTest>0||C.map&&C.alphaTest>0){const G=v.uuid,V=C.uuid;let J=c[G];J===void 0&&(J={},c[G]=J);let tt=J[V];tt===void 0&&(tt=v.clone(),J[V]=tt,C.addEventListener("dispose",N)),v=tt}if(v.visible=C.visible,v.wireframe=C.wireframe,y===_n?v.side=C.shadowSide!==null?C.shadowSide:C.side:v.side=C.shadowSide!==null?C.shadowSide:u[C.side],v.alphaMap=C.alphaMap,v.alphaTest=C.alphaTest,v.map=C.map,v.clipShadows=C.clipShadows,v.clippingPlanes=C.clippingPlanes,v.clipIntersection=C.clipIntersection,v.displacementMap=C.displacementMap,v.displacementScale=C.displacementScale,v.displacementBias=C.displacementBias,v.wireframeLinewidth=C.wireframeLinewidth,v.linewidth=C.linewidth,L.isPointLight===!0&&v.isMeshDistanceMaterial===!0){const G=n.properties.get(v);G.light=L}return v}function M(b,C,L,y,v){if(b.visible===!1)return;if(b.layers.test(C.layers)&&(b.isMesh||b.isLine||b.isPoints)&&(b.castShadow||b.receiveShadow&&v===_n)&&(!b.frustumCulled||i.intersectsObject(b))){b.modelViewMatrix.multiplyMatrices(L.matrixWorldInverse,b.matrixWorld);const V=t.update(b),J=b.material;if(Array.isArray(J)){const tt=V.groups;for(let Q=0,W=tt.length;Q<W;Q++){const $=tt[Q],rt=J[$.materialIndex];if(rt&&rt.visible){const vt=T(b,rt,y,v);b.onBeforeShadow(n,b,C,L,V,vt,$),n.renderBufferDirect(L,null,V,vt,b,$),b.onAfterShadow(n,b,C,L,V,vt,$)}}}else if(J.visible){const tt=T(b,J,y,v);b.onBeforeShadow(n,b,C,L,V,tt,null),n.renderBufferDirect(L,null,V,tt,b,null),b.onAfterShadow(n,b,C,L,V,tt,null)}}const G=b.children;for(let V=0,J=G.length;V<J;V++)M(G[V],C,L,y,v)}function N(b){b.target.removeEventListener("dispose",N);for(const L in c){const y=c[L],v=b.target.uuid;v in y&&(y[v].dispose(),delete y[v])}}}const c0={[so]:ro,[oo]:co,[ao]:ho,[Ui]:lo,[ro]:so,[co]:oo,[ho]:ao,[lo]:Ui};function h0(n,t){function e(){let F=!1;const xt=new he;let O=null;const K=new he(0,0,0,0);return{setMask:function(at){O!==at&&!F&&(n.colorMask(at,at,at,at),O=at)},setLocked:function(at){F=at},setClear:function(at,_t,It,$t,Jt){Jt===!0&&(at*=$t,_t*=$t,It*=$t),xt.set(at,_t,It,$t),K.equals(xt)===!1&&(n.clearColor(at,_t,It,$t),K.copy(xt))},reset:function(){F=!1,O=null,K.set(-1,0,0,0)}}}function i(){let F=!1,xt=!1,O=null,K=null,at=null;return{setReversed:function(_t){if(xt!==_t){const It=t.get("EXT_clip_control");xt?It.clipControlEXT(It.LOWER_LEFT_EXT,It.ZERO_TO_ONE_EXT):It.clipControlEXT(It.LOWER_LEFT_EXT,It.NEGATIVE_ONE_TO_ONE_EXT);const $t=at;at=null,this.setClear($t)}xt=_t},getReversed:function(){return xt},setTest:function(_t){_t?ft(n.DEPTH_TEST):it(n.DEPTH_TEST)},setMask:function(_t){O!==_t&&!F&&(n.depthMask(_t),O=_t)},setFunc:function(_t){if(xt&&(_t=c0[_t]),K!==_t){switch(_t){case so:n.depthFunc(n.NEVER);break;case ro:n.depthFunc(n.ALWAYS);break;case oo:n.depthFunc(n.LESS);break;case Ui:n.depthFunc(n.LEQUAL);break;case ao:n.depthFunc(n.EQUAL);break;case lo:n.depthFunc(n.GEQUAL);break;case co:n.depthFunc(n.GREATER);break;case ho:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}K=_t}},setLocked:function(_t){F=_t},setClear:function(_t){at!==_t&&(xt&&(_t=1-_t),n.clearDepth(_t),at=_t)},reset:function(){F=!1,O=null,K=null,at=null,xt=!1}}}function s(){let F=!1,xt=null,O=null,K=null,at=null,_t=null,It=null,$t=null,Jt=null;return{setTest:function(qt){F||(qt?ft(n.STENCIL_TEST):it(n.STENCIL_TEST))},setMask:function(qt){xt!==qt&&!F&&(n.stencilMask(qt),xt=qt)},setFunc:function(qt,Ie,Ve){(O!==qt||K!==Ie||at!==Ve)&&(n.stencilFunc(qt,Ie,Ve),O=qt,K=Ie,at=Ve)},setOp:function(qt,Ie,Ve){(_t!==qt||It!==Ie||$t!==Ve)&&(n.stencilOp(qt,Ie,Ve),_t=qt,It=Ie,$t=Ve)},setLocked:function(qt){F=qt},setClear:function(qt){Jt!==qt&&(n.clearStencil(qt),Jt=qt)},reset:function(){F=!1,xt=null,O=null,K=null,at=null,_t=null,It=null,$t=null,Jt=null}}}const r=new e,o=new i,a=new s,l=new WeakMap,c=new WeakMap;let h={},u={},d=new WeakMap,m=[],g=null,x=!1,p=null,f=null,E=null,T=null,M=null,N=null,b=null,C=new Kt(0,0,0),L=0,y=!1,v=null,P=null,G=null,V=null,J=null;const tt=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let Q=!1,W=0;const $=n.getParameter(n.VERSION);$.indexOf("WebGL")!==-1?(W=parseFloat(/^WebGL (\d)/.exec($)[1]),Q=W>=1):$.indexOf("OpenGL ES")!==-1&&(W=parseFloat(/^OpenGL ES (\d)/.exec($)[1]),Q=W>=2);let rt=null,vt={};const gt=n.getParameter(n.SCISSOR_BOX),nt=n.getParameter(n.VIEWPORT),Ht=new he().fromArray(gt),et=new he().fromArray(nt);function lt(F,xt,O,K){const at=new Uint8Array(4),_t=n.createTexture();n.bindTexture(F,_t),n.texParameteri(F,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(F,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let It=0;It<O;It++)F===n.TEXTURE_3D||F===n.TEXTURE_2D_ARRAY?n.texImage3D(xt,0,n.RGBA,1,1,K,0,n.RGBA,n.UNSIGNED_BYTE,at):n.texImage2D(xt+It,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,at);return _t}const pt={};pt[n.TEXTURE_2D]=lt(n.TEXTURE_2D,n.TEXTURE_2D,1),pt[n.TEXTURE_CUBE_MAP]=lt(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),pt[n.TEXTURE_2D_ARRAY]=lt(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),pt[n.TEXTURE_3D]=lt(n.TEXTURE_3D,n.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),ft(n.DEPTH_TEST),o.setFunc(Ui),Ot(!1),zt(Ma),ft(n.CULL_FACE),D(Sn);function ft(F){h[F]!==!0&&(n.enable(F),h[F]=!0)}function it(F){h[F]!==!1&&(n.disable(F),h[F]=!1)}function ct(F,xt){return u[F]!==xt?(n.bindFramebuffer(F,xt),u[F]=xt,F===n.DRAW_FRAMEBUFFER&&(u[n.FRAMEBUFFER]=xt),F===n.FRAMEBUFFER&&(u[n.DRAW_FRAMEBUFFER]=xt),!0):!1}function ht(F,xt){let O=m,K=!1;if(F){O=d.get(xt),O===void 0&&(O=[],d.set(xt,O));const at=F.textures;if(O.length!==at.length||O[0]!==n.COLOR_ATTACHMENT0){for(let _t=0,It=at.length;_t<It;_t++)O[_t]=n.COLOR_ATTACHMENT0+_t;O.length=at.length,K=!0}}else O[0]!==n.BACK&&(O[0]=n.BACK,K=!0);K&&n.drawBuffers(O)}function Tt(F){return g!==F?(n.useProgram(F),g=F,!0):!1}const yt={[Kn]:n.FUNC_ADD,[Lh]:n.FUNC_SUBTRACT,[Dh]:n.FUNC_REVERSE_SUBTRACT};yt[Ih]=n.MIN,yt[Uh]=n.MAX;const Lt={[Nh]:n.ZERO,[Fh]:n.ONE,[Oh]:n.SRC_COLOR,[no]:n.SRC_ALPHA,[Vh]:n.SRC_ALPHA_SATURATE,[Hh]:n.DST_COLOR,[kh]:n.DST_ALPHA,[Bh]:n.ONE_MINUS_SRC_COLOR,[io]:n.ONE_MINUS_SRC_ALPHA,[Gh]:n.ONE_MINUS_DST_COLOR,[zh]:n.ONE_MINUS_DST_ALPHA,[Wh]:n.CONSTANT_COLOR,[Xh]:n.ONE_MINUS_CONSTANT_COLOR,[$h]:n.CONSTANT_ALPHA,[Yh]:n.ONE_MINUS_CONSTANT_ALPHA};function D(F,xt,O,K,at,_t,It,$t,Jt,qt){if(F===Sn){x===!0&&(it(n.BLEND),x=!1);return}if(x===!1&&(ft(n.BLEND),x=!0),F!==Ph){if(F!==p||qt!==y){if((f!==Kn||M!==Kn)&&(n.blendEquation(n.FUNC_ADD),f=Kn,M=Kn),qt)switch(F){case ei:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case er:n.blendFunc(n.ONE,n.ONE);break;case ya:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case Sa:n.blendFuncSeparate(n.ZERO,n.SRC_COLOR,n.ZERO,n.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",F);break}else switch(F){case ei:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case er:n.blendFunc(n.SRC_ALPHA,n.ONE);break;case ya:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case Sa:n.blendFunc(n.ZERO,n.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",F);break}E=null,T=null,N=null,b=null,C.set(0,0,0),L=0,p=F,y=qt}return}at=at||xt,_t=_t||O,It=It||K,(xt!==f||at!==M)&&(n.blendEquationSeparate(yt[xt],yt[at]),f=xt,M=at),(O!==E||K!==T||_t!==N||It!==b)&&(n.blendFuncSeparate(Lt[O],Lt[K],Lt[_t],Lt[It]),E=O,T=K,N=_t,b=It),($t.equals(C)===!1||Jt!==L)&&(n.blendColor($t.r,$t.g,$t.b,Jt),C.copy($t),L=Jt),p=F,y=!1}function Yt(F,xt){F.side===vn?it(n.CULL_FACE):ft(n.CULL_FACE);let O=F.side===Pe;xt&&(O=!O),Ot(O),F.blending===ei&&F.transparent===!1?D(Sn):D(F.blending,F.blendEquation,F.blendSrc,F.blendDst,F.blendEquationAlpha,F.blendSrcAlpha,F.blendDstAlpha,F.blendColor,F.blendAlpha,F.premultipliedAlpha),o.setFunc(F.depthFunc),o.setTest(F.depthTest),o.setMask(F.depthWrite),r.setMask(F.colorWrite);const K=F.stencilWrite;a.setTest(K),K&&(a.setMask(F.stencilWriteMask),a.setFunc(F.stencilFunc,F.stencilRef,F.stencilFuncMask),a.setOp(F.stencilFail,F.stencilZFail,F.stencilZPass)),Wt(F.polygonOffset,F.polygonOffsetFactor,F.polygonOffsetUnits),F.alphaToCoverage===!0?ft(n.SAMPLE_ALPHA_TO_COVERAGE):it(n.SAMPLE_ALPHA_TO_COVERAGE)}function Ot(F){v!==F&&(F?n.frontFace(n.CW):n.frontFace(n.CCW),v=F)}function zt(F){F!==wh?(ft(n.CULL_FACE),F!==P&&(F===Ma?n.cullFace(n.BACK):F===Rh?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):it(n.CULL_FACE),P=F}function bt(F){F!==G&&(Q&&n.lineWidth(F),G=F)}function Wt(F,xt,O){F?(ft(n.POLYGON_OFFSET_FILL),(V!==xt||J!==O)&&(n.polygonOffset(xt,O),V=xt,J=O)):it(n.POLYGON_OFFSET_FILL)}function At(F){F?ft(n.SCISSOR_TEST):it(n.SCISSOR_TEST)}function A(F){F===void 0&&(F=n.TEXTURE0+tt-1),rt!==F&&(n.activeTexture(F),rt=F)}function _(F,xt,O){O===void 0&&(rt===null?O=n.TEXTURE0+tt-1:O=rt);let K=vt[O];K===void 0&&(K={type:void 0,texture:void 0},vt[O]=K),(K.type!==F||K.texture!==xt)&&(rt!==O&&(n.activeTexture(O),rt=O),n.bindTexture(F,xt||pt[F]),K.type=F,K.texture=xt)}function R(){const F=vt[rt];F!==void 0&&F.type!==void 0&&(n.bindTexture(F.type,null),F.type=void 0,F.texture=void 0)}function w(){try{n.compressedTexImage2D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function I(){try{n.compressedTexImage3D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function U(){try{n.texSubImage2D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Z(){try{n.texSubImage3D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function B(){try{n.compressedTexSubImage2D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Y(){try{n.compressedTexSubImage3D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function ot(){try{n.texStorage2D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function X(){try{n.texStorage3D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function st(){try{n.texImage2D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function ut(){try{n.texImage3D.apply(n,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function St(F){Ht.equals(F)===!1&&(n.scissor(F.x,F.y,F.z,F.w),Ht.copy(F))}function dt(F){et.equals(F)===!1&&(n.viewport(F.x,F.y,F.z,F.w),et.copy(F))}function Ut(F,xt){let O=c.get(xt);O===void 0&&(O=new WeakMap,c.set(xt,O));let K=O.get(F);K===void 0&&(K=n.getUniformBlockIndex(xt,F.name),O.set(F,K))}function Pt(F,xt){const K=c.get(xt).get(F);l.get(xt)!==K&&(n.uniformBlockBinding(xt,K,F.__bindingPointIndex),l.set(xt,K))}function Bt(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),o.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),h={},rt=null,vt={},u={},d=new WeakMap,m=[],g=null,x=!1,p=null,f=null,E=null,T=null,M=null,N=null,b=null,C=new Kt(0,0,0),L=0,y=!1,v=null,P=null,G=null,V=null,J=null,Ht.set(0,0,n.canvas.width,n.canvas.height),et.set(0,0,n.canvas.width,n.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:ft,disable:it,bindFramebuffer:ct,drawBuffers:ht,useProgram:Tt,setBlending:D,setMaterial:Yt,setFlipSided:Ot,setCullFace:zt,setLineWidth:bt,setPolygonOffset:Wt,setScissorTest:At,activeTexture:A,bindTexture:_,unbindTexture:R,compressedTexImage2D:w,compressedTexImage3D:I,texImage2D:st,texImage3D:ut,updateUBOMapping:Ut,uniformBlockBinding:Pt,texStorage2D:ot,texStorage3D:X,texSubImage2D:U,texSubImage3D:Z,compressedTexSubImage2D:B,compressedTexSubImage3D:Y,scissor:St,viewport:dt,reset:Bt}}function gl(n,t,e,i){const s=u0(i);switch(e){case gc:return n*t;case xc:return n*t;case vc:return n*t*2;case Mc:return n*t/s.components*s.byteLength;case ea:return n*t/s.components*s.byteLength;case yc:return n*t*2/s.components*s.byteLength;case na:return n*t*2/s.components*s.byteLength;case _c:return n*t*3/s.components*s.byteLength;case Je:return n*t*4/s.components*s.byteLength;case ia:return n*t*4/s.components*s.byteLength;case $s:case Ys:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case qs:case js:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case _o:case vo:return Math.max(n,16)*Math.max(t,8)/4;case go:case xo:return Math.max(n,8)*Math.max(t,8)/2;case Mo:case yo:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case So:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case Eo:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case To:return Math.floor((n+4)/5)*Math.floor((t+3)/4)*16;case bo:return Math.floor((n+4)/5)*Math.floor((t+4)/5)*16;case Ao:return Math.floor((n+5)/6)*Math.floor((t+4)/5)*16;case wo:return Math.floor((n+5)/6)*Math.floor((t+5)/6)*16;case Ro:return Math.floor((n+7)/8)*Math.floor((t+4)/5)*16;case Co:return Math.floor((n+7)/8)*Math.floor((t+5)/6)*16;case Po:return Math.floor((n+7)/8)*Math.floor((t+7)/8)*16;case Lo:return Math.floor((n+9)/10)*Math.floor((t+4)/5)*16;case Do:return Math.floor((n+9)/10)*Math.floor((t+5)/6)*16;case Io:return Math.floor((n+9)/10)*Math.floor((t+7)/8)*16;case Uo:return Math.floor((n+9)/10)*Math.floor((t+9)/10)*16;case No:return Math.floor((n+11)/12)*Math.floor((t+9)/10)*16;case Fo:return Math.floor((n+11)/12)*Math.floor((t+11)/12)*16;case Ks:case Oo:case Bo:return Math.ceil(n/4)*Math.ceil(t/4)*16;case Sc:case ko:return Math.ceil(n/4)*Math.ceil(t/4)*8;case zo:case Ho:return Math.ceil(n/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function u0(n){switch(n){case An:case fc:return{byteLength:1,components:1};case os:case pc:case En:return{byteLength:2,components:1};case Qo:case ta:return{byteLength:2,components:4};case si:case Jo:case Mn:return{byteLength:4,components:1};case mc:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${n}.`)}function d0(n,t,e,i,s,r,o){const a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Ft,h=new WeakMap;let u;const d=new WeakMap;let m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(A,_){return m?new OffscreenCanvas(A,_):ir("canvas")}function x(A,_,R){let w=1;const I=At(A);if((I.width>R||I.height>R)&&(w=R/Math.max(I.width,I.height)),w<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){const U=Math.floor(w*I.width),Z=Math.floor(w*I.height);u===void 0&&(u=g(U,Z));const B=_?g(U,Z):u;return B.width=U,B.height=Z,B.getContext("2d").drawImage(A,0,0,U,Z),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+I.width+"x"+I.height+") to ("+U+"x"+Z+")."),B}else return"data"in A&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+I.width+"x"+I.height+")."),A;return A}function p(A){return A.generateMipmaps}function f(A){n.generateMipmap(A)}function E(A){return A.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:A.isWebGL3DRenderTarget?n.TEXTURE_3D:A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function T(A,_,R,w,I=!1){if(A!==null){if(n[A]!==void 0)return n[A];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let U=_;if(_===n.RED&&(R===n.FLOAT&&(U=n.R32F),R===n.HALF_FLOAT&&(U=n.R16F),R===n.UNSIGNED_BYTE&&(U=n.R8)),_===n.RED_INTEGER&&(R===n.UNSIGNED_BYTE&&(U=n.R8UI),R===n.UNSIGNED_SHORT&&(U=n.R16UI),R===n.UNSIGNED_INT&&(U=n.R32UI),R===n.BYTE&&(U=n.R8I),R===n.SHORT&&(U=n.R16I),R===n.INT&&(U=n.R32I)),_===n.RG&&(R===n.FLOAT&&(U=n.RG32F),R===n.HALF_FLOAT&&(U=n.RG16F),R===n.UNSIGNED_BYTE&&(U=n.RG8)),_===n.RG_INTEGER&&(R===n.UNSIGNED_BYTE&&(U=n.RG8UI),R===n.UNSIGNED_SHORT&&(U=n.RG16UI),R===n.UNSIGNED_INT&&(U=n.RG32UI),R===n.BYTE&&(U=n.RG8I),R===n.SHORT&&(U=n.RG16I),R===n.INT&&(U=n.RG32I)),_===n.RGB_INTEGER&&(R===n.UNSIGNED_BYTE&&(U=n.RGB8UI),R===n.UNSIGNED_SHORT&&(U=n.RGB16UI),R===n.UNSIGNED_INT&&(U=n.RGB32UI),R===n.BYTE&&(U=n.RGB8I),R===n.SHORT&&(U=n.RGB16I),R===n.INT&&(U=n.RGB32I)),_===n.RGBA_INTEGER&&(R===n.UNSIGNED_BYTE&&(U=n.RGBA8UI),R===n.UNSIGNED_SHORT&&(U=n.RGBA16UI),R===n.UNSIGNED_INT&&(U=n.RGBA32UI),R===n.BYTE&&(U=n.RGBA8I),R===n.SHORT&&(U=n.RGBA16I),R===n.INT&&(U=n.RGBA32I)),_===n.RGB&&R===n.UNSIGNED_INT_5_9_9_9_REV&&(U=n.RGB9_E5),_===n.RGBA){const Z=I?lr:jt.getTransfer(w);R===n.FLOAT&&(U=n.RGBA32F),R===n.HALF_FLOAT&&(U=n.RGBA16F),R===n.UNSIGNED_BYTE&&(U=Z===ne?n.SRGB8_ALPHA8:n.RGBA8),R===n.UNSIGNED_SHORT_4_4_4_4&&(U=n.RGBA4),R===n.UNSIGNED_SHORT_5_5_5_1&&(U=n.RGB5_A1)}return(U===n.R16F||U===n.R32F||U===n.RG16F||U===n.RG32F||U===n.RGBA16F||U===n.RGBA32F)&&t.get("EXT_color_buffer_float"),U}function M(A,_){let R;return A?_===null||_===si||_===Oi?R=n.DEPTH24_STENCIL8:_===Mn?R=n.DEPTH32F_STENCIL8:_===os&&(R=n.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===si||_===Oi?R=n.DEPTH_COMPONENT24:_===Mn?R=n.DEPTH_COMPONENT32F:_===os&&(R=n.DEPTH_COMPONENT16),R}function N(A,_){return p(A)===!0||A.isFramebufferTexture&&A.minFilter!==tn&&A.minFilter!==an?Math.log2(Math.max(_.width,_.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?_.mipmaps.length:1}function b(A){const _=A.target;_.removeEventListener("dispose",b),L(_),_.isVideoTexture&&h.delete(_)}function C(A){const _=A.target;_.removeEventListener("dispose",C),v(_)}function L(A){const _=i.get(A);if(_.__webglInit===void 0)return;const R=A.source,w=d.get(R);if(w){const I=w[_.__cacheKey];I.usedTimes--,I.usedTimes===0&&y(A),Object.keys(w).length===0&&d.delete(R)}i.remove(A)}function y(A){const _=i.get(A);n.deleteTexture(_.__webglTexture);const R=A.source,w=d.get(R);delete w[_.__cacheKey],o.memory.textures--}function v(A){const _=i.get(A);if(A.depthTexture&&(A.depthTexture.dispose(),i.remove(A.depthTexture)),A.isWebGLCubeRenderTarget)for(let w=0;w<6;w++){if(Array.isArray(_.__webglFramebuffer[w]))for(let I=0;I<_.__webglFramebuffer[w].length;I++)n.deleteFramebuffer(_.__webglFramebuffer[w][I]);else n.deleteFramebuffer(_.__webglFramebuffer[w]);_.__webglDepthbuffer&&n.deleteRenderbuffer(_.__webglDepthbuffer[w])}else{if(Array.isArray(_.__webglFramebuffer))for(let w=0;w<_.__webglFramebuffer.length;w++)n.deleteFramebuffer(_.__webglFramebuffer[w]);else n.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&n.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&n.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let w=0;w<_.__webglColorRenderbuffer.length;w++)_.__webglColorRenderbuffer[w]&&n.deleteRenderbuffer(_.__webglColorRenderbuffer[w]);_.__webglDepthRenderbuffer&&n.deleteRenderbuffer(_.__webglDepthRenderbuffer)}const R=A.textures;for(let w=0,I=R.length;w<I;w++){const U=i.get(R[w]);U.__webglTexture&&(n.deleteTexture(U.__webglTexture),o.memory.textures--),i.remove(R[w])}i.remove(A)}let P=0;function G(){P=0}function V(){const A=P;return A>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+A+" texture units while this GPU supports only "+s.maxTextures),P+=1,A}function J(A){const _=[];return _.push(A.wrapS),_.push(A.wrapT),_.push(A.wrapR||0),_.push(A.magFilter),_.push(A.minFilter),_.push(A.anisotropy),_.push(A.internalFormat),_.push(A.format),_.push(A.type),_.push(A.generateMipmaps),_.push(A.premultiplyAlpha),_.push(A.flipY),_.push(A.unpackAlignment),_.push(A.colorSpace),_.join()}function tt(A,_){const R=i.get(A);if(A.isVideoTexture&&bt(A),A.isRenderTargetTexture===!1&&A.version>0&&R.__version!==A.version){const w=A.image;if(w===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(w.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{et(R,A,_);return}}e.bindTexture(n.TEXTURE_2D,R.__webglTexture,n.TEXTURE0+_)}function Q(A,_){const R=i.get(A);if(A.version>0&&R.__version!==A.version){et(R,A,_);return}e.bindTexture(n.TEXTURE_2D_ARRAY,R.__webglTexture,n.TEXTURE0+_)}function W(A,_){const R=i.get(A);if(A.version>0&&R.__version!==A.version){et(R,A,_);return}e.bindTexture(n.TEXTURE_3D,R.__webglTexture,n.TEXTURE0+_)}function $(A,_){const R=i.get(A);if(A.version>0&&R.__version!==A.version){lt(R,A,_);return}e.bindTexture(n.TEXTURE_CUBE_MAP,R.__webglTexture,n.TEXTURE0+_)}const rt={[po]:n.REPEAT,[Qn]:n.CLAMP_TO_EDGE,[mo]:n.MIRRORED_REPEAT},vt={[tn]:n.NEAREST,[Zh]:n.NEAREST_MIPMAP_NEAREST,[xs]:n.NEAREST_MIPMAP_LINEAR,[an]:n.LINEAR,[gr]:n.LINEAR_MIPMAP_NEAREST,[ti]:n.LINEAR_MIPMAP_LINEAR},gt={[nu]:n.NEVER,[lu]:n.ALWAYS,[iu]:n.LESS,[Ec]:n.LEQUAL,[su]:n.EQUAL,[au]:n.GEQUAL,[ru]:n.GREATER,[ou]:n.NOTEQUAL};function nt(A,_){if(_.type===Mn&&t.has("OES_texture_float_linear")===!1&&(_.magFilter===an||_.magFilter===gr||_.magFilter===xs||_.magFilter===ti||_.minFilter===an||_.minFilter===gr||_.minFilter===xs||_.minFilter===ti)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(A,n.TEXTURE_WRAP_S,rt[_.wrapS]),n.texParameteri(A,n.TEXTURE_WRAP_T,rt[_.wrapT]),(A===n.TEXTURE_3D||A===n.TEXTURE_2D_ARRAY)&&n.texParameteri(A,n.TEXTURE_WRAP_R,rt[_.wrapR]),n.texParameteri(A,n.TEXTURE_MAG_FILTER,vt[_.magFilter]),n.texParameteri(A,n.TEXTURE_MIN_FILTER,vt[_.minFilter]),_.compareFunction&&(n.texParameteri(A,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(A,n.TEXTURE_COMPARE_FUNC,gt[_.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===tn||_.minFilter!==xs&&_.minFilter!==ti||_.type===Mn&&t.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||i.get(_).__currentAnisotropy){const R=t.get("EXT_texture_filter_anisotropic");n.texParameterf(A,R.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,s.getMaxAnisotropy())),i.get(_).__currentAnisotropy=_.anisotropy}}}function Ht(A,_){let R=!1;A.__webglInit===void 0&&(A.__webglInit=!0,_.addEventListener("dispose",b));const w=_.source;let I=d.get(w);I===void 0&&(I={},d.set(w,I));const U=J(_);if(U!==A.__cacheKey){I[U]===void 0&&(I[U]={texture:n.createTexture(),usedTimes:0},o.memory.textures++,R=!0),I[U].usedTimes++;const Z=I[A.__cacheKey];Z!==void 0&&(I[A.__cacheKey].usedTimes--,Z.usedTimes===0&&y(_)),A.__cacheKey=U,A.__webglTexture=I[U].texture}return R}function et(A,_,R){let w=n.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(w=n.TEXTURE_2D_ARRAY),_.isData3DTexture&&(w=n.TEXTURE_3D);const I=Ht(A,_),U=_.source;e.bindTexture(w,A.__webglTexture,n.TEXTURE0+R);const Z=i.get(U);if(U.version!==Z.__version||I===!0){e.activeTexture(n.TEXTURE0+R);const B=jt.getPrimaries(jt.workingColorSpace),Y=_.colorSpace===Bn?null:jt.getPrimaries(_.colorSpace),ot=_.colorSpace===Bn||B===Y?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,_.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,_.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,ot);let X=x(_.image,!1,s.maxTextureSize);X=Wt(_,X);const st=r.convert(_.format,_.colorSpace),ut=r.convert(_.type);let St=T(_.internalFormat,st,ut,_.colorSpace,_.isVideoTexture);nt(w,_);let dt;const Ut=_.mipmaps,Pt=_.isVideoTexture!==!0,Bt=Z.__version===void 0||I===!0,F=U.dataReady,xt=N(_,X);if(_.isDepthTexture)St=M(_.format===Bi,_.type),Bt&&(Pt?e.texStorage2D(n.TEXTURE_2D,1,St,X.width,X.height):e.texImage2D(n.TEXTURE_2D,0,St,X.width,X.height,0,st,ut,null));else if(_.isDataTexture)if(Ut.length>0){Pt&&Bt&&e.texStorage2D(n.TEXTURE_2D,xt,St,Ut[0].width,Ut[0].height);for(let O=0,K=Ut.length;O<K;O++)dt=Ut[O],Pt?F&&e.texSubImage2D(n.TEXTURE_2D,O,0,0,dt.width,dt.height,st,ut,dt.data):e.texImage2D(n.TEXTURE_2D,O,St,dt.width,dt.height,0,st,ut,dt.data);_.generateMipmaps=!1}else Pt?(Bt&&e.texStorage2D(n.TEXTURE_2D,xt,St,X.width,X.height),F&&e.texSubImage2D(n.TEXTURE_2D,0,0,0,X.width,X.height,st,ut,X.data)):e.texImage2D(n.TEXTURE_2D,0,St,X.width,X.height,0,st,ut,X.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){Pt&&Bt&&e.texStorage3D(n.TEXTURE_2D_ARRAY,xt,St,Ut[0].width,Ut[0].height,X.depth);for(let O=0,K=Ut.length;O<K;O++)if(dt=Ut[O],_.format!==Je)if(st!==null)if(Pt){if(F)if(_.layerUpdates.size>0){const at=gl(dt.width,dt.height,_.format,_.type);for(const _t of _.layerUpdates){const It=dt.data.subarray(_t*at/dt.data.BYTES_PER_ELEMENT,(_t+1)*at/dt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,O,0,0,_t,dt.width,dt.height,1,st,It)}_.clearLayerUpdates()}else e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,O,0,0,0,dt.width,dt.height,X.depth,st,dt.data)}else e.compressedTexImage3D(n.TEXTURE_2D_ARRAY,O,St,dt.width,dt.height,X.depth,0,dt.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Pt?F&&e.texSubImage3D(n.TEXTURE_2D_ARRAY,O,0,0,0,dt.width,dt.height,X.depth,st,ut,dt.data):e.texImage3D(n.TEXTURE_2D_ARRAY,O,St,dt.width,dt.height,X.depth,0,st,ut,dt.data)}else{Pt&&Bt&&e.texStorage2D(n.TEXTURE_2D,xt,St,Ut[0].width,Ut[0].height);for(let O=0,K=Ut.length;O<K;O++)dt=Ut[O],_.format!==Je?st!==null?Pt?F&&e.compressedTexSubImage2D(n.TEXTURE_2D,O,0,0,dt.width,dt.height,st,dt.data):e.compressedTexImage2D(n.TEXTURE_2D,O,St,dt.width,dt.height,0,dt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Pt?F&&e.texSubImage2D(n.TEXTURE_2D,O,0,0,dt.width,dt.height,st,ut,dt.data):e.texImage2D(n.TEXTURE_2D,O,St,dt.width,dt.height,0,st,ut,dt.data)}else if(_.isDataArrayTexture)if(Pt){if(Bt&&e.texStorage3D(n.TEXTURE_2D_ARRAY,xt,St,X.width,X.height,X.depth),F)if(_.layerUpdates.size>0){const O=gl(X.width,X.height,_.format,_.type);for(const K of _.layerUpdates){const at=X.data.subarray(K*O/X.data.BYTES_PER_ELEMENT,(K+1)*O/X.data.BYTES_PER_ELEMENT);e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,K,X.width,X.height,1,st,ut,at)}_.clearLayerUpdates()}else e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,X.width,X.height,X.depth,st,ut,X.data)}else e.texImage3D(n.TEXTURE_2D_ARRAY,0,St,X.width,X.height,X.depth,0,st,ut,X.data);else if(_.isData3DTexture)Pt?(Bt&&e.texStorage3D(n.TEXTURE_3D,xt,St,X.width,X.height,X.depth),F&&e.texSubImage3D(n.TEXTURE_3D,0,0,0,0,X.width,X.height,X.depth,st,ut,X.data)):e.texImage3D(n.TEXTURE_3D,0,St,X.width,X.height,X.depth,0,st,ut,X.data);else if(_.isFramebufferTexture){if(Bt)if(Pt)e.texStorage2D(n.TEXTURE_2D,xt,St,X.width,X.height);else{let O=X.width,K=X.height;for(let at=0;at<xt;at++)e.texImage2D(n.TEXTURE_2D,at,St,O,K,0,st,ut,null),O>>=1,K>>=1}}else if(Ut.length>0){if(Pt&&Bt){const O=At(Ut[0]);e.texStorage2D(n.TEXTURE_2D,xt,St,O.width,O.height)}for(let O=0,K=Ut.length;O<K;O++)dt=Ut[O],Pt?F&&e.texSubImage2D(n.TEXTURE_2D,O,0,0,st,ut,dt):e.texImage2D(n.TEXTURE_2D,O,St,st,ut,dt);_.generateMipmaps=!1}else if(Pt){if(Bt){const O=At(X);e.texStorage2D(n.TEXTURE_2D,xt,St,O.width,O.height)}F&&e.texSubImage2D(n.TEXTURE_2D,0,0,0,st,ut,X)}else e.texImage2D(n.TEXTURE_2D,0,St,st,ut,X);p(_)&&f(w),Z.__version=U.version,_.onUpdate&&_.onUpdate(_)}A.__version=_.version}function lt(A,_,R){if(_.image.length!==6)return;const w=Ht(A,_),I=_.source;e.bindTexture(n.TEXTURE_CUBE_MAP,A.__webglTexture,n.TEXTURE0+R);const U=i.get(I);if(I.version!==U.__version||w===!0){e.activeTexture(n.TEXTURE0+R);const Z=jt.getPrimaries(jt.workingColorSpace),B=_.colorSpace===Bn?null:jt.getPrimaries(_.colorSpace),Y=_.colorSpace===Bn||Z===B?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,_.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,_.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Y);const ot=_.isCompressedTexture||_.image[0].isCompressedTexture,X=_.image[0]&&_.image[0].isDataTexture,st=[];for(let K=0;K<6;K++)!ot&&!X?st[K]=x(_.image[K],!0,s.maxCubemapSize):st[K]=X?_.image[K].image:_.image[K],st[K]=Wt(_,st[K]);const ut=st[0],St=r.convert(_.format,_.colorSpace),dt=r.convert(_.type),Ut=T(_.internalFormat,St,dt,_.colorSpace),Pt=_.isVideoTexture!==!0,Bt=U.__version===void 0||w===!0,F=I.dataReady;let xt=N(_,ut);nt(n.TEXTURE_CUBE_MAP,_);let O;if(ot){Pt&&Bt&&e.texStorage2D(n.TEXTURE_CUBE_MAP,xt,Ut,ut.width,ut.height);for(let K=0;K<6;K++){O=st[K].mipmaps;for(let at=0;at<O.length;at++){const _t=O[at];_.format!==Je?St!==null?Pt?F&&e.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+K,at,0,0,_t.width,_t.height,St,_t.data):e.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+K,at,Ut,_t.width,_t.height,0,_t.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Pt?F&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+K,at,0,0,_t.width,_t.height,St,dt,_t.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+K,at,Ut,_t.width,_t.height,0,St,dt,_t.data)}}}else{if(O=_.mipmaps,Pt&&Bt){O.length>0&&xt++;const K=At(st[0]);e.texStorage2D(n.TEXTURE_CUBE_MAP,xt,Ut,K.width,K.height)}for(let K=0;K<6;K++)if(X){Pt?F&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+K,0,0,0,st[K].width,st[K].height,St,dt,st[K].data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+K,0,Ut,st[K].width,st[K].height,0,St,dt,st[K].data);for(let at=0;at<O.length;at++){const It=O[at].image[K].image;Pt?F&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+K,at+1,0,0,It.width,It.height,St,dt,It.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+K,at+1,Ut,It.width,It.height,0,St,dt,It.data)}}else{Pt?F&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+K,0,0,0,St,dt,st[K]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+K,0,Ut,St,dt,st[K]);for(let at=0;at<O.length;at++){const _t=O[at];Pt?F&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+K,at+1,0,0,St,dt,_t.image[K]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+K,at+1,Ut,St,dt,_t.image[K])}}}p(_)&&f(n.TEXTURE_CUBE_MAP),U.__version=I.version,_.onUpdate&&_.onUpdate(_)}A.__version=_.version}function pt(A,_,R,w,I,U){const Z=r.convert(R.format,R.colorSpace),B=r.convert(R.type),Y=T(R.internalFormat,Z,B,R.colorSpace),ot=i.get(_),X=i.get(R);if(X.__renderTarget=_,!ot.__hasExternalTextures){const st=Math.max(1,_.width>>U),ut=Math.max(1,_.height>>U);I===n.TEXTURE_3D||I===n.TEXTURE_2D_ARRAY?e.texImage3D(I,U,Y,st,ut,_.depth,0,Z,B,null):e.texImage2D(I,U,Y,st,ut,0,Z,B,null)}e.bindFramebuffer(n.FRAMEBUFFER,A),zt(_)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,w,I,X.__webglTexture,0,Ot(_)):(I===n.TEXTURE_2D||I>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&I<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,w,I,X.__webglTexture,U),e.bindFramebuffer(n.FRAMEBUFFER,null)}function ft(A,_,R){if(n.bindRenderbuffer(n.RENDERBUFFER,A),_.depthBuffer){const w=_.depthTexture,I=w&&w.isDepthTexture?w.type:null,U=M(_.stencilBuffer,I),Z=_.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,B=Ot(_);zt(_)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,B,U,_.width,_.height):R?n.renderbufferStorageMultisample(n.RENDERBUFFER,B,U,_.width,_.height):n.renderbufferStorage(n.RENDERBUFFER,U,_.width,_.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,Z,n.RENDERBUFFER,A)}else{const w=_.textures;for(let I=0;I<w.length;I++){const U=w[I],Z=r.convert(U.format,U.colorSpace),B=r.convert(U.type),Y=T(U.internalFormat,Z,B,U.colorSpace),ot=Ot(_);R&&zt(_)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,ot,Y,_.width,_.height):zt(_)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,ot,Y,_.width,_.height):n.renderbufferStorage(n.RENDERBUFFER,Y,_.width,_.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function it(A,_){if(_&&_.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(n.FRAMEBUFFER,A),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const w=i.get(_.depthTexture);w.__renderTarget=_,(!w.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),tt(_.depthTexture,0);const I=w.__webglTexture,U=Ot(_);if(_.depthTexture.format===Pi)zt(_)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,I,0,U):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,I,0);else if(_.depthTexture.format===Bi)zt(_)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,I,0,U):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,I,0);else throw new Error("Unknown depthTexture format")}function ct(A){const _=i.get(A),R=A.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==A.depthTexture){const w=A.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),w){const I=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,w.removeEventListener("dispose",I)};w.addEventListener("dispose",I),_.__depthDisposeCallback=I}_.__boundDepthTexture=w}if(A.depthTexture&&!_.__autoAllocateDepthBuffer){if(R)throw new Error("target.depthTexture not supported in Cube render targets");it(_.__webglFramebuffer,A)}else if(R){_.__webglDepthbuffer=[];for(let w=0;w<6;w++)if(e.bindFramebuffer(n.FRAMEBUFFER,_.__webglFramebuffer[w]),_.__webglDepthbuffer[w]===void 0)_.__webglDepthbuffer[w]=n.createRenderbuffer(),ft(_.__webglDepthbuffer[w],A,!1);else{const I=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,U=_.__webglDepthbuffer[w];n.bindRenderbuffer(n.RENDERBUFFER,U),n.framebufferRenderbuffer(n.FRAMEBUFFER,I,n.RENDERBUFFER,U)}}else if(e.bindFramebuffer(n.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=n.createRenderbuffer(),ft(_.__webglDepthbuffer,A,!1);else{const w=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,I=_.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,I),n.framebufferRenderbuffer(n.FRAMEBUFFER,w,n.RENDERBUFFER,I)}e.bindFramebuffer(n.FRAMEBUFFER,null)}function ht(A,_,R){const w=i.get(A);_!==void 0&&pt(w.__webglFramebuffer,A,A.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),R!==void 0&&ct(A)}function Tt(A){const _=A.texture,R=i.get(A),w=i.get(_);A.addEventListener("dispose",C);const I=A.textures,U=A.isWebGLCubeRenderTarget===!0,Z=I.length>1;if(Z||(w.__webglTexture===void 0&&(w.__webglTexture=n.createTexture()),w.__version=_.version,o.memory.textures++),U){R.__webglFramebuffer=[];for(let B=0;B<6;B++)if(_.mipmaps&&_.mipmaps.length>0){R.__webglFramebuffer[B]=[];for(let Y=0;Y<_.mipmaps.length;Y++)R.__webglFramebuffer[B][Y]=n.createFramebuffer()}else R.__webglFramebuffer[B]=n.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){R.__webglFramebuffer=[];for(let B=0;B<_.mipmaps.length;B++)R.__webglFramebuffer[B]=n.createFramebuffer()}else R.__webglFramebuffer=n.createFramebuffer();if(Z)for(let B=0,Y=I.length;B<Y;B++){const ot=i.get(I[B]);ot.__webglTexture===void 0&&(ot.__webglTexture=n.createTexture(),o.memory.textures++)}if(A.samples>0&&zt(A)===!1){R.__webglMultisampledFramebuffer=n.createFramebuffer(),R.__webglColorRenderbuffer=[],e.bindFramebuffer(n.FRAMEBUFFER,R.__webglMultisampledFramebuffer);for(let B=0;B<I.length;B++){const Y=I[B];R.__webglColorRenderbuffer[B]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,R.__webglColorRenderbuffer[B]);const ot=r.convert(Y.format,Y.colorSpace),X=r.convert(Y.type),st=T(Y.internalFormat,ot,X,Y.colorSpace,A.isXRRenderTarget===!0),ut=Ot(A);n.renderbufferStorageMultisample(n.RENDERBUFFER,ut,st,A.width,A.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+B,n.RENDERBUFFER,R.__webglColorRenderbuffer[B])}n.bindRenderbuffer(n.RENDERBUFFER,null),A.depthBuffer&&(R.__webglDepthRenderbuffer=n.createRenderbuffer(),ft(R.__webglDepthRenderbuffer,A,!0)),e.bindFramebuffer(n.FRAMEBUFFER,null)}}if(U){e.bindTexture(n.TEXTURE_CUBE_MAP,w.__webglTexture),nt(n.TEXTURE_CUBE_MAP,_);for(let B=0;B<6;B++)if(_.mipmaps&&_.mipmaps.length>0)for(let Y=0;Y<_.mipmaps.length;Y++)pt(R.__webglFramebuffer[B][Y],A,_,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+B,Y);else pt(R.__webglFramebuffer[B],A,_,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+B,0);p(_)&&f(n.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(Z){for(let B=0,Y=I.length;B<Y;B++){const ot=I[B],X=i.get(ot);e.bindTexture(n.TEXTURE_2D,X.__webglTexture),nt(n.TEXTURE_2D,ot),pt(R.__webglFramebuffer,A,ot,n.COLOR_ATTACHMENT0+B,n.TEXTURE_2D,0),p(ot)&&f(n.TEXTURE_2D)}e.unbindTexture()}else{let B=n.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(B=A.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),e.bindTexture(B,w.__webglTexture),nt(B,_),_.mipmaps&&_.mipmaps.length>0)for(let Y=0;Y<_.mipmaps.length;Y++)pt(R.__webglFramebuffer[Y],A,_,n.COLOR_ATTACHMENT0,B,Y);else pt(R.__webglFramebuffer,A,_,n.COLOR_ATTACHMENT0,B,0);p(_)&&f(B),e.unbindTexture()}A.depthBuffer&&ct(A)}function yt(A){const _=A.textures;for(let R=0,w=_.length;R<w;R++){const I=_[R];if(p(I)){const U=E(A),Z=i.get(I).__webglTexture;e.bindTexture(U,Z),f(U),e.unbindTexture()}}}const Lt=[],D=[];function Yt(A){if(A.samples>0){if(zt(A)===!1){const _=A.textures,R=A.width,w=A.height;let I=n.COLOR_BUFFER_BIT;const U=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Z=i.get(A),B=_.length>1;if(B)for(let Y=0;Y<_.length;Y++)e.bindFramebuffer(n.FRAMEBUFFER,Z.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Y,n.RENDERBUFFER,null),e.bindFramebuffer(n.FRAMEBUFFER,Z.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Y,n.TEXTURE_2D,null,0);e.bindFramebuffer(n.READ_FRAMEBUFFER,Z.__webglMultisampledFramebuffer),e.bindFramebuffer(n.DRAW_FRAMEBUFFER,Z.__webglFramebuffer);for(let Y=0;Y<_.length;Y++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(I|=n.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(I|=n.STENCIL_BUFFER_BIT)),B){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,Z.__webglColorRenderbuffer[Y]);const ot=i.get(_[Y]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,ot,0)}n.blitFramebuffer(0,0,R,w,0,0,R,w,I,n.NEAREST),l===!0&&(Lt.length=0,D.length=0,Lt.push(n.COLOR_ATTACHMENT0+Y),A.depthBuffer&&A.resolveDepthBuffer===!1&&(Lt.push(U),D.push(U),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,D)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,Lt))}if(e.bindFramebuffer(n.READ_FRAMEBUFFER,null),e.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),B)for(let Y=0;Y<_.length;Y++){e.bindFramebuffer(n.FRAMEBUFFER,Z.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Y,n.RENDERBUFFER,Z.__webglColorRenderbuffer[Y]);const ot=i.get(_[Y]).__webglTexture;e.bindFramebuffer(n.FRAMEBUFFER,Z.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Y,n.TEXTURE_2D,ot,0)}e.bindFramebuffer(n.DRAW_FRAMEBUFFER,Z.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.resolveDepthBuffer===!1&&l){const _=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[_])}}}function Ot(A){return Math.min(s.maxSamples,A.samples)}function zt(A){const _=i.get(A);return A.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function bt(A){const _=o.render.frame;h.get(A)!==_&&(h.set(A,_),A.update())}function Wt(A,_){const R=A.colorSpace,w=A.format,I=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||R!==zi&&R!==Bn&&(jt.getTransfer(R)===ne?(w!==Je||I!==An)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",R)),_}function At(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(c.width=A.naturalWidth||A.width,c.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(c.width=A.displayWidth,c.height=A.displayHeight):(c.width=A.width,c.height=A.height),c}this.allocateTextureUnit=V,this.resetTextureUnits=G,this.setTexture2D=tt,this.setTexture2DArray=Q,this.setTexture3D=W,this.setTextureCube=$,this.rebindTextures=ht,this.setupRenderTarget=Tt,this.updateRenderTargetMipmap=yt,this.updateMultisampleRenderTarget=Yt,this.setupDepthRenderbuffer=ct,this.setupFrameBufferTexture=pt,this.useMultisampledRTT=zt}function f0(n,t){function e(i,s=Bn){let r;const o=jt.getTransfer(s);if(i===An)return n.UNSIGNED_BYTE;if(i===Qo)return n.UNSIGNED_SHORT_4_4_4_4;if(i===ta)return n.UNSIGNED_SHORT_5_5_5_1;if(i===mc)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===fc)return n.BYTE;if(i===pc)return n.SHORT;if(i===os)return n.UNSIGNED_SHORT;if(i===Jo)return n.INT;if(i===si)return n.UNSIGNED_INT;if(i===Mn)return n.FLOAT;if(i===En)return n.HALF_FLOAT;if(i===gc)return n.ALPHA;if(i===_c)return n.RGB;if(i===Je)return n.RGBA;if(i===xc)return n.LUMINANCE;if(i===vc)return n.LUMINANCE_ALPHA;if(i===Pi)return n.DEPTH_COMPONENT;if(i===Bi)return n.DEPTH_STENCIL;if(i===Mc)return n.RED;if(i===ea)return n.RED_INTEGER;if(i===yc)return n.RG;if(i===na)return n.RG_INTEGER;if(i===ia)return n.RGBA_INTEGER;if(i===$s||i===Ys||i===qs||i===js)if(o===ne)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===$s)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Ys)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===qs)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===js)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===$s)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Ys)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===qs)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===js)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===go||i===_o||i===xo||i===vo)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===go)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===_o)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===xo)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===vo)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Mo||i===yo||i===So)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(i===Mo||i===yo)return o===ne?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===So)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===Eo||i===To||i===bo||i===Ao||i===wo||i===Ro||i===Co||i===Po||i===Lo||i===Do||i===Io||i===Uo||i===No||i===Fo)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(i===Eo)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===To)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===bo)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Ao)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===wo)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Ro)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Co)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Po)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Lo)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Do)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Io)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Uo)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===No)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Fo)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Ks||i===Oo||i===Bo)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(i===Ks)return o===ne?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Oo)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Bo)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Sc||i===ko||i===zo||i===Ho)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(i===Ks)return r.COMPRESSED_RED_RGTC1_EXT;if(i===ko)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===zo)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Ho)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Oi?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:e}}class p0 extends je{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}}class ks extends De{constructor(){super(),this.isGroup=!0,this.type="Group"}}const m0={type:"move"};class Wr{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new ks,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new ks,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new H,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new H),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new ks,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new H,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new H),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const i of t.hand.values())this._getHandJoint(e,i)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,i){let s=null,r=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(const x of t.hand.values()){const p=e.getJointPose(x,i),f=this._getHandJoint(c,x);p!==null&&(f.matrix.fromArray(p.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,f.jointRadius=p.radius),f.visible=p!==null}const h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),m=.02,g=.005;c.inputState.pinching&&d>m+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&d<=m-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,i),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(s=e.getPose(t.targetRaySpace,i),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(m0)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const i=new ks;i.matrixAutoUpdate=!1,i.visible=!1,t.joints[e.jointName]=i,t.add(i)}return t.joints[e.jointName]}}const g0=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,_0=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class x0{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e,i){if(this.texture===null){const s=new Le,r=t.properties.get(s);r.__webglTexture=e.texture,(e.depthNear!=i.depthNear||e.depthFar!=i.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=s}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,i=new Ee({vertexShader:g0,fragmentShader:_0,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new ln(new hr(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class v0 extends li{constructor(t,e){super();const i=this;let s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,u=null,d=null,m=null,g=null;const x=new x0,p=e.getContextAttributes();let f=null,E=null;const T=[],M=[],N=new Ft;let b=null;const C=new je;C.viewport=new he;const L=new je;L.viewport=new he;const y=[C,L],v=new p0;let P=null,G=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(et){let lt=T[et];return lt===void 0&&(lt=new Wr,T[et]=lt),lt.getTargetRaySpace()},this.getControllerGrip=function(et){let lt=T[et];return lt===void 0&&(lt=new Wr,T[et]=lt),lt.getGripSpace()},this.getHand=function(et){let lt=T[et];return lt===void 0&&(lt=new Wr,T[et]=lt),lt.getHandSpace()};function V(et){const lt=M.indexOf(et.inputSource);if(lt===-1)return;const pt=T[lt];pt!==void 0&&(pt.update(et.inputSource,et.frame,c||o),pt.dispatchEvent({type:et.type,data:et.inputSource}))}function J(){s.removeEventListener("select",V),s.removeEventListener("selectstart",V),s.removeEventListener("selectend",V),s.removeEventListener("squeeze",V),s.removeEventListener("squeezestart",V),s.removeEventListener("squeezeend",V),s.removeEventListener("end",J),s.removeEventListener("inputsourceschange",tt);for(let et=0;et<T.length;et++){const lt=M[et];lt!==null&&(M[et]=null,T[et].disconnect(lt))}P=null,G=null,x.reset(),t.setRenderTarget(f),m=null,d=null,u=null,s=null,E=null,Ht.stop(),i.isPresenting=!1,t.setPixelRatio(b),t.setSize(N.width,N.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(et){r=et,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(et){a=et,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(et){c=et},this.getBaseLayer=function(){return d!==null?d:m},this.getBinding=function(){return u},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(et){if(s=et,s!==null){if(f=t.getRenderTarget(),s.addEventListener("select",V),s.addEventListener("selectstart",V),s.addEventListener("selectend",V),s.addEventListener("squeeze",V),s.addEventListener("squeezestart",V),s.addEventListener("squeezeend",V),s.addEventListener("end",J),s.addEventListener("inputsourceschange",tt),p.xrCompatible!==!0&&await e.makeXRCompatible(),b=t.getPixelRatio(),t.getSize(N),s.renderState.layers===void 0){const lt={antialias:p.antialias,alpha:!0,depth:p.depth,stencil:p.stencil,framebufferScaleFactor:r};m=new XRWebGLLayer(s,e,lt),s.updateRenderState({baseLayer:m}),t.setPixelRatio(1),t.setSize(m.framebufferWidth,m.framebufferHeight,!1),E=new en(m.framebufferWidth,m.framebufferHeight,{format:Je,type:An,colorSpace:t.outputColorSpace,stencilBuffer:p.stencil})}else{let lt=null,pt=null,ft=null;p.depth&&(ft=p.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,lt=p.stencil?Bi:Pi,pt=p.stencil?Oi:si);const it={colorFormat:e.RGBA8,depthFormat:ft,scaleFactor:r};u=new XRWebGLBinding(s,e),d=u.createProjectionLayer(it),s.updateRenderState({layers:[d]}),t.setPixelRatio(1),t.setSize(d.textureWidth,d.textureHeight,!1),E=new en(d.textureWidth,d.textureHeight,{format:Je,type:An,depthTexture:new Fc(d.textureWidth,d.textureHeight,pt,void 0,void 0,void 0,void 0,void 0,void 0,lt),stencilBuffer:p.stencil,colorSpace:t.outputColorSpace,samples:p.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1})}E.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),Ht.setContext(s),Ht.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return x.getDepthTexture()};function tt(et){for(let lt=0;lt<et.removed.length;lt++){const pt=et.removed[lt],ft=M.indexOf(pt);ft>=0&&(M[ft]=null,T[ft].disconnect(pt))}for(let lt=0;lt<et.added.length;lt++){const pt=et.added[lt];let ft=M.indexOf(pt);if(ft===-1){for(let ct=0;ct<T.length;ct++)if(ct>=M.length){M.push(pt),ft=ct;break}else if(M[ct]===null){M[ct]=pt,ft=ct;break}if(ft===-1)break}const it=T[ft];it&&it.connect(pt)}}const Q=new H,W=new H;function $(et,lt,pt){Q.setFromMatrixPosition(lt.matrixWorld),W.setFromMatrixPosition(pt.matrixWorld);const ft=Q.distanceTo(W),it=lt.projectionMatrix.elements,ct=pt.projectionMatrix.elements,ht=it[14]/(it[10]-1),Tt=it[14]/(it[10]+1),yt=(it[9]+1)/it[5],Lt=(it[9]-1)/it[5],D=(it[8]-1)/it[0],Yt=(ct[8]+1)/ct[0],Ot=ht*D,zt=ht*Yt,bt=ft/(-D+Yt),Wt=bt*-D;if(lt.matrixWorld.decompose(et.position,et.quaternion,et.scale),et.translateX(Wt),et.translateZ(bt),et.matrixWorld.compose(et.position,et.quaternion,et.scale),et.matrixWorldInverse.copy(et.matrixWorld).invert(),it[10]===-1)et.projectionMatrix.copy(lt.projectionMatrix),et.projectionMatrixInverse.copy(lt.projectionMatrixInverse);else{const At=ht+bt,A=Tt+bt,_=Ot-Wt,R=zt+(ft-Wt),w=yt*Tt/A*At,I=Lt*Tt/A*At;et.projectionMatrix.makePerspective(_,R,w,I,At,A),et.projectionMatrixInverse.copy(et.projectionMatrix).invert()}}function rt(et,lt){lt===null?et.matrixWorld.copy(et.matrix):et.matrixWorld.multiplyMatrices(lt.matrixWorld,et.matrix),et.matrixWorldInverse.copy(et.matrixWorld).invert()}this.updateCamera=function(et){if(s===null)return;let lt=et.near,pt=et.far;x.texture!==null&&(x.depthNear>0&&(lt=x.depthNear),x.depthFar>0&&(pt=x.depthFar)),v.near=L.near=C.near=lt,v.far=L.far=C.far=pt,(P!==v.near||G!==v.far)&&(s.updateRenderState({depthNear:v.near,depthFar:v.far}),P=v.near,G=v.far),C.layers.mask=et.layers.mask|2,L.layers.mask=et.layers.mask|4,v.layers.mask=C.layers.mask|L.layers.mask;const ft=et.parent,it=v.cameras;rt(v,ft);for(let ct=0;ct<it.length;ct++)rt(it[ct],ft);it.length===2?$(v,C,L):v.projectionMatrix.copy(C.projectionMatrix),vt(et,v,ft)};function vt(et,lt,pt){pt===null?et.matrix.copy(lt.matrixWorld):(et.matrix.copy(pt.matrixWorld),et.matrix.invert(),et.matrix.multiply(lt.matrixWorld)),et.matrix.decompose(et.position,et.quaternion,et.scale),et.updateMatrixWorld(!0),et.projectionMatrix.copy(lt.projectionMatrix),et.projectionMatrixInverse.copy(lt.projectionMatrixInverse),et.isPerspectiveCamera&&(et.fov=Go*2*Math.atan(1/et.projectionMatrix.elements[5]),et.zoom=1)}this.getCamera=function(){return v},this.getFoveation=function(){if(!(d===null&&m===null))return l},this.setFoveation=function(et){l=et,d!==null&&(d.fixedFoveation=et),m!==null&&m.fixedFoveation!==void 0&&(m.fixedFoveation=et)},this.hasDepthSensing=function(){return x.texture!==null},this.getDepthSensingMesh=function(){return x.getMesh(v)};let gt=null;function nt(et,lt){if(h=lt.getViewerPose(c||o),g=lt,h!==null){const pt=h.views;m!==null&&(t.setRenderTargetFramebuffer(E,m.framebuffer),t.setRenderTarget(E));let ft=!1;pt.length!==v.cameras.length&&(v.cameras.length=0,ft=!0);for(let ct=0;ct<pt.length;ct++){const ht=pt[ct];let Tt=null;if(m!==null)Tt=m.getViewport(ht);else{const Lt=u.getViewSubImage(d,ht);Tt=Lt.viewport,ct===0&&(t.setRenderTargetTextures(E,Lt.colorTexture,d.ignoreDepthValues?void 0:Lt.depthStencilTexture),t.setRenderTarget(E))}let yt=y[ct];yt===void 0&&(yt=new je,yt.layers.enable(ct),yt.viewport=new he,y[ct]=yt),yt.matrix.fromArray(ht.transform.matrix),yt.matrix.decompose(yt.position,yt.quaternion,yt.scale),yt.projectionMatrix.fromArray(ht.projectionMatrix),yt.projectionMatrixInverse.copy(yt.projectionMatrix).invert(),yt.viewport.set(Tt.x,Tt.y,Tt.width,Tt.height),ct===0&&(v.matrix.copy(yt.matrix),v.matrix.decompose(v.position,v.quaternion,v.scale)),ft===!0&&v.cameras.push(yt)}const it=s.enabledFeatures;if(it&&it.includes("depth-sensing")){const ct=u.getDepthInformation(pt[0]);ct&&ct.isValid&&ct.texture&&x.init(t,ct,s.renderState)}}for(let pt=0;pt<T.length;pt++){const ft=M[pt],it=T[pt];ft!==null&&it!==void 0&&it.update(ft,lt,c||o)}gt&&gt(et,lt),lt.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:lt}),g=null}const Ht=new Nc;Ht.setAnimationLoop(nt),this.setAnimationLoop=function(et){gt=et},this.dispose=function(){}}}const Yn=new wn,M0=new ue;function y0(n,t){function e(p,f){p.matrixAutoUpdate===!0&&p.updateMatrix(),f.value.copy(p.matrix)}function i(p,f){f.color.getRGB(p.fogColor.value,Lc(n)),f.isFog?(p.fogNear.value=f.near,p.fogFar.value=f.far):f.isFogExp2&&(p.fogDensity.value=f.density)}function s(p,f,E,T,M){f.isMeshBasicMaterial||f.isMeshLambertMaterial?r(p,f):f.isMeshToonMaterial?(r(p,f),u(p,f)):f.isMeshPhongMaterial?(r(p,f),h(p,f)):f.isMeshStandardMaterial?(r(p,f),d(p,f),f.isMeshPhysicalMaterial&&m(p,f,M)):f.isMeshMatcapMaterial?(r(p,f),g(p,f)):f.isMeshDepthMaterial?r(p,f):f.isMeshDistanceMaterial?(r(p,f),x(p,f)):f.isMeshNormalMaterial?r(p,f):f.isLineBasicMaterial?(o(p,f),f.isLineDashedMaterial&&a(p,f)):f.isPointsMaterial?l(p,f,E,T):f.isSpriteMaterial?c(p,f):f.isShadowMaterial?(p.color.value.copy(f.color),p.opacity.value=f.opacity):f.isShaderMaterial&&(f.uniformsNeedUpdate=!1)}function r(p,f){p.opacity.value=f.opacity,f.color&&p.diffuse.value.copy(f.color),f.emissive&&p.emissive.value.copy(f.emissive).multiplyScalar(f.emissiveIntensity),f.map&&(p.map.value=f.map,e(f.map,p.mapTransform)),f.alphaMap&&(p.alphaMap.value=f.alphaMap,e(f.alphaMap,p.alphaMapTransform)),f.bumpMap&&(p.bumpMap.value=f.bumpMap,e(f.bumpMap,p.bumpMapTransform),p.bumpScale.value=f.bumpScale,f.side===Pe&&(p.bumpScale.value*=-1)),f.normalMap&&(p.normalMap.value=f.normalMap,e(f.normalMap,p.normalMapTransform),p.normalScale.value.copy(f.normalScale),f.side===Pe&&p.normalScale.value.negate()),f.displacementMap&&(p.displacementMap.value=f.displacementMap,e(f.displacementMap,p.displacementMapTransform),p.displacementScale.value=f.displacementScale,p.displacementBias.value=f.displacementBias),f.emissiveMap&&(p.emissiveMap.value=f.emissiveMap,e(f.emissiveMap,p.emissiveMapTransform)),f.specularMap&&(p.specularMap.value=f.specularMap,e(f.specularMap,p.specularMapTransform)),f.alphaTest>0&&(p.alphaTest.value=f.alphaTest);const E=t.get(f),T=E.envMap,M=E.envMapRotation;T&&(p.envMap.value=T,Yn.copy(M),Yn.x*=-1,Yn.y*=-1,Yn.z*=-1,T.isCubeTexture&&T.isRenderTargetTexture===!1&&(Yn.y*=-1,Yn.z*=-1),p.envMapRotation.value.setFromMatrix4(M0.makeRotationFromEuler(Yn)),p.flipEnvMap.value=T.isCubeTexture&&T.isRenderTargetTexture===!1?-1:1,p.reflectivity.value=f.reflectivity,p.ior.value=f.ior,p.refractionRatio.value=f.refractionRatio),f.lightMap&&(p.lightMap.value=f.lightMap,p.lightMapIntensity.value=f.lightMapIntensity,e(f.lightMap,p.lightMapTransform)),f.aoMap&&(p.aoMap.value=f.aoMap,p.aoMapIntensity.value=f.aoMapIntensity,e(f.aoMap,p.aoMapTransform))}function o(p,f){p.diffuse.value.copy(f.color),p.opacity.value=f.opacity,f.map&&(p.map.value=f.map,e(f.map,p.mapTransform))}function a(p,f){p.dashSize.value=f.dashSize,p.totalSize.value=f.dashSize+f.gapSize,p.scale.value=f.scale}function l(p,f,E,T){p.diffuse.value.copy(f.color),p.opacity.value=f.opacity,p.size.value=f.size*E,p.scale.value=T*.5,f.map&&(p.map.value=f.map,e(f.map,p.uvTransform)),f.alphaMap&&(p.alphaMap.value=f.alphaMap,e(f.alphaMap,p.alphaMapTransform)),f.alphaTest>0&&(p.alphaTest.value=f.alphaTest)}function c(p,f){p.diffuse.value.copy(f.color),p.opacity.value=f.opacity,p.rotation.value=f.rotation,f.map&&(p.map.value=f.map,e(f.map,p.mapTransform)),f.alphaMap&&(p.alphaMap.value=f.alphaMap,e(f.alphaMap,p.alphaMapTransform)),f.alphaTest>0&&(p.alphaTest.value=f.alphaTest)}function h(p,f){p.specular.value.copy(f.specular),p.shininess.value=Math.max(f.shininess,1e-4)}function u(p,f){f.gradientMap&&(p.gradientMap.value=f.gradientMap)}function d(p,f){p.metalness.value=f.metalness,f.metalnessMap&&(p.metalnessMap.value=f.metalnessMap,e(f.metalnessMap,p.metalnessMapTransform)),p.roughness.value=f.roughness,f.roughnessMap&&(p.roughnessMap.value=f.roughnessMap,e(f.roughnessMap,p.roughnessMapTransform)),f.envMap&&(p.envMapIntensity.value=f.envMapIntensity)}function m(p,f,E){p.ior.value=f.ior,f.sheen>0&&(p.sheenColor.value.copy(f.sheenColor).multiplyScalar(f.sheen),p.sheenRoughness.value=f.sheenRoughness,f.sheenColorMap&&(p.sheenColorMap.value=f.sheenColorMap,e(f.sheenColorMap,p.sheenColorMapTransform)),f.sheenRoughnessMap&&(p.sheenRoughnessMap.value=f.sheenRoughnessMap,e(f.sheenRoughnessMap,p.sheenRoughnessMapTransform))),f.clearcoat>0&&(p.clearcoat.value=f.clearcoat,p.clearcoatRoughness.value=f.clearcoatRoughness,f.clearcoatMap&&(p.clearcoatMap.value=f.clearcoatMap,e(f.clearcoatMap,p.clearcoatMapTransform)),f.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=f.clearcoatRoughnessMap,e(f.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),f.clearcoatNormalMap&&(p.clearcoatNormalMap.value=f.clearcoatNormalMap,e(f.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(f.clearcoatNormalScale),f.side===Pe&&p.clearcoatNormalScale.value.negate())),f.dispersion>0&&(p.dispersion.value=f.dispersion),f.iridescence>0&&(p.iridescence.value=f.iridescence,p.iridescenceIOR.value=f.iridescenceIOR,p.iridescenceThicknessMinimum.value=f.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=f.iridescenceThicknessRange[1],f.iridescenceMap&&(p.iridescenceMap.value=f.iridescenceMap,e(f.iridescenceMap,p.iridescenceMapTransform)),f.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=f.iridescenceThicknessMap,e(f.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),f.transmission>0&&(p.transmission.value=f.transmission,p.transmissionSamplerMap.value=E.texture,p.transmissionSamplerSize.value.set(E.width,E.height),f.transmissionMap&&(p.transmissionMap.value=f.transmissionMap,e(f.transmissionMap,p.transmissionMapTransform)),p.thickness.value=f.thickness,f.thicknessMap&&(p.thicknessMap.value=f.thicknessMap,e(f.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=f.attenuationDistance,p.attenuationColor.value.copy(f.attenuationColor)),f.anisotropy>0&&(p.anisotropyVector.value.set(f.anisotropy*Math.cos(f.anisotropyRotation),f.anisotropy*Math.sin(f.anisotropyRotation)),f.anisotropyMap&&(p.anisotropyMap.value=f.anisotropyMap,e(f.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=f.specularIntensity,p.specularColor.value.copy(f.specularColor),f.specularColorMap&&(p.specularColorMap.value=f.specularColorMap,e(f.specularColorMap,p.specularColorMapTransform)),f.specularIntensityMap&&(p.specularIntensityMap.value=f.specularIntensityMap,e(f.specularIntensityMap,p.specularIntensityMapTransform))}function g(p,f){f.matcap&&(p.matcap.value=f.matcap)}function x(p,f){const E=t.get(f).light;p.referencePosition.value.setFromMatrixPosition(E.matrixWorld),p.nearDistance.value=E.shadow.camera.near,p.farDistance.value=E.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function S0(n,t,e,i){let s={},r={},o=[];const a=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(E,T){const M=T.program;i.uniformBlockBinding(E,M)}function c(E,T){let M=s[E.id];M===void 0&&(g(E),M=h(E),s[E.id]=M,E.addEventListener("dispose",p));const N=T.program;i.updateUBOMapping(E,N);const b=t.render.frame;r[E.id]!==b&&(d(E),r[E.id]=b)}function h(E){const T=u();E.__bindingPointIndex=T;const M=n.createBuffer(),N=E.__size,b=E.usage;return n.bindBuffer(n.UNIFORM_BUFFER,M),n.bufferData(n.UNIFORM_BUFFER,N,b),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,T,M),M}function u(){for(let E=0;E<a;E++)if(o.indexOf(E)===-1)return o.push(E),E;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(E){const T=s[E.id],M=E.uniforms,N=E.__cache;n.bindBuffer(n.UNIFORM_BUFFER,T);for(let b=0,C=M.length;b<C;b++){const L=Array.isArray(M[b])?M[b]:[M[b]];for(let y=0,v=L.length;y<v;y++){const P=L[y];if(m(P,b,y,N)===!0){const G=P.__offset,V=Array.isArray(P.value)?P.value:[P.value];let J=0;for(let tt=0;tt<V.length;tt++){const Q=V[tt],W=x(Q);typeof Q=="number"||typeof Q=="boolean"?(P.__data[0]=Q,n.bufferSubData(n.UNIFORM_BUFFER,G+J,P.__data)):Q.isMatrix3?(P.__data[0]=Q.elements[0],P.__data[1]=Q.elements[1],P.__data[2]=Q.elements[2],P.__data[3]=0,P.__data[4]=Q.elements[3],P.__data[5]=Q.elements[4],P.__data[6]=Q.elements[5],P.__data[7]=0,P.__data[8]=Q.elements[6],P.__data[9]=Q.elements[7],P.__data[10]=Q.elements[8],P.__data[11]=0):(Q.toArray(P.__data,J),J+=W.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,G,P.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function m(E,T,M,N){const b=E.value,C=T+"_"+M;if(N[C]===void 0)return typeof b=="number"||typeof b=="boolean"?N[C]=b:N[C]=b.clone(),!0;{const L=N[C];if(typeof b=="number"||typeof b=="boolean"){if(L!==b)return N[C]=b,!0}else if(L.equals(b)===!1)return L.copy(b),!0}return!1}function g(E){const T=E.uniforms;let M=0;const N=16;for(let C=0,L=T.length;C<L;C++){const y=Array.isArray(T[C])?T[C]:[T[C]];for(let v=0,P=y.length;v<P;v++){const G=y[v],V=Array.isArray(G.value)?G.value:[G.value];for(let J=0,tt=V.length;J<tt;J++){const Q=V[J],W=x(Q),$=M%N,rt=$%W.boundary,vt=$+rt;M+=rt,vt!==0&&N-vt<W.storage&&(M+=N-vt),G.__data=new Float32Array(W.storage/Float32Array.BYTES_PER_ELEMENT),G.__offset=M,M+=W.storage}}}const b=M%N;return b>0&&(M+=N-b),E.__size=M,E.__cache={},this}function x(E){const T={boundary:0,storage:0};return typeof E=="number"||typeof E=="boolean"?(T.boundary=4,T.storage=4):E.isVector2?(T.boundary=8,T.storage=8):E.isVector3||E.isColor?(T.boundary=16,T.storage=12):E.isVector4?(T.boundary=16,T.storage=16):E.isMatrix3?(T.boundary=48,T.storage=48):E.isMatrix4?(T.boundary=64,T.storage=64):E.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",E),T}function p(E){const T=E.target;T.removeEventListener("dispose",p);const M=o.indexOf(T.__bindingPointIndex);o.splice(M,1),n.deleteBuffer(s[T.id]),delete s[T.id],delete r[T.id]}function f(){for(const E in s)n.deleteBuffer(s[E]);o=[],s={},r={}}return{bind:l,update:c,dispose:f}}class Hc{constructor(t={}){const{canvas:e=uu(),context:i=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reverseDepthBuffer:d=!1}=t;this.isWebGLRenderer=!0;let m;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=i.getContextAttributes().alpha}else m=o;const g=new Uint32Array(4),x=new Int32Array(4);let p=null,f=null;const E=[],T=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Ge,this.toneMapping=zn,this.toneMappingExposure=1;const M=this;let N=!1,b=0,C=0,L=null,y=-1,v=null;const P=new he,G=new he;let V=null;const J=new Kt(0);let tt=0,Q=e.width,W=e.height,$=1,rt=null,vt=null;const gt=new he(0,0,Q,W),nt=new he(0,0,Q,W);let Ht=!1;const et=new Uc;let lt=!1,pt=!1;const ft=new ue,it=new ue,ct=new H,ht=new he,Tt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let yt=!1;function Lt(){return L===null?$:1}let D=i;function Yt(S,k){return e.getContext(S,k)}try{const S={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${Zo}`),e.addEventListener("webglcontextlost",K,!1),e.addEventListener("webglcontextrestored",at,!1),e.addEventListener("webglcontextcreationerror",_t,!1),D===null){const k="webgl2";if(D=Yt(k,S),D===null)throw Yt(k)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(S){throw console.error("THREE.WebGLRenderer: "+S.message),S}let Ot,zt,bt,Wt,At,A,_,R,w,I,U,Z,B,Y,ot,X,st,ut,St,dt,Ut,Pt,Bt,F;function xt(){Ot=new Rp(D),Ot.init(),Pt=new f0(D,Ot),zt=new Sp(D,Ot,t,Pt),bt=new h0(D,Ot),zt.reverseDepthBuffer&&d&&bt.buffers.depth.setReversed(!0),Wt=new Lp(D),At=new jm,A=new d0(D,Ot,bt,At,zt,Pt,Wt),_=new Tp(M),R=new wp(M),w=new Ou(D),Bt=new Mp(D,w),I=new Cp(D,w,Wt,Bt),U=new Ip(D,I,w,Wt),St=new Dp(D,zt,A),X=new Ep(At),Z=new qm(M,_,R,Ot,zt,Bt,X),B=new y0(M,At),Y=new Zm,ot=new i0(Ot),ut=new vp(M,_,R,bt,U,m,l),st=new l0(M,U,zt),F=new S0(D,Wt,zt,bt),dt=new yp(D,Ot,Wt),Ut=new Pp(D,Ot,Wt),Wt.programs=Z.programs,M.capabilities=zt,M.extensions=Ot,M.properties=At,M.renderLists=Y,M.shadowMap=st,M.state=bt,M.info=Wt}xt();const O=new v0(M,D);this.xr=O,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){const S=Ot.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){const S=Ot.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return $},this.setPixelRatio=function(S){S!==void 0&&($=S,this.setSize(Q,W,!1))},this.getSize=function(S){return S.set(Q,W)},this.setSize=function(S,k,q=!0){if(O.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}Q=S,W=k,e.width=Math.floor(S*$),e.height=Math.floor(k*$),q===!0&&(e.style.width=S+"px",e.style.height=k+"px"),this.setViewport(0,0,S,k)},this.getDrawingBufferSize=function(S){return S.set(Q*$,W*$).floor()},this.setDrawingBufferSize=function(S,k,q){Q=S,W=k,$=q,e.width=Math.floor(S*q),e.height=Math.floor(k*q),this.setViewport(0,0,S,k)},this.getCurrentViewport=function(S){return S.copy(P)},this.getViewport=function(S){return S.copy(gt)},this.setViewport=function(S,k,q,j){S.isVector4?gt.set(S.x,S.y,S.z,S.w):gt.set(S,k,q,j),bt.viewport(P.copy(gt).multiplyScalar($).round())},this.getScissor=function(S){return S.copy(nt)},this.setScissor=function(S,k,q,j){S.isVector4?nt.set(S.x,S.y,S.z,S.w):nt.set(S,k,q,j),bt.scissor(G.copy(nt).multiplyScalar($).round())},this.getScissorTest=function(){return Ht},this.setScissorTest=function(S){bt.setScissorTest(Ht=S)},this.setOpaqueSort=function(S){rt=S},this.setTransparentSort=function(S){vt=S},this.getClearColor=function(S){return S.copy(ut.getClearColor())},this.setClearColor=function(){ut.setClearColor.apply(ut,arguments)},this.getClearAlpha=function(){return ut.getClearAlpha()},this.setClearAlpha=function(){ut.setClearAlpha.apply(ut,arguments)},this.clear=function(S=!0,k=!0,q=!0){let j=0;if(S){let z=!1;if(L!==null){const mt=L.texture.format;z=mt===ia||mt===na||mt===ea}if(z){const mt=L.texture.type,Et=mt===An||mt===si||mt===os||mt===Oi||mt===Qo||mt===ta,wt=ut.getClearColor(),Rt=ut.getClearAlpha(),kt=wt.r,Gt=wt.g,Ct=wt.b;Et?(g[0]=kt,g[1]=Gt,g[2]=Ct,g[3]=Rt,D.clearBufferuiv(D.COLOR,0,g)):(x[0]=kt,x[1]=Gt,x[2]=Ct,x[3]=Rt,D.clearBufferiv(D.COLOR,0,x))}else j|=D.COLOR_BUFFER_BIT}k&&(j|=D.DEPTH_BUFFER_BIT),q&&(j|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),D.clear(j)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",K,!1),e.removeEventListener("webglcontextrestored",at,!1),e.removeEventListener("webglcontextcreationerror",_t,!1),Y.dispose(),ot.dispose(),At.dispose(),_.dispose(),R.dispose(),U.dispose(),Bt.dispose(),F.dispose(),Z.dispose(),O.dispose(),O.removeEventListener("sessionstart",de),O.removeEventListener("sessionend",Xi),nn.stop()};function K(S){S.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),N=!0}function at(){console.log("THREE.WebGLRenderer: Context Restored."),N=!1;const S=Wt.autoReset,k=st.enabled,q=st.autoUpdate,j=st.needsUpdate,z=st.type;xt(),Wt.autoReset=S,st.enabled=k,st.autoUpdate=q,st.needsUpdate=j,st.type=z}function _t(S){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function It(S){const k=S.target;k.removeEventListener("dispose",It),$t(k)}function $t(S){Jt(S),At.remove(S)}function Jt(S){const k=At.get(S).programs;k!==void 0&&(k.forEach(function(q){Z.releaseProgram(q)}),S.isShaderMaterial&&Z.releaseShaderCache(S))}this.renderBufferDirect=function(S,k,q,j,z,mt){k===null&&(k=Tt);const Et=z.isMesh&&z.matrixWorld.determinant()<0,wt=Th(S,k,q,j,z);bt.setMaterial(j,Et);let Rt=q.index,kt=1;if(j.wireframe===!0){if(Rt=I.getWireframeAttribute(q),Rt===void 0)return;kt=2}const Gt=q.drawRange,Ct=q.attributes.position;let Zt=Gt.start*kt,se=(Gt.start+Gt.count)*kt;mt!==null&&(Zt=Math.max(Zt,mt.start*kt),se=Math.min(se,(mt.start+mt.count)*kt)),Rt!==null?(Zt=Math.max(Zt,0),se=Math.min(se,Rt.count)):Ct!=null&&(Zt=Math.max(Zt,0),se=Math.min(se,Ct.count));const re=se-Zt;if(re<0||re===1/0)return;Bt.setup(z,j,wt,q,Rt);let we,Qt=dt;if(Rt!==null&&(we=w.get(Rt),Qt=Ut,Qt.setIndex(we)),z.isMesh)j.wireframe===!0?(bt.setLineWidth(j.wireframeLinewidth*Lt()),Qt.setMode(D.LINES)):Qt.setMode(D.TRIANGLES);else if(z.isLine){let Dt=j.linewidth;Dt===void 0&&(Dt=1),bt.setLineWidth(Dt*Lt()),z.isLineSegments?Qt.setMode(D.LINES):z.isLineLoop?Qt.setMode(D.LINE_LOOP):Qt.setMode(D.LINE_STRIP)}else z.isPoints?Qt.setMode(D.POINTS):z.isSprite&&Qt.setMode(D.TRIANGLES);if(z.isBatchedMesh)if(z._multiDrawInstances!==null)Qt.renderMultiDrawInstances(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount,z._multiDrawInstances);else if(Ot.get("WEBGL_multi_draw"))Qt.renderMultiDraw(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount);else{const Dt=z._multiDrawStarts,un=z._multiDrawCounts,te=z._multiDrawCount,We=Rt?w.get(Rt).bytesPerElement:1,hi=At.get(j).currentProgram.getUniforms();for(let Ue=0;Ue<te;Ue++)hi.setValue(D,"_gl_DrawID",Ue),Qt.render(Dt[Ue]/We,un[Ue])}else if(z.isInstancedMesh)Qt.renderInstances(Zt,re,z.count);else if(q.isInstancedBufferGeometry){const Dt=q._maxInstanceCount!==void 0?q._maxInstanceCount:1/0,un=Math.min(q.instanceCount,Dt);Qt.renderInstances(Zt,re,un)}else Qt.render(Zt,re)};function qt(S,k,q){S.transparent===!0&&S.side===vn&&S.forceSinglePass===!1?(S.side=Pe,S.needsUpdate=!0,_s(S,k,q),S.side=Hn,S.needsUpdate=!0,_s(S,k,q),S.side=vn):_s(S,k,q)}this.compile=function(S,k,q=null){q===null&&(q=S),f=ot.get(q),f.init(k),T.push(f),q.traverseVisible(function(z){z.isLight&&z.layers.test(k.layers)&&(f.pushLight(z),z.castShadow&&f.pushShadow(z))}),S!==q&&S.traverseVisible(function(z){z.isLight&&z.layers.test(k.layers)&&(f.pushLight(z),z.castShadow&&f.pushShadow(z))}),f.setupLights();const j=new Set;return S.traverse(function(z){if(!(z.isMesh||z.isPoints||z.isLine||z.isSprite))return;const mt=z.material;if(mt)if(Array.isArray(mt))for(let Et=0;Et<mt.length;Et++){const wt=mt[Et];qt(wt,q,z),j.add(wt)}else qt(mt,q,z),j.add(mt)}),T.pop(),f=null,j},this.compileAsync=function(S,k,q=null){const j=this.compile(S,k,q);return new Promise(z=>{function mt(){if(j.forEach(function(Et){At.get(Et).currentProgram.isReady()&&j.delete(Et)}),j.size===0){z(S);return}setTimeout(mt,10)}Ot.get("KHR_parallel_shader_compile")!==null?mt():setTimeout(mt,10)})};let Ie=null;function Ve(S){Ie&&Ie(S)}function de(){nn.stop()}function Xi(){nn.start()}const nn=new Nc;nn.setAnimationLoop(Ve),typeof self<"u"&&nn.setContext(self),this.setAnimationLoop=function(S){Ie=S,O.setAnimationLoop(S),S===null?nn.stop():nn.start()},O.addEventListener("sessionstart",de),O.addEventListener("sessionend",Xi),this.render=function(S,k){if(k!==void 0&&k.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(N===!0)return;if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),k.parent===null&&k.matrixWorldAutoUpdate===!0&&k.updateMatrixWorld(),O.enabled===!0&&O.isPresenting===!0&&(O.cameraAutoUpdate===!0&&O.updateCamera(k),k=O.getCamera()),S.isScene===!0&&S.onBeforeRender(M,S,k,L),f=ot.get(S,T.length),f.init(k),T.push(f),it.multiplyMatrices(k.projectionMatrix,k.matrixWorldInverse),et.setFromProjectionMatrix(it),pt=this.localClippingEnabled,lt=X.init(this.clippingPlanes,pt),p=Y.get(S,E.length),p.init(),E.push(p),O.enabled===!0&&O.isPresenting===!0){const mt=M.xr.getDepthSensingMesh();mt!==null&&ci(mt,k,-1/0,M.sortObjects)}ci(S,k,0,M.sortObjects),p.finish(),M.sortObjects===!0&&p.sort(rt,vt),yt=O.enabled===!1||O.isPresenting===!1||O.hasDepthSensing()===!1,yt&&ut.addToRenderList(p,S),this.info.render.frame++,lt===!0&&X.beginShadows();const q=f.state.shadowsArray;st.render(q,S,k),lt===!0&&X.endShadows(),this.info.autoReset===!0&&this.info.reset();const j=p.opaque,z=p.transmissive;if(f.setupLights(),k.isArrayCamera){const mt=k.cameras;if(z.length>0)for(let Et=0,wt=mt.length;Et<wt;Et++){const Rt=mt[Et];ma(j,z,S,Rt)}yt&&ut.render(S);for(let Et=0,wt=mt.length;Et<wt;Et++){const Rt=mt[Et];pa(p,S,Rt,Rt.viewport)}}else z.length>0&&ma(j,z,S,k),yt&&ut.render(S),pa(p,S,k);L!==null&&(A.updateMultisampleRenderTarget(L),A.updateRenderTargetMipmap(L)),S.isScene===!0&&S.onAfterRender(M,S,k),Bt.resetDefaultState(),y=-1,v=null,T.pop(),T.length>0?(f=T[T.length-1],lt===!0&&X.setGlobalState(M.clippingPlanes,f.state.camera)):f=null,E.pop(),E.length>0?p=E[E.length-1]:p=null};function ci(S,k,q,j){if(S.visible===!1)return;if(S.layers.test(k.layers)){if(S.isGroup)q=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(k);else if(S.isLight)f.pushLight(S),S.castShadow&&f.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||et.intersectsSprite(S)){j&&ht.setFromMatrixPosition(S.matrixWorld).applyMatrix4(it);const Et=U.update(S),wt=S.material;wt.visible&&p.push(S,Et,wt,q,ht.z,null)}}else if((S.isMesh||S.isLine||S.isPoints)&&(!S.frustumCulled||et.intersectsObject(S))){const Et=U.update(S),wt=S.material;if(j&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),ht.copy(S.boundingSphere.center)):(Et.boundingSphere===null&&Et.computeBoundingSphere(),ht.copy(Et.boundingSphere.center)),ht.applyMatrix4(S.matrixWorld).applyMatrix4(it)),Array.isArray(wt)){const Rt=Et.groups;for(let kt=0,Gt=Rt.length;kt<Gt;kt++){const Ct=Rt[kt],Zt=wt[Ct.materialIndex];Zt&&Zt.visible&&p.push(S,Et,Zt,q,ht.z,Ct)}}else wt.visible&&p.push(S,Et,wt,q,ht.z,null)}}const mt=S.children;for(let Et=0,wt=mt.length;Et<wt;Et++)ci(mt[Et],k,q,j)}function pa(S,k,q,j){const z=S.opaque,mt=S.transmissive,Et=S.transparent;f.setupLightsView(q),lt===!0&&X.setGlobalState(M.clippingPlanes,q),j&&bt.viewport(P.copy(j)),z.length>0&&gs(z,k,q),mt.length>0&&gs(mt,k,q),Et.length>0&&gs(Et,k,q),bt.buffers.depth.setTest(!0),bt.buffers.depth.setMask(!0),bt.buffers.color.setMask(!0),bt.setPolygonOffset(!1)}function ma(S,k,q,j){if((q.isScene===!0?q.overrideMaterial:null)!==null)return;f.state.transmissionRenderTarget[j.id]===void 0&&(f.state.transmissionRenderTarget[j.id]=new en(1,1,{generateMipmaps:!0,type:Ot.has("EXT_color_buffer_half_float")||Ot.has("EXT_color_buffer_float")?En:An,minFilter:ti,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:jt.workingColorSpace}));const mt=f.state.transmissionRenderTarget[j.id],Et=j.viewport||P;mt.setSize(Et.z,Et.w);const wt=M.getRenderTarget();M.setRenderTarget(mt),M.getClearColor(J),tt=M.getClearAlpha(),tt<1&&M.setClearColor(16777215,.5),M.clear(),yt&&ut.render(q);const Rt=M.toneMapping;M.toneMapping=zn;const kt=j.viewport;if(j.viewport!==void 0&&(j.viewport=void 0),f.setupLightsView(j),lt===!0&&X.setGlobalState(M.clippingPlanes,j),gs(S,q,j),A.updateMultisampleRenderTarget(mt),A.updateRenderTargetMipmap(mt),Ot.has("WEBGL_multisampled_render_to_texture")===!1){let Gt=!1;for(let Ct=0,Zt=k.length;Ct<Zt;Ct++){const se=k[Ct],re=se.object,we=se.geometry,Qt=se.material,Dt=se.group;if(Qt.side===vn&&re.layers.test(j.layers)){const un=Qt.side;Qt.side=Pe,Qt.needsUpdate=!0,ga(re,q,j,we,Qt,Dt),Qt.side=un,Qt.needsUpdate=!0,Gt=!0}}Gt===!0&&(A.updateMultisampleRenderTarget(mt),A.updateRenderTargetMipmap(mt))}M.setRenderTarget(wt),M.setClearColor(J,tt),kt!==void 0&&(j.viewport=kt),M.toneMapping=Rt}function gs(S,k,q){const j=k.isScene===!0?k.overrideMaterial:null;for(let z=0,mt=S.length;z<mt;z++){const Et=S[z],wt=Et.object,Rt=Et.geometry,kt=j===null?Et.material:j,Gt=Et.group;wt.layers.test(q.layers)&&ga(wt,k,q,Rt,kt,Gt)}}function ga(S,k,q,j,z,mt){S.onBeforeRender(M,k,q,j,z,mt),S.modelViewMatrix.multiplyMatrices(q.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),z.onBeforeRender(M,k,q,j,S,mt),z.transparent===!0&&z.side===vn&&z.forceSinglePass===!1?(z.side=Pe,z.needsUpdate=!0,M.renderBufferDirect(q,k,j,z,S,mt),z.side=Hn,z.needsUpdate=!0,M.renderBufferDirect(q,k,j,z,S,mt),z.side=vn):M.renderBufferDirect(q,k,j,z,S,mt),S.onAfterRender(M,k,q,j,z,mt)}function _s(S,k,q){k.isScene!==!0&&(k=Tt);const j=At.get(S),z=f.state.lights,mt=f.state.shadowsArray,Et=z.state.version,wt=Z.getParameters(S,z.state,mt,k,q),Rt=Z.getProgramCacheKey(wt);let kt=j.programs;j.environment=S.isMeshStandardMaterial?k.environment:null,j.fog=k.fog,j.envMap=(S.isMeshStandardMaterial?R:_).get(S.envMap||j.environment),j.envMapRotation=j.environment!==null&&S.envMap===null?k.environmentRotation:S.envMapRotation,kt===void 0&&(S.addEventListener("dispose",It),kt=new Map,j.programs=kt);let Gt=kt.get(Rt);if(Gt!==void 0){if(j.currentProgram===Gt&&j.lightsStateVersion===Et)return xa(S,wt),Gt}else wt.uniforms=Z.getUniforms(S),S.onBeforeCompile(wt,M),Gt=Z.acquireProgram(wt,Rt),kt.set(Rt,Gt),j.uniforms=wt.uniforms;const Ct=j.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(Ct.clippingPlanes=X.uniform),xa(S,wt),j.needsLights=Ah(S),j.lightsStateVersion=Et,j.needsLights&&(Ct.ambientLightColor.value=z.state.ambient,Ct.lightProbe.value=z.state.probe,Ct.directionalLights.value=z.state.directional,Ct.directionalLightShadows.value=z.state.directionalShadow,Ct.spotLights.value=z.state.spot,Ct.spotLightShadows.value=z.state.spotShadow,Ct.rectAreaLights.value=z.state.rectArea,Ct.ltc_1.value=z.state.rectAreaLTC1,Ct.ltc_2.value=z.state.rectAreaLTC2,Ct.pointLights.value=z.state.point,Ct.pointLightShadows.value=z.state.pointShadow,Ct.hemisphereLights.value=z.state.hemi,Ct.directionalShadowMap.value=z.state.directionalShadowMap,Ct.directionalShadowMatrix.value=z.state.directionalShadowMatrix,Ct.spotShadowMap.value=z.state.spotShadowMap,Ct.spotLightMatrix.value=z.state.spotLightMatrix,Ct.spotLightMap.value=z.state.spotLightMap,Ct.pointShadowMap.value=z.state.pointShadowMap,Ct.pointShadowMatrix.value=z.state.pointShadowMatrix),j.currentProgram=Gt,j.uniformsList=null,Gt}function _a(S){if(S.uniformsList===null){const k=S.currentProgram.getUniforms();S.uniformsList=Js.seqWithValue(k.seq,S.uniforms)}return S.uniformsList}function xa(S,k){const q=At.get(S);q.outputColorSpace=k.outputColorSpace,q.batching=k.batching,q.batchingColor=k.batchingColor,q.instancing=k.instancing,q.instancingColor=k.instancingColor,q.instancingMorph=k.instancingMorph,q.skinning=k.skinning,q.morphTargets=k.morphTargets,q.morphNormals=k.morphNormals,q.morphColors=k.morphColors,q.morphTargetsCount=k.morphTargetsCount,q.numClippingPlanes=k.numClippingPlanes,q.numIntersection=k.numClipIntersection,q.vertexAlphas=k.vertexAlphas,q.vertexTangents=k.vertexTangents,q.toneMapping=k.toneMapping}function Th(S,k,q,j,z){k.isScene!==!0&&(k=Tt),A.resetTextureUnits();const mt=k.fog,Et=j.isMeshStandardMaterial?k.environment:null,wt=L===null?M.outputColorSpace:L.isXRRenderTarget===!0?L.texture.colorSpace:zi,Rt=(j.isMeshStandardMaterial?R:_).get(j.envMap||Et),kt=j.vertexColors===!0&&!!q.attributes.color&&q.attributes.color.itemSize===4,Gt=!!q.attributes.tangent&&(!!j.normalMap||j.anisotropy>0),Ct=!!q.morphAttributes.position,Zt=!!q.morphAttributes.normal,se=!!q.morphAttributes.color;let re=zn;j.toneMapped&&(L===null||L.isXRRenderTarget===!0)&&(re=M.toneMapping);const we=q.morphAttributes.position||q.morphAttributes.normal||q.morphAttributes.color,Qt=we!==void 0?we.length:0,Dt=At.get(j),un=f.state.lights;if(lt===!0&&(pt===!0||S!==v)){const Be=S===v&&j.id===y;X.setState(j,S,Be)}let te=!1;j.version===Dt.__version?(Dt.needsLights&&Dt.lightsStateVersion!==un.state.version||Dt.outputColorSpace!==wt||z.isBatchedMesh&&Dt.batching===!1||!z.isBatchedMesh&&Dt.batching===!0||z.isBatchedMesh&&Dt.batchingColor===!0&&z.colorTexture===null||z.isBatchedMesh&&Dt.batchingColor===!1&&z.colorTexture!==null||z.isInstancedMesh&&Dt.instancing===!1||!z.isInstancedMesh&&Dt.instancing===!0||z.isSkinnedMesh&&Dt.skinning===!1||!z.isSkinnedMesh&&Dt.skinning===!0||z.isInstancedMesh&&Dt.instancingColor===!0&&z.instanceColor===null||z.isInstancedMesh&&Dt.instancingColor===!1&&z.instanceColor!==null||z.isInstancedMesh&&Dt.instancingMorph===!0&&z.morphTexture===null||z.isInstancedMesh&&Dt.instancingMorph===!1&&z.morphTexture!==null||Dt.envMap!==Rt||j.fog===!0&&Dt.fog!==mt||Dt.numClippingPlanes!==void 0&&(Dt.numClippingPlanes!==X.numPlanes||Dt.numIntersection!==X.numIntersection)||Dt.vertexAlphas!==kt||Dt.vertexTangents!==Gt||Dt.morphTargets!==Ct||Dt.morphNormals!==Zt||Dt.morphColors!==se||Dt.toneMapping!==re||Dt.morphTargetsCount!==Qt)&&(te=!0):(te=!0,Dt.__version=j.version);let We=Dt.currentProgram;te===!0&&(We=_s(j,k,z));let hi=!1,Ue=!1,$i=!1;const oe=We.getUniforms(),sn=Dt.uniforms;if(bt.useProgram(We.program)&&(hi=!0,Ue=!0,$i=!0),j.id!==y&&(y=j.id,Ue=!0),hi||v!==S){bt.buffers.depth.getReversed()?(ft.copy(S.projectionMatrix),fu(ft),pu(ft),oe.setValue(D,"projectionMatrix",ft)):oe.setValue(D,"projectionMatrix",S.projectionMatrix),oe.setValue(D,"viewMatrix",S.matrixWorldInverse);const Cn=oe.map.cameraPosition;Cn!==void 0&&Cn.setValue(D,ct.setFromMatrixPosition(S.matrixWorld)),zt.logarithmicDepthBuffer&&oe.setValue(D,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(j.isMeshPhongMaterial||j.isMeshToonMaterial||j.isMeshLambertMaterial||j.isMeshBasicMaterial||j.isMeshStandardMaterial||j.isShaderMaterial)&&oe.setValue(D,"isOrthographic",S.isOrthographicCamera===!0),v!==S&&(v=S,Ue=!0,$i=!0)}if(z.isSkinnedMesh){oe.setOptional(D,z,"bindMatrix"),oe.setOptional(D,z,"bindMatrixInverse");const Be=z.skeleton;Be&&(Be.boneTexture===null&&Be.computeBoneTexture(),oe.setValue(D,"boneTexture",Be.boneTexture,A))}z.isBatchedMesh&&(oe.setOptional(D,z,"batchingTexture"),oe.setValue(D,"batchingTexture",z._matricesTexture,A),oe.setOptional(D,z,"batchingIdTexture"),oe.setValue(D,"batchingIdTexture",z._indirectTexture,A),oe.setOptional(D,z,"batchingColorTexture"),z._colorsTexture!==null&&oe.setValue(D,"batchingColorTexture",z._colorsTexture,A));const Yi=q.morphAttributes;if((Yi.position!==void 0||Yi.normal!==void 0||Yi.color!==void 0)&&St.update(z,q,We),(Ue||Dt.receiveShadow!==z.receiveShadow)&&(Dt.receiveShadow=z.receiveShadow,oe.setValue(D,"receiveShadow",z.receiveShadow)),j.isMeshGouraudMaterial&&j.envMap!==null&&(sn.envMap.value=Rt,sn.flipEnvMap.value=Rt.isCubeTexture&&Rt.isRenderTargetTexture===!1?-1:1),j.isMeshStandardMaterial&&j.envMap===null&&k.environment!==null&&(sn.envMapIntensity.value=k.environmentIntensity),Ue&&(oe.setValue(D,"toneMappingExposure",M.toneMappingExposure),Dt.needsLights&&bh(sn,$i),mt&&j.fog===!0&&B.refreshFogUniforms(sn,mt),B.refreshMaterialUniforms(sn,j,$,W,f.state.transmissionRenderTarget[S.id]),Js.upload(D,_a(Dt),sn,A)),j.isShaderMaterial&&j.uniformsNeedUpdate===!0&&(Js.upload(D,_a(Dt),sn,A),j.uniformsNeedUpdate=!1),j.isSpriteMaterial&&oe.setValue(D,"center",z.center),oe.setValue(D,"modelViewMatrix",z.modelViewMatrix),oe.setValue(D,"normalMatrix",z.normalMatrix),oe.setValue(D,"modelMatrix",z.matrixWorld),j.isShaderMaterial||j.isRawShaderMaterial){const Be=j.uniformsGroups;for(let Cn=0,Pn=Be.length;Cn<Pn;Cn++){const va=Be[Cn];F.update(va,We),F.bind(va,We)}}return We}function bh(S,k){S.ambientLightColor.needsUpdate=k,S.lightProbe.needsUpdate=k,S.directionalLights.needsUpdate=k,S.directionalLightShadows.needsUpdate=k,S.pointLights.needsUpdate=k,S.pointLightShadows.needsUpdate=k,S.spotLights.needsUpdate=k,S.spotLightShadows.needsUpdate=k,S.rectAreaLights.needsUpdate=k,S.hemisphereLights.needsUpdate=k}function Ah(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return b},this.getActiveMipmapLevel=function(){return C},this.getRenderTarget=function(){return L},this.setRenderTargetTextures=function(S,k,q){At.get(S.texture).__webglTexture=k,At.get(S.depthTexture).__webglTexture=q;const j=At.get(S);j.__hasExternalTextures=!0,j.__autoAllocateDepthBuffer=q===void 0,j.__autoAllocateDepthBuffer||Ot.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),j.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(S,k){const q=At.get(S);q.__webglFramebuffer=k,q.__useDefaultFramebuffer=k===void 0},this.setRenderTarget=function(S,k=0,q=0){L=S,b=k,C=q;let j=!0,z=null,mt=!1,Et=!1;if(S){const Rt=At.get(S);if(Rt.__useDefaultFramebuffer!==void 0)bt.bindFramebuffer(D.FRAMEBUFFER,null),j=!1;else if(Rt.__webglFramebuffer===void 0)A.setupRenderTarget(S);else if(Rt.__hasExternalTextures)A.rebindTextures(S,At.get(S.texture).__webglTexture,At.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){const Ct=S.depthTexture;if(Rt.__boundDepthTexture!==Ct){if(Ct!==null&&At.has(Ct)&&(S.width!==Ct.image.width||S.height!==Ct.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");A.setupDepthRenderbuffer(S)}}const kt=S.texture;(kt.isData3DTexture||kt.isDataArrayTexture||kt.isCompressedArrayTexture)&&(Et=!0);const Gt=At.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(Gt[k])?z=Gt[k][q]:z=Gt[k],mt=!0):S.samples>0&&A.useMultisampledRTT(S)===!1?z=At.get(S).__webglMultisampledFramebuffer:Array.isArray(Gt)?z=Gt[q]:z=Gt,P.copy(S.viewport),G.copy(S.scissor),V=S.scissorTest}else P.copy(gt).multiplyScalar($).floor(),G.copy(nt).multiplyScalar($).floor(),V=Ht;if(bt.bindFramebuffer(D.FRAMEBUFFER,z)&&j&&bt.drawBuffers(S,z),bt.viewport(P),bt.scissor(G),bt.setScissorTest(V),mt){const Rt=At.get(S.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+k,Rt.__webglTexture,q)}else if(Et){const Rt=At.get(S.texture),kt=k||0;D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,Rt.__webglTexture,q||0,kt)}y=-1},this.readRenderTargetPixels=function(S,k,q,j,z,mt,Et){if(!(S&&S.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let wt=At.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&Et!==void 0&&(wt=wt[Et]),wt){bt.bindFramebuffer(D.FRAMEBUFFER,wt);try{const Rt=S.texture,kt=Rt.format,Gt=Rt.type;if(!zt.textureFormatReadable(kt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!zt.textureTypeReadable(Gt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}k>=0&&k<=S.width-j&&q>=0&&q<=S.height-z&&D.readPixels(k,q,j,z,Pt.convert(kt),Pt.convert(Gt),mt)}finally{const Rt=L!==null?At.get(L).__webglFramebuffer:null;bt.bindFramebuffer(D.FRAMEBUFFER,Rt)}}},this.readRenderTargetPixelsAsync=async function(S,k,q,j,z,mt,Et){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let wt=At.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&Et!==void 0&&(wt=wt[Et]),wt){const Rt=S.texture,kt=Rt.format,Gt=Rt.type;if(!zt.textureFormatReadable(kt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!zt.textureTypeReadable(Gt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(k>=0&&k<=S.width-j&&q>=0&&q<=S.height-z){bt.bindFramebuffer(D.FRAMEBUFFER,wt);const Ct=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,Ct),D.bufferData(D.PIXEL_PACK_BUFFER,mt.byteLength,D.STREAM_READ),D.readPixels(k,q,j,z,Pt.convert(kt),Pt.convert(Gt),0);const Zt=L!==null?At.get(L).__webglFramebuffer:null;bt.bindFramebuffer(D.FRAMEBUFFER,Zt);const se=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await du(D,se,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,Ct),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,mt),D.deleteBuffer(Ct),D.deleteSync(se),mt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(S,k=null,q=0){S.isTexture!==!0&&(Qi("WebGLRenderer: copyFramebufferToTexture function signature has changed."),k=arguments[0]||null,S=arguments[1]);const j=Math.pow(2,-q),z=Math.floor(S.image.width*j),mt=Math.floor(S.image.height*j),Et=k!==null?k.x:0,wt=k!==null?k.y:0;A.setTexture2D(S,0),D.copyTexSubImage2D(D.TEXTURE_2D,q,0,0,Et,wt,z,mt),bt.unbindTexture()},this.copyTextureToTexture=function(S,k,q=null,j=null,z=0){S.isTexture!==!0&&(Qi("WebGLRenderer: copyTextureToTexture function signature has changed."),j=arguments[0]||null,S=arguments[1],k=arguments[2],z=arguments[3]||0,q=null);let mt,Et,wt,Rt,kt,Gt,Ct,Zt,se;const re=S.isCompressedTexture?S.mipmaps[z]:S.image;q!==null?(mt=q.max.x-q.min.x,Et=q.max.y-q.min.y,wt=q.isBox3?q.max.z-q.min.z:1,Rt=q.min.x,kt=q.min.y,Gt=q.isBox3?q.min.z:0):(mt=re.width,Et=re.height,wt=re.depth||1,Rt=0,kt=0,Gt=0),j!==null?(Ct=j.x,Zt=j.y,se=j.z):(Ct=0,Zt=0,se=0);const we=Pt.convert(k.format),Qt=Pt.convert(k.type);let Dt;k.isData3DTexture?(A.setTexture3D(k,0),Dt=D.TEXTURE_3D):k.isDataArrayTexture||k.isCompressedArrayTexture?(A.setTexture2DArray(k,0),Dt=D.TEXTURE_2D_ARRAY):(A.setTexture2D(k,0),Dt=D.TEXTURE_2D),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,k.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,k.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,k.unpackAlignment);const un=D.getParameter(D.UNPACK_ROW_LENGTH),te=D.getParameter(D.UNPACK_IMAGE_HEIGHT),We=D.getParameter(D.UNPACK_SKIP_PIXELS),hi=D.getParameter(D.UNPACK_SKIP_ROWS),Ue=D.getParameter(D.UNPACK_SKIP_IMAGES);D.pixelStorei(D.UNPACK_ROW_LENGTH,re.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,re.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,Rt),D.pixelStorei(D.UNPACK_SKIP_ROWS,kt),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Gt);const $i=S.isDataArrayTexture||S.isData3DTexture,oe=k.isDataArrayTexture||k.isData3DTexture;if(S.isRenderTargetTexture||S.isDepthTexture){const sn=At.get(S),Yi=At.get(k),Be=At.get(sn.__renderTarget),Cn=At.get(Yi.__renderTarget);bt.bindFramebuffer(D.READ_FRAMEBUFFER,Be.__webglFramebuffer),bt.bindFramebuffer(D.DRAW_FRAMEBUFFER,Cn.__webglFramebuffer);for(let Pn=0;Pn<wt;Pn++)$i&&D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,At.get(S).__webglTexture,z,Gt+Pn),S.isDepthTexture?(oe&&D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,At.get(k).__webglTexture,z,se+Pn),D.blitFramebuffer(Rt,kt,mt,Et,Ct,Zt,mt,Et,D.DEPTH_BUFFER_BIT,D.NEAREST)):oe?D.copyTexSubImage3D(Dt,z,Ct,Zt,se+Pn,Rt,kt,mt,Et):D.copyTexSubImage2D(Dt,z,Ct,Zt,se+Pn,Rt,kt,mt,Et);bt.bindFramebuffer(D.READ_FRAMEBUFFER,null),bt.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else oe?S.isDataTexture||S.isData3DTexture?D.texSubImage3D(Dt,z,Ct,Zt,se,mt,Et,wt,we,Qt,re.data):k.isCompressedArrayTexture?D.compressedTexSubImage3D(Dt,z,Ct,Zt,se,mt,Et,wt,we,re.data):D.texSubImage3D(Dt,z,Ct,Zt,se,mt,Et,wt,we,Qt,re):S.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,z,Ct,Zt,mt,Et,we,Qt,re.data):S.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,z,Ct,Zt,re.width,re.height,we,re.data):D.texSubImage2D(D.TEXTURE_2D,z,Ct,Zt,mt,Et,we,Qt,re);D.pixelStorei(D.UNPACK_ROW_LENGTH,un),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,te),D.pixelStorei(D.UNPACK_SKIP_PIXELS,We),D.pixelStorei(D.UNPACK_SKIP_ROWS,hi),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Ue),z===0&&k.generateMipmaps&&D.generateMipmap(Dt),bt.unbindTexture()},this.copyTextureToTexture3D=function(S,k,q=null,j=null,z=0){return S.isTexture!==!0&&(Qi("WebGLRenderer: copyTextureToTexture3D function signature has changed."),q=arguments[0]||null,j=arguments[1]||null,S=arguments[2],k=arguments[3],z=arguments[4]||0),Qi('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(S,k,q,j,z)},this.initRenderTarget=function(S){At.get(S).__webglFramebuffer===void 0&&A.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?A.setTextureCube(S,0):S.isData3DTexture?A.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?A.setTexture2DArray(S,0):A.setTexture2D(S,0),bt.unbindTexture()},this.resetState=function(){b=0,C=0,L=null,bt.reset(),Bt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return yn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorspace=jt._getDrawingBufferColorSpace(t),e.unpackColorSpace=jt._getUnpackColorSpace()}}class Gc extends De{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new wn,this.environmentIntensity=1,this.environmentRotation=new wn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class E0 extends ds{static get type(){return"PointsMaterial"}constructor(t){super(),this.isPointsMaterial=!0,this.color=new Kt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}const _l=new ue,Wo=new sa,zs=new cr,Hs=new H;class T0 extends De{constructor(t=new hn,e=new E0){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}raycast(t,e){const i=this.geometry,s=this.matrixWorld,r=t.params.Points.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),zs.copy(i.boundingSphere),zs.applyMatrix4(s),zs.radius+=r,t.ray.intersectsSphere(zs)===!1)return;_l.copy(s).invert(),Wo.copy(t.ray).applyMatrix4(_l);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=i.index,u=i.attributes.position;if(c!==null){const d=Math.max(0,o.start),m=Math.min(c.count,o.start+o.count);for(let g=d,x=m;g<x;g++){const p=c.getX(g);Hs.fromBufferAttribute(u,p),xl(Hs,p,l,s,t,e,this)}}else{const d=Math.max(0,o.start),m=Math.min(u.count,o.start+o.count);for(let g=d,x=m;g<x;g++)Hs.fromBufferAttribute(u,g),xl(Hs,g,l,s,t,e,this)}}updateMorphTargets(){const e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){const s=e[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function xl(n,t,e,i,s,r,o){const a=Wo.distanceSqToPoint(n);if(a<e){const l=new H;Wo.closestPointToPoint(n,l),l.applyMatrix4(i);const c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}class b0 extends Ee{static get type(){return"RawShaderMaterial"}constructor(t){super(t),this.isRawShaderMaterial=!0}}class A0{constructor(t=!0){this.autoStart=t,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=vl(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let t=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const e=vl();t=(e-this.oldTime)/1e3,this.oldTime=e,this.elapsedTime+=t}return t}}function vl(){return performance.now()}class Ml{constructor(t=1,e=0,i=0){return this.radius=t,this.phi=e,this.theta=i,this}set(t,e,i){return this.radius=t,this.phi=e,this.theta=i,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=Math.max(1e-6,Math.min(Math.PI-1e-6,this.phi)),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,i){return this.radius=Math.sqrt(t*t+e*e+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,i),this.phi=Math.acos(Ae(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}class w0 extends li{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(){}disconnect(){}dispose(){}update(){}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Zo}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Zo);const yl={type:"change"},aa={type:"start"},Vc={type:"end"},Gs=new sa,Sl=new On,R0=Math.cos(70*hu.DEG2RAD),pe=new H,Ce=2*Math.PI,ie={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Xr=1e-6;class C0 extends w0{constructor(t,e=null){super(t,e),this.state=ie.NONE,this.enabled=!0,this.target=new H,this.cursor=new H,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Ci.ROTATE,MIDDLE:Ci.DOLLY,RIGHT:Ci.PAN},this.touches={ONE:wi.ROTATE,TWO:wi.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new H,this._lastQuaternion=new cn,this._lastTargetPosition=new H,this._quat=new cn().setFromUnitVectors(t.up,new H(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Ml,this._sphericalDelta=new Ml,this._scale=1,this._panOffset=new H,this._rotateStart=new Ft,this._rotateEnd=new Ft,this._rotateDelta=new Ft,this._panStart=new Ft,this._panEnd=new Ft,this._panDelta=new Ft,this._dollyStart=new Ft,this._dollyEnd=new Ft,this._dollyDelta=new Ft,this._dollyDirection=new H,this._mouse=new Ft,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=L0.bind(this),this._onPointerDown=P0.bind(this),this._onPointerUp=D0.bind(this),this._onContextMenu=k0.bind(this),this._onMouseWheel=N0.bind(this),this._onKeyDown=F0.bind(this),this._onTouchStart=O0.bind(this),this._onTouchMove=B0.bind(this),this._onMouseDown=I0.bind(this),this._onMouseMove=U0.bind(this),this._interceptControlDown=z0.bind(this),this._interceptControlUp=H0.bind(this),this.domElement!==null&&this.connect(),this.update()}connect(){this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(yl),this.update(),this.state=ie.NONE}update(t=null){const e=this.object.position;pe.copy(e).sub(this.target),pe.applyQuaternion(this._quat),this._spherical.setFromVector3(pe),this.autoRotate&&this.state===ie.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(i)&&isFinite(s)&&(i<-Math.PI?i+=Ce:i>Math.PI&&(i-=Ce),s<-Math.PI?s+=Ce:s>Math.PI&&(s-=Ce),i<=s?this._spherical.theta=Math.max(i,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+s)/2?Math.max(i,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=o!=this._spherical.radius}if(pe.setFromSpherical(this._spherical),pe.applyQuaternion(this._quatInverse),e.copy(this.target).add(pe),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){const a=pe.length();o=this._clampDistance(a*this._scale);const l=a-o;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){const a=new H(this._mouse.x,this._mouse.y,0);a.unproject(this.object);const l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;const c=new H(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(a),this.object.updateMatrixWorld(),o=pe.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(Gs.origin.copy(this.object.position),Gs.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Gs.direction))<R0?this.object.lookAt(this.target):(Sl.setFromNormalAndCoplanarPoint(this.object.up,this.target),Gs.intersectPlane(Sl,this.target))))}else if(this.object.isOrthographicCamera){const o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>Xr||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Xr||this._lastTargetPosition.distanceToSquared(this.target)>Xr?(this.dispatchEvent(yl),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?Ce/60*this.autoRotateSpeed*t:Ce/60/60*this.autoRotateSpeed}_getZoomScale(t){const e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){pe.setFromMatrixColumn(e,0),pe.multiplyScalar(-t),this._panOffset.add(pe)}_panUp(t,e){this.screenSpacePanning===!0?pe.setFromMatrixColumn(e,1):(pe.setFromMatrixColumn(e,0),pe.crossVectors(this.object.up,pe)),pe.multiplyScalar(t),this._panOffset.add(pe)}_pan(t,e){const i=this.domElement;if(this.object.isPerspectiveCamera){const s=this.object.position;pe.copy(s).sub(this.target);let r=pe.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/i.clientHeight,this.object.matrix),this._panUp(2*e*r/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const i=this.domElement.getBoundingClientRect(),s=t-i.left,r=e-i.top,o=i.width,a=i.height;this._mouse.x=s/o*2-1,this._mouse.y=-(r/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(Ce*this._rotateDelta.x/e.clientHeight),this._rotateUp(Ce*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this._rotateUp(Ce*this.rotateSpeed/this.domElement.clientHeight):this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this._rotateUp(-Ce*this.rotateSpeed/this.domElement.clientHeight):this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this._rotateLeft(Ce*this.rotateSpeed/this.domElement.clientHeight):this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this._rotateLeft(-Ce*this.rotateSpeed/this.domElement.clientHeight):this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),i=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(i,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),i=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(i,s)}}_handleTouchStartDolly(t){const e=this._getSecondPointerPosition(t),i=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(i*i+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{const i=this._getSecondPointerPosition(t),s=.5*(t.pageX+i.x),r=.5*(t.pageY+i.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(Ce*this._rotateDelta.x/e.clientHeight),this._rotateUp(Ce*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),i=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(i,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){const e=this._getSecondPointerPosition(t),i=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(i*i+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const o=(t.pageX+e.x)*.5,a=(t.pageY+e.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new Ft,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){const e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){const e=t.deltaMode,i={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}}function P0(n){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(n.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(n)&&(this._addPointer(n),n.pointerType==="touch"?this._onTouchStart(n):this._onMouseDown(n)))}function L0(n){this.enabled!==!1&&(n.pointerType==="touch"?this._onTouchMove(n):this._onMouseMove(n))}function D0(n){switch(this._removePointer(n),this._pointers.length){case 0:this.domElement.releasePointerCapture(n.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Vc),this.state=ie.NONE;break;case 1:const t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function I0(n){let t;switch(n.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case Ci.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(n),this.state=ie.DOLLY;break;case Ci.ROTATE:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=ie.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=ie.ROTATE}break;case Ci.PAN:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=ie.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=ie.PAN}break;default:this.state=ie.NONE}this.state!==ie.NONE&&this.dispatchEvent(aa)}function U0(n){switch(this.state){case ie.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(n);break;case ie.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(n);break;case ie.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(n);break}}function N0(n){this.enabled===!1||this.enableZoom===!1||this.state!==ie.NONE||(n.preventDefault(),this.dispatchEvent(aa),this._handleMouseWheel(this._customWheelEvent(n)),this.dispatchEvent(Vc))}function F0(n){this.enabled===!1||this.enablePan===!1||this._handleKeyDown(n)}function O0(n){switch(this._trackPointer(n),this._pointers.length){case 1:switch(this.touches.ONE){case wi.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(n),this.state=ie.TOUCH_ROTATE;break;case wi.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(n),this.state=ie.TOUCH_PAN;break;default:this.state=ie.NONE}break;case 2:switch(this.touches.TWO){case wi.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(n),this.state=ie.TOUCH_DOLLY_PAN;break;case wi.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(n),this.state=ie.TOUCH_DOLLY_ROTATE;break;default:this.state=ie.NONE}break;default:this.state=ie.NONE}this.state!==ie.NONE&&this.dispatchEvent(aa)}function B0(n){switch(this._trackPointer(n),this.state){case ie.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(n),this.update();break;case ie.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(n),this.update();break;case ie.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(n),this.update();break;case ie.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(n),this.update();break;default:this.state=ie.NONE}}function k0(n){this.enabled!==!1&&n.preventDefault()}function z0(n){n.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function H0(n){n.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function G0(n){let t=n>>>0;return function(){t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function V0(n){let t=2166136261;for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return t>>>0}const Rn=n=>G0(typeof n=="string"?V0(n):n),ni=(n,t,e)=>t+(e-t)*n(),xn=(n,t,e)=>Math.floor(ni(n,t,e+1));function ce(n,t){const e=t.length,i=t[0]?.length??0;for(const s of t)if(s.length!==i)throw new Error(`glyph "${n}": ragged row (${s.length} != ${i})`);return{name:n,w:i,h:e,rows:t}}const Xo=[ce("ARROW_UP",["..#..",".###.","##.##","..#..","..#..","..#..","..#.."]),ce("ARROW_DOWN",["..#..","..#..","..#..","..#..","##.##",".###.","..#.."]),ce("DIAMOND",["..#..",".#.#.","#...#","#...#","#...#",".#.#.","..#.."]),ce("CROSS_X",["#...#",".#.#.","..#..","..#..","..#..",".#.#.","#...#"]),ce("SQUARE",["#####","#...#","#...#","#...#","#...#","#...#","#####"]),ce("PLUS",["..#..","..#..","..#..","#####","..#..","..#..","..#.."]),ce("TRIANGLE",["..#..","..#..",".#.#.",".#.#.","#...#","#...#","#####"]),ce("ESS",[".####","#....","#....",".###.","....#","....#","####."]),ce("ZED",["#####","....#","...#.","..#..",".#...","#....","#####"]),ce("H_BAR",["#...#","#...#","#...#","#####","#...#","#...#","#...#"]),ce("VEE",["#...#","#...#",".#.#.",".#.#.",".#.#.","..#..","..#.."]),ce("TEE",["#####","..#..","..#..","..#..","..#..","..#..","..#.."]),ce("ELL",["#....","#....","#....","#....","#....","#....","#####"]),ce("KAY",["#...#","#..#.","#.#..","##...","#.#..","#..#.","#...#"]),ce("STAR",["..#..","#.#.#",".###.","#####",".###.","#.#.#","..#.."])];ce("B0",["##","..","..","##"]),ce("B1",["#.","#.","#.","#."]),ce("B2",[".#",".#",".#",".#"]),ce("B3",["##","##","..",".."]),ce("B4",["..","..","##","##"]),ce("B5",["#.",".#","#.",".#"]);function W0(n){const t=[];for(const e of n.rows)for(const i of e)t.push(i==="#");return t}function Wc(n){return W0(n).reduce((t,e)=>t+(e?1:0),0)}function X0(n){const t=[];for(let e=0;e<n.h;e++){const i=n.rows[e];for(let s=0;s<n.w;s++)i[s]==="#"&&t.push({col:s,row:e})}return t}function Xc(n){return X0(n).map(({col:t,row:e})=>({x:t-(n.w-1)/2,y:(n.h-1)/2-e}))}const El=(n,t,e)=>t>=0&&e>=0&&t<n.w&&e<n.h&&n.rows[e][t]==="#";function $0(n){const t=[];for(let e=-1;e<=n.h;e++)for(let i=-1;i<=n.w;i++){if(El(n,i,e))continue;let s=!1;for(let r=-1;r<=1&&!s;r++)for(let o=-1;o<=1;o++)if((r||o)&&El(n,i+o,e+r)){s=!0;break}s&&t.push({x:i-(n.w-1)/2,y:(n.h-1)/2-e})}return t}const Tl=(n,t)=>[n[0]+t[0],n[1]+t[1],n[2]+t[2]],bl=(n,t)=>[n[0]-t[0],n[1]-t[1],n[2]-t[2]],ii=(n,t)=>[n[0]*t,n[1]*t,n[2]*t],ri=(n,t)=>n[0]*t[0]+n[1]*t[1]+n[2]*t[2],$o=(n,t)=>[n[1]*t[2]-n[2]*t[1],n[2]*t[0]-n[0]*t[2],n[0]*t[1]-n[1]*t[0]],Y0=n=>Math.sqrt(ri(n,n));function oi(n){const t=Y0(n);return t>1e-12?ii(n,1/t):[0,0,1]}const q0=(n,t)=>Math.acos(Math.max(-1,Math.min(1,ri(oi(n),oi(t))))),sr=(n,t)=>q0(n,t)*180/Math.PI;function $c(n){const t=oi(n),e=Math.abs(t[2])<.9?[0,0,1]:[1,0,0],i=oi($o(t,e)),s=$o(t,i);return[i,s]}function dr(n){const t=2*n()-1,e=2*Math.PI*n(),i=Math.sqrt(Math.max(0,1-t*t));return[i*Math.cos(e),i*Math.sin(e),t]}function j0(n,t){return ii(dr(n),t*Math.cbrt(n()))}function Al(n,t,e){const i=oi(t),s=Math.cos(e),r=Math.sin(e),o=$o(i,n),a=ri(i,n)*(1-s);return[n[0]*s+o[0]*r+i[0]*a,n[1]*s+o[1]*r+i[1]*a,n[2]*s+o[2]*r+i[2]*a]}const Yc={1:{M:60,K:12,H:0,L:1,thetaLockDeg:6,tRun:60,tSweep:null,drift:!1},2:{M:90,K:14,H:2,L:1,thetaLockDeg:5,tRun:60,tSweep:12,drift:!1},3:{M:120,K:16,H:4,L:2,thetaLockDeg:4,tRun:75,tSweep:10,drift:!1},4:{M:150,K:18,H:6,L:2,thetaLockDeg:3.5,tRun:75,tSweep:8,drift:!0},5:{M:200,K:20,H:8,L:3,thetaLockDeg:3,tRun:90,tSweep:7,drift:!0}},Me={glyphScale:.15,depthMin:.3,depthMax:1,depthScale:.875,noiseRadius:.9,defaultViewDir:[0,0,1],minAxisFromViewDeg:15,minAxisSeparationDeg:35,checkViewpoints:400,checkSkipDeg:30,coherenceSigmaCells:1,coherenceThreshold:.7,maxBoardRerolls:24};function K0(n,t){const e=t.slice();for(let i=e.length-1;i>0;i--){const s=Math.floor(n()*(i+1));[e[i],e[s]]=[e[s],e[i]]}return e}function Z0(n,t,e){const i=Xo.filter(l=>!e.has(l.name)),r=(i.length?i:Xo).map(l=>({g:l,d:Math.abs(Wc(l)-t)})),o=Math.min(...r.map(l=>l.d)),a=r.filter(l=>l.d===o).map(l=>l.g);return a[Math.floor(n()*a.length)]}function J0(n,t){for(let e=0;e<1e3;e++){const i=dr(n);if(!(sr(i,Me.defaultViewDir)<Me.minAxisFromViewDeg)&&!t.some(s=>sr(i,s)<Me.minAxisSeparationDeg))return i}throw new Error("pickAxis: could not satisfy separation constraints")}function wl(n,t,e,i,s){const r=(n()<.5?-1:1)*ni(n,Me.depthMin,Me.depthMax)*Me.depthScale;return Tl(Tl(ii(e,t.x*Me.glyphScale),ii(i,t.y*Me.glyphScale)),ii(s,r))}function qc(n,t,e){const i=Xc(t),s=i.length;if(s===0||n.length<s)return 0;const[r,o]=$c(e),a=Me.glyphScale,l=[],c=[],h=[],u=[];let d=0,m=0,g=0,x=0;for(let L=0;L<s;L++){const y=i[L],v=n[L].pos,P=y.x*a,G=y.y*a,V=ri(v,r),J=ri(v,o);l.push(P),c.push(G),h.push(V),u.push(J),d+=P,m+=G,g+=V,x+=J}d/=s,m/=s,g/=s,x/=s;let p=0,f=0;for(let L=0;L<s;L++){const y=l[L]-d,v=c[L]-m,P=h[L]-g,G=u[L]-x;p+=y*P+v*G,f+=y*G-v*P}const E=Math.atan2(f,p),T=Math.cos(E),M=Math.sin(E);let N=0;for(let L=0;L<s;L++){const y=l[L]-d,v=c[L]-m,P=T*y-M*v,G=M*y+T*v,V=P-(h[L]-g),J=G-(u[L]-x);N+=V*V+J*J}const b=Math.sqrt(N/s),C=Me.glyphScale*Me.coherenceSigmaCells;return Math.exp(-((b/C)**2))}function Q0(n,t,e,i){let s=0;for(let r=0;r<Me.checkViewpoints;r++){const o=dr(i);if(sr(o,e)<Me.checkSkipDeg)continue;const a=qc(n,t,o);a>s&&(s=a)}return s}function tg(n,t){const e=Yc[n],i=Rn(`${t}:constellation:${n}`);for(let s=1;s<=Me.maxBoardRerolls;s++){const r=[],o=[],a=[],l=new Set,c=[];for(let g=0;g<e.L;g++){const x=J0(i,c);c.push(x);const p=Z0(i,e.K,l);l.add(p.name),o.push(p);const[f,E]=$c(x);for(const M of Xc(p))a.push({pos:wl(i,M,f,E,x),pop:"SIGNAL",lock:g});const T=K0(i,$0(p));for(let M=0;M<Math.min(e.H,T.length);M++)a.push({pos:wl(i,T[M],f,E,x),pop:"TRIP",lock:g});r.push({index:g,axis:x,glyph:p.name,signalCount:Wc(p)})}const h=e.M-a.length;if(h<0)continue;let u=0,d=!0;for(let g=0;g<e.L;g++){const x=a.filter(f=>f.pop==="SIGNAL"&&f.lock===g),p=Q0(x,o[g],c[g],Rn(`${t}:check:${n}:${g}`));if(p>u&&(u=p),p>=Me.coherenceThreshold){d=!1;break}}if(!d)continue;const m=a.slice();for(let g=0;g<h;g++)m.push({pos:j0(i,Me.noiseRadius),pop:"NOISE",lock:-1});return{seed:t,difficulty:n,params:e,points:m,locks:r,genStats:{boardAttempts:s,noiseRerolls:0,maxOffAxisCoherence:u}}}throw new Error(`generateBoard: failed to produce a unique board after ${Me.maxBoardRerolls} attempts (seed=${t}, D${n})`)}const eg=1,ng=.1;class ig{board;tRun;tSweep;drift;maxTrips=3;phase="PLAN";timeLeft;trips=0;sweepT=0;sweepCount=0;extracted;constructor(t){this.board=t,this.tRun=t.params.tRun,this.tSweep=t.params.tSweep,this.drift=t.params.drift,this.timeLeft=this.tRun,this.extracted=t.locks.map(()=>new Set)}lockDone(t){return this.extracted[t].size>=this.board.locks[t].signalCount}allDone(){return this.board.locks.every((t,e)=>this.lockDone(e))}extractedCount(t){return this.extracted[t].size}get over(){return this.phase==="WON"||this.phase==="LOST_SOFT"||this.phase==="LOST_CRIT"}select(t,e){if(this.over||e<0)return"ignored";const i=this.board.points[t];if(!i)return"ignored";if(this.phase==="PLAN"&&(this.phase="RUN"),i.pop==="SIGNAL"&&i.lock===e){const s=this.extracted[e];return s.has(t)?"ignored":(s.add(t),this.lockDone(e)?this.allDone()?(this.phase="WON","won"):"lockDone":"extract")}return i.pop==="TRIP"?(this.trips+=1,this.timeLeft=Math.max(0,this.timeLeft-ng*this.tRun),this.trips>=this.maxTrips?this.phase="LOST_CRIT":this.timeLeft<=0&&(this.phase="LOST_SOFT"),"trip"):(this.timeLeft=Math.max(0,this.timeLeft-eg),this.timeLeft<=0&&(this.phase="LOST_SOFT"),"dud")}tick(t,e,i){if(this.phase!=="RUN")return{wrapped:!1};if(this.timeLeft-=t,this.timeLeft<=0)return this.timeLeft=0,this.phase="LOST_SOFT",{wrapped:!1};if(!this.tSweep)return{wrapped:!1};if(this.sweepT+=t/this.tSweep,this.sweepT<1)return{wrapped:!1};if(this.sweepT-=1,this.sweepCount+=1,i>=0&&this.extracted[i].size>0&&!this.lockDone(i)&&!e){const r=this.extracted[i],o=r.values().next().value;o!==void 0&&r.delete(o)}return{wrapped:!0}}result(){const t=this.board.locks.filter((i,s)=>this.lockDone(s)).map(i=>i.glyph),e=Math.max(0,this.timeLeft)+(this.maxTrips-this.trips);return{outcome:this.phase,margin:e,timeUsed:this.tRun-this.timeLeft,trips:this.trips,keys:t}}}const Qs=(n,t)=>{const e=Math.sin(n*12.9898+t*78.233)*43758.5453;return e-Math.floor(e)},sg=(n,t)=>Math.atan2(Math.sin(n-t),Math.cos(n-t));function la(n,t,e,i,s){const r=Math.sin(t),o=Math.cos(t),a=Math.sin(n),l=Math.cos(n);return(c,h,u)=>{const d=c*l+u*a,m=-c*a+u*l,g=h*o-m*r,x=h*r+m*o;return[e+d*s,i-g*s,x]}}function rg(n,t,e,i){const s=2*t*e+i,r=n%s,o=new Array(t).fill(0);let a=-1;if(r<2*t*e){const l=Math.floor(r/e),c=(r-l*e)/e,h=1-(1-Math.min(1,c/.7))**3;if(l<t){for(let u=0;u<l;u++)o[u]=1;o[l]=h,a=l}else{const u=2*t-1-l;for(let d=0;d<u;d++)o[d]=1;o[u]=1-h,a=u}}return{amount:o,active:a}}function og(n){const t=[];for(let e=0;e<n;e++){const i=Math.min(2,Math.floor(Qs(e,2.3)*3)),s=-1+.5*Math.min(3,Math.floor(Qs(e,5.9)*4)),r=Qs(e,7.7)<.5?1:-1;t.push({axis:i,lo:s,hi:s+.5,ang:r*Math.PI/2})}return t}const Rl=og(12);function ag(n,t,e,i){let s=n,r=t,o=e,a=!1;for(let l=0;l<Rl.length;l++){if(i.amount[l]<=0)continue;const c=Rl[l],h=c.axis===0?s:c.axis===1?r:o;if(h<c.lo||h>=c.hi)continue;l===i.active&&(a=!0);const u=c.ang*i.amount[l],d=Math.cos(u),m=Math.sin(u);if(c.axis===0){const g=r*d-o*m;o=r*m+o*d,r=g}else if(c.axis===1){const g=s*d+o*m;o=-s*m+o*d,s=g}else{const g=s*d-r*m;r=s*m+r*d,s=g}}return[s,r,o,a]}function lg(n,t,e,i){const r=la(i*.5,.4+.06*Math.sin(i*.35),n,t,e),o=i*(.5+(1.7-.5)*4),a=e/11,l=[],c=6,h=12;for(let u=0;u<=c;u++){const d=-Math.PI/2+u/c*Math.PI,m=Math.cos(d),g=Math.sin(d),x=Math.max(1,Math.round(Math.abs(m)*h));for(let p=0;p<x;p++){const f=p/x*2*Math.PI,[E,T,M]=r(m*Math.cos(f),g,m*Math.sin(f)),N=(M+1)/2,b=sg(f+i*.5,o),C=Math.exp(-(b*b)/.18)*Math.max(0,M);l.push({x:E,y:T,z:M,r:(.4+1*N+.8*C)*a,white:.62-.54*N,a:.6+.4*Math.min(1,C)})}}return l}function cg(n,t,e,i){const s=la(i*.55,.35+.1*Math.sin(i*.9),n,t,e),r=e/11,o=rg(i,12,.42,1.2),a=[],l=5,c=10;for(let h=0;h<=l;h++){const u=-Math.PI/2+h/l*Math.PI,d=Math.cos(u),m=Math.sin(u),g=Math.max(1,Math.round(Math.abs(d)*c));for(let x=0;x<g;x++){const p=x/g*2*Math.PI,[f,E,T,M]=ag(d*Math.cos(p),m,d*Math.sin(p),o),[N,b,C]=s(f,E,T),L=(C+1)/2;a.push({x:N,y:b,z:C,r:(.4+1*L+(M?.4:0))*r,white:.62-.54*L-(M?.16:0),a:.85})}}return a}function hg(n,t,e,i){const s=la(i*.18,.38,n,t,1),r=e/11,o=[],a=6,l=11;for(let c=0;c<=a;c++){const h=-Math.PI/2+c/a*Math.PI,u=Math.cos(h),d=Math.sin(h),m=.62*Math.sin(i*2.1-c*.52)+.38*Math.sin(i*1.27+c*.83),g=e*(.9+.11*m),x=Math.max(1,Math.round(Math.abs(u)*l));for(let p=0;p<x;p++){const f=p/x*2*Math.PI,[E,T,M]=s(u*Math.cos(f)*g,d*g,u*Math.sin(f)*g),N=(M/e+1)/2,b=Math.max(0,m);o.push({x:E,y:T,z:M,r:(.4+1*N)*(1+.4*b)*r,white:.66-.56*N-.1*b,a:.8})}}return o}const ug={searching:lg,listening:hg,solving:cg};function dg(n){return["searching","listening","solving"][Math.floor(Qs(n,3.7)*3)%3]}function jc(n,t,e,i,s,r,o,a){const l=ug[t](e,i,s,r);l.sort((h,u)=>h.z-u.z);const c=1+.35*Math.max(0,a-1);for(const h of l){const u=Math.min(1,(h.a??1)*a);if(u<.02)continue;const d=Math.max(0,Math.min(1,1-h.white));n.fillStyle=`rgba(${Math.round(d*255*o[0])},${Math.round(d*255*o[1])},${Math.round(d*255*o[2])},${u})`,n.beginPath(),n.arc(h.x,h.y,Math.max(.35,h.r*c),0,Math.PI*2),n.fill()}}const fg=(n,t,e)=>{const i=Math.max(0,Math.min(1,(e-n)/(t-n)));return i*i*(3-2*i)},pg=n=>{const t=Xo.find(e=>e.name===n);if(!t)throw new Error(`glyph ${n} not found`);return t},Vs=30,mg=[93,202,165],Cl=[224,176,112],gg=[208,96,90],Pl=(n,t,e)=>`rgb(${Math.round(n[0]+(t[0]-n[0])*e)},${Math.round(n[1]+(t[1]-n[1])*e)},${Math.round(n[2]+(t[2]-n[2])*e)})`,Ll=n=>n>.5?Pl(mg,Cl,(1-n)/.5):Pl(Cl,gg,Math.max(0,(.5-n)/.5)),_g=[.74,.82,.96],xg=[.44,.9,.74],vg=[.96,.6,.54],Mg=1.6,Dl=15,yg=3.5;function Sg(n,t){const e=n.getContext("2d"),i=Math.min(2,window.devicePixelRatio||1),s=new H(0,0,0),r=.7,o=new ps(-1,1,1,-1,.01,100);o.position.set(0,0,4),o.lookAt(s);const a=new C0(o,n);a.enableDamping=!0,a.enablePan=!1,a.enableZoom=!1,a.target.copy(s);const l="http://www.w3.org/2000/svg",c="ui-monospace,SFMono-Regular,Menlo,monospace",h=(R,w)=>{const I=document.createElement(R);return I.style.cssText=w,document.body.appendChild(I),I},u=document.createElementNS(l,"svg");u.setAttribute("viewBox","0 0 220 130"),u.style.cssText="position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);width:220px;height:130px;pointer-events:none";const d=[];for(let R=0;R<Vs;R++){const w=Math.PI*(1-R/(Vs-1)),I=document.createElementNS(l,"circle");I.setAttribute("cx",String(110+96*Math.cos(w))),I.setAttribute("cy",String(120-96*Math.sin(w))),I.setAttribute("r","2.6"),I.setAttribute("fill","#2a2a34"),u.appendChild(I),d.push(I)}const m=document.createElementNS(l,"text");m.setAttribute("x","110"),m.setAttribute("y","112"),m.setAttribute("text-anchor","middle"),m.setAttribute("fill","#e8c06a"),m.setAttribute("style",`font:11px ${c};letter-spacing:.15em;opacity:0`),u.appendChild(m),t.skill>=1&&document.body.appendChild(u);const g=document.createElementNS(l,"svg");g.setAttribute("viewBox","0 0 48 48"),g.style.cssText="position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top));transform:translateX(-50%);width:46px;height:46px;pointer-events:none";const x=document.createElementNS(l,"circle");x.setAttribute("cx","24"),x.setAttribute("cy","24"),x.setAttribute("r","21"),x.setAttribute("fill","none"),x.setAttribute("stroke",Ll(1)),x.setAttribute("stroke-width","1.6"),g.appendChild(x),document.body.appendChild(g);const p=h("div",`position:fixed;top:calc(10px + env(safe-area-inset-top));left:calc(12px + env(safe-area-inset-left));display:flex;gap:6px;font:13px ${c};color:#5a5a64;pointer-events:none`),f=[0,1,2].map(()=>{const R=document.createElement("span");return R.textContent="✕",p.appendChild(R),R}),E=h("div",`position:fixed;left:50%;top:calc(30px + env(safe-area-inset-top));transform:translateX(-50%);font:11px ${c};color:#8fd0b6;pointer-events:none;opacity:0`),T=h("div",`position:fixed;left:calc(12px + env(safe-area-inset-left));bottom:calc(12px + env(safe-area-inset-bottom));max-width:58vw;font:11px ${c};color:#55555f;pointer-events:none`),M=h("div","position:fixed;width:16px;height:16px;border:1px solid #6fe0b8;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;opacity:0;transition:opacity .1s"),N=h("div","position:fixed;inset:0;pointer-events:none;box-shadow:inset 0 0 120px 20px #d0403a;opacity:0;transition:opacity .3s"),b=h("div",`position:fixed;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:rgba(8,8,13,.55);font:${c};text-align:center;pointer-events:none`);let C,L,y,v,P,G,V,J,tt=[],Q=5,W,$=Rn("drift"),rt=!1,vt=!1,gt=-1e9,nt=1;function Ht(R,w){C=tg(R,w),W=new ig(C),$=Rn(`${w}:drift`),Q=Yc[R].thetaLockDeg;const I=C.points.length;L=new Float32Array(I*3),C.points.forEach((U,Z)=>{L[Z*3]=U.pos[0],L[Z*3+1]=U.pos[1],L[Z*3+2]=U.pos[2]}),nt=.001;for(let U=0;U<I;U++){const Z=Math.hypot(L[U*3],L[U*3+1],L[U*3+2]);Z>nt&&(nt=Z)}y=L.slice(),v=new Float32Array(I),P=new Float32Array(I*2),G=new Uint8Array(I),V=new Uint8Array(I),J=new Float32Array(I),tt=C.locks.map(U=>{const Z=[],B=[],Y=new Map;return C.points.forEach((ot,X)=>{ot.pop==="SIGNAL"&&ot.lock===U.index&&(Z.push(X),B.push(ot),V[X]=1,Y.set(X,bl(ot.pos,ii(U.axis,ri(ot.pos,U.axis)))))}),{axis:U.axis,glyph:pg(U.glyph),signalIdx:Z,signalPts:B,flat:Y,coherence:0}}),T.textContent=`LVL ${R}/5 · ${w} · ${C.locks.length} lock(s) · orbit to align · click to extract · R`,b.style.display="none",rt=!1,vt=!1,et()}Ht(t.difficulty,t.seed);function et(){const R=window.innerWidth,w=window.innerHeight;n.width=Math.round(R*i),n.height=Math.round(w*i),n.style.width=R+"px",n.style.height=w+"px";const I=R/w,U=nt*1.14/Math.min(1,I);o.left=-U*I,o.right=U*I,o.top=U,o.bottom=-U,o.updateProjectionMatrix()}window.addEventListener("resize",et),et();function lt(R){const w=tt[R];if(!w)return;const I=2*Math.PI/180*$(),U=dr($);w.axis=oi(Al(w.axis,U,I)),C.points.forEach((Z,B)=>{Z.lock===R&&(Z.pos=Al(Z.pos,U,I),L[B*3]=Z.pos[0],L[B*3+1]=Z.pos[1],L[B*3+2]=Z.pos[2])}),w.flat.clear();for(const Z of w.signalIdx){const B=C.points[Z].pos;w.flat.set(Z,bl(B,ii(w.axis,ri(B,w.axis))))}}let pt=0,ft=0,it=-1,ct=-1,ht=-1;const Tt=new H,yt=new H;function Lt(R,w){const I=n.getBoundingClientRect(),U=R-I.left,Z=w-I.top;let B=-1,Y=676,ot=-1,X=400;for(let st=0;st<G.length;st++){if(!G[st])continue;const ut=P[st*2]-U,St=P[st*2+1]-Z,dt=ut*ut+St*St,Ut=C.points[st];Ut.pop==="SIGNAL"&&Ut.lock===ht&&!W.extracted[ht]?.has(st)&&dt<Y&&(Y=dt,B=st),dt<X&&(X=dt,ot=st)}return B>=0?B:ot}n.addEventListener("pointerdown",R=>{pt=R.clientX,ft=R.clientY}),n.addEventListener("pointermove",R=>{it=R.clientX,ct=R.clientY}),n.addEventListener("pointerup",R=>{if(Math.hypot(R.clientX-pt,R.clientY-ft)>5||!rt||W.over||ht<0)return;const I=Lt(R.clientX,R.clientY);if(I<0)return;W.select(I,ht)==="trip"&&(J[I]=.5,N.style.opacity="0.9",setTimeout(()=>N.style.opacity="0",60))});const D=new H,Yt=new cn,Ot=new cn,zt=new cn,bt=new H;function Wt(){const R=W.result();let w="#8fd0b6",I="",U="";W.phase==="WON"?(I="◆ EXTRACTED",U=`keys: ${R.keys.join(" · ")}
margin ${R.margin.toFixed(0)} · ${R.trips} strike(s)`):W.phase==="LOST_CRIT"?(w="#d0605a",I="⚠ ALARM",U="intrusion traced — three tripwires"):(w="#e0b070",I="⌛ SIGNAL LOST",U="the run timed out"),b.innerHTML=`<div style="font-size:22px;letter-spacing:.2em;color:${w}">${I}</div><div style="font-size:12px;color:#9a9aa6;white-space:pre-line">${U}</div><div style="font-size:11px;color:#55555f;margin-top:8px">press R or tap ⟳ to run again</div>`,b.style.display="flex"}let At=performance.now(),A=0;function _(){const R=performance.now(),w=R/1e3,I=Math.min(.05,(R-At)/1e3);At=R,a.update(),o.updateMatrixWorld();const U=o.position,Z=oi([U.x-s.x,U.y-s.y,U.z-s.z]);let B=0;ht=-1;let Y=180;tt.forEach((O,K)=>{O.coherence=qc(O.signalPts,O.glyph,Z),O.coherence>B&&(B=O.coherence,ht=K);const at=sr(Z,O.axis);at<Y&&(Y=at)}),y.set(L),v.fill(0);let ot=0;for(const O of tt){const K=fg(.12,.9,O.coherence);if(K>ot&&(ot=K),!(K<=.001))for(const at of O.signalIdx){const _t=O.flat.get(at),It=L[at*3],$t=L[at*3+1],Jt=L[at*3+2];y[at*3]=It+(_t[0]-It)*K,y[at*3+1]=$t+(_t[1]-$t)*K,y[at*3+2]=Jt+(_t[2]-Jt)*K,v[at]=K}}if(ot>.001){const O=.85*ot;for(let K=0;K<v.length;K++)V[K]||(v[K]=-O)}const X=rt&&B>.6,{wrapped:st}=W.tick(I,X,ht);if(st&&W.drift&&ht>=0&&lt(ht),W.phase==="RUN"&&W.tSweep){const O=-1+2*W.sweepT,K=.14;for(let at=0;at<v.length;at++){const _t=Math.abs(y[at*3+1]-O);_t<K&&(v[at]=v[at]+(1-_t/K)*.7)}}let ut=-1;rt&&!W.over&&it>=0&&(ut=Lt(it,ct),ut>=0&&(v[ut]=v[ut]+.5));const St=U.distanceTo(s),dt=Math.max(0,1-(w-gt)/r),Ut=C.points.length,Pt=[],Bt=new Float32Array(Ut);for(let O=0;O<Ut;O++)yt.set(y[O*3],y[O*3+1],y[O*3+2]).applyMatrix4(o.matrixWorldInverse),Bt[O]=Math.max(0,Math.min(1,(-yt.z-(St-1))/2)),Tt.set(y[O*3],y[O*3+1],y[O*3+2]).project(o),P[O*2]=(Tt.x*.5+.5)*window.innerWidth,P[O*2+1]=(-Tt.y*.5+.5)*window.innerHeight,G[O]=1,Pt.push(O),J[O]>0&&(J[O]=Math.max(0,J[O]-I));Pt.sort((O,K)=>Bt[K]-Bt[O]);const F=new Set;for(const O of W.extracted)for(const K of O)F.add(K);e.setTransform(i,0,0,i,0,0),e.clearRect(0,0,window.innerWidth,window.innerHeight);for(const O of Pt){const K=Bt[O],at=v[O],_t=F.has(O);let It=(1-.55*K)*(at<0?1+at:1);if(at>0&&(It+=at*.95),_t&&(It+=.4),It<.05)continue;let $t=(Dl+(yg-Dl)*K)*(1+.28*Math.max(0,at)+(_t?.2:0));$t=Math.max(2.2,$t);let Jt=_t?xg:_g;if(J[O]>0)Jt=vg;else if(dt>0&&at>0){const qt=Math.min(1,at)*dt;Jt=[Jt[0]+(.95-Jt[0])*qt,Jt[1]+(.82-Jt[1])*qt,Jt[2]+(.42-Jt[2])*qt]}jc(e,dg(O),P[O*2],P[O*2+1],$t,w*Mg+O*.7,Jt,It)}if(!rt&&Y<Q&&!W.over?rt=!0:rt&&Y>Q*1.6&&(rt=!1),rt&&ht>=0){const O=U.distanceTo(s);D.set(Z[0],Z[1],Z[2]),bt.set(...tt[ht].axis),Ot.setFromUnitVectors(D,bt),Yt.copy(zt).slerp(Ot,.16),D.applyQuaternion(Yt),o.position.copy(s).addScaledVector(D,O)}if(rt&&!vt&&(gt=w),vt=rt,rt&&!W.over&&ut>=0){const O=n.getBoundingClientRect();M.style.left=`${O.left+P[ut*2]}px`,M.style.top=`${O.top+P[ut*2+1]}px`,M.style.borderColor=C.points[ut]?.pop==="TRIP"?"#d0605a":"#6fe0b8",M.style.opacity="1"}else rt&&!W.over&&it>=0?(M.style.left=`${it}px`,M.style.top=`${ct}px`,M.style.borderColor="#44444c",M.style.opacity="1"):M.style.opacity="0";if(t.skill>=1){const O=Math.round(B*Vs);for(let K=0;K<Vs;K++)d[K].setAttribute("fill",K<O?rt?"#e8c06a":"#5dcaa5":"#2a2a34");rt&&ht>=0?(m.textContent=`⟡ ${tt[ht].glyph.name}`,m.style.opacity="1"):m.style.opacity="0"}const xt=Math.max(0,W.timeLeft/W.tRun);x.setAttribute("r",String(3+18*xt)),x.setAttribute("stroke",Ll(xt)),f.forEach((O,K)=>O.style.color=K<W.trips?"#d0605a":"#3a3a44"),rt&&ht>=0&&!W.over?(E.textContent=`EXTRACT ${W.extractedCount(ht)} / ${C.locks[ht].signalCount}`,E.style.opacity="1"):E.style.opacity="0",W.over&&b.style.display==="none"&&Wt(),A=requestAnimationFrame(_)}return _(),{regenerate(R,w){Ht(R,w)},outcome:()=>W.phase==="WON"?"won":W.over?"lost":"pending",alignLock(R){const w=tt[R];if(!w)return;const I=o.position.distanceTo(s);bt.set(...w.axis),o.position.copy(s).addScaledVector(bt,I),a.update()},debugExtract(R,w){const I=tt[R];if(!I)return;let U=0;for(const Z of I.signalIdx){if(U++>=w)break;W.select(Z,R)}},debugSolve(){for(let R=0;R<tt.length;R++)for(const w of tt[R].signalIdx)W.select(w,R)},debugTime(R){W.phase="RUN",W.timeLeft=Math.max(0,R)*W.tRun},dispose(){cancelAnimationFrame(A),window.removeEventListener("resize",et),a.dispose(),[u,g,p,E,T,M,N,b].forEach(R=>R.remove())}}}const Kc={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class Gi{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const Eg=new ps(-1,1,1,-1,0,1);class Tg extends hn{constructor(){super(),this.setAttribute("position",new bn([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new bn([0,2,0,0,2,0],2))}}const bg=new Tg;class ca{constructor(t){this._mesh=new ln(bg,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,Eg)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}}class Ag extends Gi{constructor(t,e){super(),this.textureID=e!==void 0?e:"tDiffuse",t instanceof Ee?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=as.clone(t.uniforms),this.material=new Ee({name:t.name!==void 0?t.name:"unspecified",defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this.fsQuad=new ca(this.material)}render(t,e,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this.fsQuad.material=this.material,this.renderToScreen?(t.setRenderTarget(null),this.fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this.fsQuad.render(t))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class Il extends Gi{constructor(t,e){super(),this.scene=t,this.camera=e,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(t,e,i){const s=t.getContext(),r=t.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,o,4294967295),r.buffers.stencil.setClear(a),r.buffers.stencil.setLocked(!0),t.setRenderTarget(i),this.clear&&t.clear(),t.render(this.scene,this.camera),t.setRenderTarget(e),this.clear&&t.clear(),t.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}}class wg extends Gi{constructor(){super(),this.needsSwap=!1}render(t){t.state.buffers.stencil.setLocked(!1),t.state.buffers.stencil.setTest(!1)}}class Zc{constructor(t,e){if(this.renderer=t,this._pixelRatio=t.getPixelRatio(),e===void 0){const i=t.getSize(new Ft);this._width=i.width,this._height=i.height,e=new en(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:En}),e.texture.name="EffectComposer.rt1"}else this._width=e.width,this._height=e.height;this.renderTarget1=e,this.renderTarget2=e.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Ag(Kc),this.copyPass.material.blending=Sn,this.clock=new A0}swapBuffers(){const t=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=t}addPass(t){this.passes.push(t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(t,e){this.passes.splice(e,0,t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(t){const e=this.passes.indexOf(t);e!==-1&&this.passes.splice(e,1)}isLastEnabledPass(t){for(let e=t+1;e<this.passes.length;e++)if(this.passes[e].enabled)return!1;return!0}render(t){t===void 0&&(t=this.clock.getDelta());const e=this.renderer.getRenderTarget();let i=!1;for(let s=0,r=this.passes.length;s<r;s++){const o=this.passes[s];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),o.render(this.renderer,this.writeBuffer,this.readBuffer,t,i),o.needsSwap){if(i){const a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,t),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}Il!==void 0&&(o instanceof Il?i=!0:o instanceof wg&&(i=!1))}}this.renderer.setRenderTarget(e)}reset(t){if(t===void 0){const e=this.renderer.getSize(new Ft);this._pixelRatio=this.renderer.getPixelRatio(),this._width=e.width,this._height=e.height,t=this.renderTarget1.clone(),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=t,this.renderTarget2=t.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(t,e){this._width=t,this._height=e;const i=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(i,s),this.renderTarget2.setSize(i,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(i,s)}setPixelRatio(t){this._pixelRatio=t,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class Jc extends Gi{constructor(t,e,i=null,s=null,r=null){super(),this.scene=t,this.camera=e,this.overrideMaterial=i,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Kt}render(t,e,i){const s=t.autoClear;t.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(t.getClearColor(this._oldClearColor),t.setClearColor(this.clearColor,t.getClearAlpha())),this.clearAlpha!==null&&(r=t.getClearAlpha(),t.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&t.clearDepth(),t.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),t.render(this.scene,this.camera),this.clearColor!==null&&t.setClearColor(this._oldClearColor),this.clearAlpha!==null&&t.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),t.autoClear=s}}const Rg={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Kt(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class ai extends Gi{constructor(t,e,i,s){super(),this.strength=e!==void 0?e:1,this.radius=i,this.threshold=s,this.resolution=t!==void 0?new Ft(t.x,t.y):new Ft(256,256),this.clearColor=new Kt(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new en(r,o,{type:En}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let u=0;u<this.nMips;u++){const d=new en(r,o,{type:En});d.texture.name="UnrealBloomPass.h"+u,d.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(d);const m=new en(r,o,{type:En});m.texture.name="UnrealBloomPass.v"+u,m.texture.generateMipmaps=!1,this.renderTargetsVertical.push(m),r=Math.round(r/2),o=Math.round(o/2)}const a=Rg;this.highPassUniforms=as.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Ee({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let u=0;u<this.nMips;u++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(l[u])),this.separableBlurMaterials[u].uniforms.invSize.value=new Ft(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=e,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new H(1,1,1),new H(1,1,1),new H(1,1,1),new H(1,1,1),new H(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;const h=Kc;this.copyUniforms=as.clone(h.uniforms),this.blendMaterial=new Ee({uniforms:this.copyUniforms,vertexShader:h.vertexShader,fragmentShader:h.fragmentShader,blending:er,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new Kt,this.oldClearAlpha=1,this.basic=new ra,this.fsQuad=new ca(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(t,e){let i=Math.round(t/2),s=Math.round(e/2);this.renderTargetBright.setSize(i,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(i,s),this.renderTargetsVertical[r].setSize(i,s),this.separableBlurMaterials[r].uniforms.invSize.value=new Ft(1/i,1/s),i=Math.round(i/2),s=Math.round(s/2)}render(t,e,i,s,r){t.getClearColor(this._oldClearColor),this.oldClearAlpha=t.getClearAlpha();const o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),r&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=i.texture,t.setRenderTarget(null),t.clear(),this.fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this.fsQuad.render(t);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this.fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=ai.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[l]),t.clear(),this.fsQuad.render(t),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=ai.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[l]),t.clear(),this.fsQuad.render(t),a=this.renderTargetsVertical[l];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this.fsQuad.render(t),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this.fsQuad.render(t)):(t.setRenderTarget(i),this.fsQuad.render(t)),t.setClearColor(this._oldClearColor,this.oldClearAlpha),t.autoClear=o}getSeperableBlurMaterial(t){const e=[];for(let i=0;i<t;i++)e.push(.39894*Math.exp(-.5*i*i/(t*t))/t);return new Ee({defines:{KERNEL_RADIUS:t},uniforms:{colorTexture:{value:null},invSize:{value:new Ft(.5,.5)},direction:{value:new Ft(.5,.5)},gaussianCoefficients:{value:e}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}getCompositeMaterial(t){return new Ee({defines:{NUM_MIPS:t},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}ai.BlurDirectionX=new Ft(1,0);ai.BlurDirectionY=new Ft(0,1);const Cg={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`
	
		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class Qc extends Gi{constructor(){super();const t=Cg;this.uniforms=as.clone(t.uniforms),this.material=new b0({name:t.name,uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader}),this.fsQuad=new ca(this.material),this._outputColorSpace=null,this._toneMapping=null}render(t,e,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=t.toneMappingExposure,(this._outputColorSpace!==t.outputColorSpace||this._toneMapping!==t.toneMapping)&&(this._outputColorSpace=t.outputColorSpace,this._toneMapping=t.toneMapping,this.material.defines={},jt.getTransfer(this._outputColorSpace)===ne&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===oc?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===ac?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===lc?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===cc?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===hc?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===uc&&(this.material.defines.NEUTRAL_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(t.setRenderTarget(null),this.fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this.fsQuad.render(t))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}const Pg=`
  attribute vec3 color;
  attribute float size;
  attribute float alpha;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uPixelRatio;
    gl_Position = projectionMatrix * mv;
  }
`,Lg=`
  precision mediump float;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = (1.0 - smoothstep(0.44, 0.5, d)) * vAlpha;
    if (a <= 0.0) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;class th{points;material;geo;pos;col;sz;al;cap;n=0;constructor(t,e={}){this.cap=t,this.pos=new Float32Array(t*3),this.col=new Float32Array(t*3),this.sz=new Float32Array(t),this.al=new Float32Array(t),this.geo=new hn,this.geo.setAttribute("position",new xe(this.pos,3)),this.geo.setAttribute("color",new xe(this.col,3)),this.geo.setAttribute("size",new xe(this.sz,1)),this.geo.setAttribute("alpha",new xe(this.al,1)),this.material=new Ee({uniforms:{uPixelRatio:{value:1}},vertexShader:Pg,fragmentShader:Lg,transparent:!0,depthTest:!1,depthWrite:!1,blending:e.additive?er:ei}),this.points=new T0(this.geo,this.material),this.points.frustumCulled=!1}begin(){this.n=0}grow(){const t=this.cap*2,e=(i,s)=>{const r=new Float32Array(t*s);return r.set(i),r};this.pos=e(this.pos,3),this.col=e(this.col,3),this.sz=e(this.sz,1),this.al=e(this.al,1),this.cap=t,this.geo.setAttribute("position",new xe(this.pos,3)),this.geo.setAttribute("color",new xe(this.col,3)),this.geo.setAttribute("size",new xe(this.sz,1)),this.geo.setAttribute("alpha",new xe(this.al,1))}dot(t,e,i,s,r,o,a=1){this.n>=this.cap&&this.grow();const l=this.n++;this.pos[l*3]=t,this.pos[l*3+1]=e,this.pos[l*3+2]=0,this.col[l*3]=i,this.col[l*3+1]=s,this.col[l*3+2]=r,this.sz[l]=o,this.al[l]=a}commit(t){this.material.uniforms.uPixelRatio.value=t,["position","color","size","alpha"].forEach(e=>{this.geo.getAttribute(e).needsUpdate=!0}),this.geo.setDrawRange(0,this.n)}dispose(){this.geo.dispose(),this.material.dispose()}}const Dg={1:{nodes:8,maxRatingCritical:2,oneWay:0,tracerBase:1.6,alarms:0,spams:0,fog:!1,nukes:1,freezes:1},2:{nodes:10,maxRatingCritical:3,oneWay:0,tracerBase:1.4,alarms:0,spams:1,fog:!1,nukes:1,freezes:1},3:{nodes:12,maxRatingCritical:3,oneWay:1,tracerBase:1.2,alarms:1,spams:1,fog:!1,nukes:1,freezes:1},4:{nodes:14,maxRatingCritical:4,oneWay:2,tracerBase:1,alarms:1,spams:2,fog:!0,nukes:1,freezes:2},5:{nodes:16,maxRatingCritical:5,oneWay:3,tracerBase:.85,alarms:2,spams:2,fog:!0,nukes:1,freezes:1}},Ig=n=>.8*n,ls=(n,t)=>Math.max(.05,Math.min(.85,.05+.12*(n-t))),Ws=(n,t,e)=>n.a===t&&n.b===e||!n.oneWay&&n.a===e&&n.b===t,Ug=(n,t,e)=>n+(t-n)*e,Ul=(n,t,e)=>Math.max(t,Math.min(e,n)),ns={maxAttempts:100,pathMin:4,pathMax:7,cumDetectMax:.85};function Ng(n,t){const e=xn(n,1,t);return n()<.5?Math.min(e,xn(n,1,t)):e}function Fg(n,t,e,i){const s=new Array(i).fill(!1),r=[t];for(s[t]=!0;r.length;){const o=r.pop();if(o===e)return!0;for(const a of n){let l=-1;a.a===o?l=a.b:!a.oneWay&&a.b===o&&(l=a.a),l>=0&&!s[l]&&(s[l]=!0,r.push(l))}}return!1}function Og(n,t,e){const i=Dg[n],s=Rn(`${t}:trace:${n}:${e}`),r=Math.min(xn(s,ns.pathMin,ns.pathMax),i.nodes-1),o=[],a=[],l=[];for(let x=0;x<r;x++){const p=x===0?"ENTRY":x===r-1?"REGISTRY":"DIR",f=p==="ENTRY"?1:p==="REGISTRY"?xn(s,1,Math.min(3,i.maxRatingCritical)):Ng(s,i.maxRatingCritical),E=Ug(-.85,.85,r===1?.5:x/(r-1)),T=ni(s,-.12,.12);o.push({id:x,type:p,rating:f,pos:[E,T]}),l.push(x),x>0&&a.push({a:x-1,b:x,oneWay:!1})}let c=i.alarms,h=i.spams,u=r;for(;u<i.nodes;){const x=xn(s,1,r-1);let p="DIR";c>0&&s()<.45?(p="ALARM",c--):h>0&&s()<.45?(p="SPAM",h--):s()<.5&&(p="STORE");const f=p==="STORE"?xn(s,2,5):p==="DIR"?xn(s,1,5):xn(s,2,4),E=o[x],T=s()<.5?-1:1,M=Ul(E.pos[0]+ni(s,-.18,.18),-.95,.95),N=Ul(E.pos[1]+T*ni(s,.34,.62),-.9,.9),b=u++;if(o.push({id:b,type:p,rating:f,pos:[M,N]}),a.push({a:x,b,oneWay:!1}),s()<.3){const C=xn(s,1,b-1);C!==x&&!a.some(L=>L.a===b&&L.b===C||L.a===C&&L.b===b)&&a.push({a:C,b,oneWay:!1})}}if(i.oneWay>0){const x=a.filter(p=>p.a>=r||p.b>=r);for(let p=0;p<i.oneWay&&p<x.length;p++){const f=x[Math.floor(s()*x.length)];f.oneWay=!0}}const d=r-1;if(!Fg(a,0,d,i.nodes))return null;let m=1;for(let x=1;x<r;x++)m*=1-ls(o[x].rating,1);const g=1-m;return g>ns.cumDetectMax?null:{seed:t,difficulty:n,params:i,nodes:o,edges:a,entry:0,registries:[d],criticalPath:l,genStats:{attempts:e,pathLen:r,cumulativeDetect:g}}}function Bg(n,t){for(let e=1;e<=ns.maxAttempts;e++){const i=Og(n,t,e);if(i)return i}throw new Error(`trace generateBoard: no valid board after ${ns.maxAttempts} attempts (seed=${t}, D${n})`)}const kg=2.5,zg=2,Hg=1.25,Gg=.6,Vg=10,Wg=5,Xg=.7;class $g{board;captureLevel;phase="PLAN";owner;captured=new Set;fortified=new Set;capturing=null;tracer=null;playerAt;moving=null;nukes;freezes;loot=0;trips=0;matchElapsed=0;alarmTriggered=!1;spamSlowUntil=-1;freezeUntil=-1;rng;constructor(t,e=0){this.board=t,this.captureLevel=1+e,this.nukes=t.params.nukes,this.freezes=t.params.freezes,this.owner=t.nodes.map(i=>i.id===t.entry?"P":"SYS"),this.captured.add(t.entry),this.playerAt=t.entry,this.rng=Rn(`${t.seed}:trace-roll:${t.difficulty}`)}get over(){return this.phase==="WON"||this.phase==="LOST_SOFT"||this.phase==="LOST_CRIT"}capturable(){const t=[];for(const e of this.board.nodes)this.owner[e.id]!=="P"&&this.adjacentToOwned(e.id)&&t.push(e.id);return t}adjacentToOwned(t){for(const e of this.captured)for(const i of this.board.edges)if(Ws(i,e,t))return!0;return!1}beginCapture(t){return this.over||this.capturing||this.owner[t]==="P"||!this.adjacentToOwned(t)?!1:(this.phase==="PLAN"&&(this.phase="RUN"),this.capturing={node:t,elapsed:0,total:Ig(this.board.nodes[t].rating)},!0)}fortify(t){if(this.over||this.owner[t]!=="P"||this.fortified.has(t))return!1;this.phase==="PLAN"&&(this.phase="RUN"),this.fortified.add(t);const e=ls(this.board.nodes[t].rating,this.captureLevel)/2;return this.rng()<e&&this.trigger(!1),!0}nuke(t){return this.over||this.nukes<=0||this.owner[t]==="P"||!this.adjacentToOwned(t)?!1:(this.phase==="PLAN"&&(this.phase="RUN"),this.nukes--,this.claim(t,!0),!0)}freeze(){return this.over||this.freezes<=0||!this.tracer?!1:(this.freezes--,this.freezeUntil=this.matchElapsed+Wg,!0)}retreat(t){return this.phase!=="EXFIL"||this.moving||this.owner[t]!=="P"||!this.board.edges.some(e=>Ws(e,this.playerAt,t))?!1:(this.moving={to:t,elapsed:0,total:this.board.params.tracerBase*Xg},!0)}retreatable(){if(this.phase!=="EXFIL")return[];const t=[];for(const e of this.board.nodes)this.owner[e.id]==="P"&&this.board.edges.some(i=>Ws(i,this.playerAt,e.id))&&t.push(e.id);return t}cancel(){this.over||(this.phase="LOST_SOFT")}claim(t,e){this.owner[t]="P",this.captured.add(t);const i=this.board.nodes[t].type;if(i==="STORE"&&this.loot++,i==="REGISTRY"){this.playerAt=t,this.phase="EXFIL",this.trigger(!1);return}if(e)return;const s=this.board.nodes[t].rating;let r=this.rng()<ls(s,this.captureLevel);i==="SPAM"&&(r=!0,this.spamSlowUntil=this.matchElapsed+Vg),r&&this.trigger(i==="ALARM")}trigger(t){if(this.trips++,t&&(this.alarmTriggered=!0),this.tracer)return;const e=this.board.registries[0];this.tracer={node:e,next:e,countdown:0},this.planTracerHop()}stepCost(t){const e=this.board.params.tracerBase,i=this.fortified.has(t)?kg:1,s=this.captured.has(t)?1:zg;return e*i*s}nextHop(t){const e=this.board.nodes.length,i=new Array(e).fill(1/0),s=new Array(e).fill(-1),r=new Array(e).fill(!1);i[t]=0;for(let a=0;a<e;a++){let l=-1,c=1/0;for(let h=0;h<e;h++)!r[h]&&i[h]<c&&(c=i[h],l=h);if(l<0)break;r[l]=!0;for(const h of this.board.edges){let u=-1;if(Ws(h,l,h.a===l?h.b:h.a)&&(u=h.a===l?h.b:h.a),u<0)continue;const d=i[l]+this.stepCost(u);d<i[u]&&(i[u]=d,s[u]=l===t?u:s[l])}}const o=this.board.entry;return!isFinite(i[o])||s[o]<0?null:{node:s[o],cost:this.stepCost(s[o])}}planTracerHop(){if(!this.tracer)return;const t=this.nextHop(this.tracer.node);if(!t){this.tracer.next=this.tracer.node,this.tracer.countdown=1/0;return}this.tracer.next=t.node,this.tracer.countdown=t.cost}tracerSpeed(){if(this.matchElapsed<this.freezeUntil)return 0;let t=1;return this.alarmTriggered&&(t*=Hg),this.matchElapsed<this.spamSlowUntil&&(t*=Gg),t}tick(t){if(!(this.phase!=="RUN"&&this.phase!=="EXFIL")){if(this.matchElapsed+=t,this.phase==="RUN"&&this.capturing&&(this.capturing.elapsed+=t,this.capturing.elapsed>=this.capturing.total)){const e=this.capturing.node;if(this.capturing=null,this.claim(e,!1),this.over)return}if(this.phase==="EXFIL"&&this.moving&&(this.moving.elapsed+=t,this.moving.elapsed>=this.moving.total&&(this.playerAt=this.moving.to,this.moving=null,this.playerAt===this.board.entry))){this.phase="WON";return}if(this.tracer){const e=t*this.tracerSpeed();this.tracer.countdown-=e;let i=0;for(;this.tracer&&this.tracer.countdown<=0&&i++<this.board.nodes.length+2;){const s=this.tracer.next;if(this.tracer.node=s,s!==this.board.entry&&(this.owner[s]="SYS",this.captured.delete(s),this.fortified.delete(s)),s===this.board.entry){this.phase="LOST_CRIT";return}const r=this.tracer.countdown;this.planTracerHop(),this.tracer.countdown+=r}}}}tracerHopsToEntry(){if(!this.tracer)return this.board.nodes.length;if(this.tracer.node===this.board.entry)return 0;const t=this.board.nodes.length,e=new Array(t).fill(1/0),i=[this.tracer.node];for(e[this.tracer.node]=0;i.length;){const s=i.shift();for(const r of this.board.edges){const o=r.a===s?r.b:!r.oneWay&&r.b===s?r.a:-1;o>=0&&e[o]===1/0&&(e[o]=e[s]+1,i.push(o))}}return isFinite(e[this.board.entry])?e[this.board.entry]:t}result(){const t=this.tracerHopsToEntry()+this.loot;return{outcome:this.phase,margin:t,loot:this.loot,trips:this.trips}}}const Nl={scan:{fps:3,frames:[[[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[1,0,0,0,1,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]],[[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,1,0,0,0,0,1,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]],[[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,0,0,1,0,0,0,1],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]]]},suspicious:{fps:4,frames:[[[0,0,0,0,0,0,0,0],[0,1,0,0,0,0,0,1],[0,0,0,0,0,1,0,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]]]},awe:{fps:4,frames:[[[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,0,1,1,1,1,0,0],[0,0,1,0,0,1,0,0],[0,0,1,1,1,1,0,0]]]},glee:{fps:4,frames:[[[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[1,0,0,0,0,0,0,1],[0,1,0,0,0,0,1,0],[0,0,1,1,1,1,0,0]]]},love:{fps:4,frames:[[[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,1,0,1,1,0,1,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,0,0,0,0,1,0],[0,0,1,1,1,1,0,0]]]},sad:{fps:4,frames:[[[0,0,0,0,0,0,0,0],[0,0,1,0,0,1,0,0],[0,1,0,0,0,0,1,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,1,1,1,1,0,0],[0,1,0,0,0,0,1,0]]]},scared:{fps:4,frames:[[[0,0,1,0,0,1,0,0],[0,1,0,0,0,0,1,0],[0,1,1,0,0,1,1,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,1,1,0,0,0],[0,0,0,1,1,0,0,0]]]},angry:{fps:4,frames:[[[0,0,0,0,0,0,0,0],[1,0,0,0,0,0,0,1],[0,1,0,0,0,0,1,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,1,1,1,1,0,0],[0,0,0,0,0,0,0,0]]]},worried:{fps:4,frames:[[[0,0,0,0,0,0,0,0],[0,0,1,0,0,1,0,0],[0,1,0,0,0,0,1,0],[0,1,0,0,0,0,1,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,1,1,1,1,0,0],[0,0,0,0,0,0,0,0]]]}},Yg=[[1,8],[2,16],[4,32],[64,128]];function qg(n){const t=[];for(let e=0;e<2;e++){let i="";for(let s=0;s<4;s++){let r=0;for(let o=0;o<4;o++)for(let a=0;a<2;a++)n[e*4+o]?.[s*2+a]&&(r|=Yg[o][a]);i+=String.fromCodePoint(10240+r)}t.push(i)}return t.join(`
`)}function jg(n,t){const e=Nl[n]??Nl.scan,i=e.frames[Math.floor(t*e.fps)%e.frames.length]??e.frames[0];return qg(i)}const Fl=["SSH compromised — unauthorized root on bastion host","credentials obtained — admin hashes dumped from DC","npm package contaminated — malicious dep in build pipeline","DNS hijack — internal queries to attacker resolver","database exfiltrated — records copied to external IP","lateral movement — pivot from workstation to prod","backdoor established — persistent shell on critical asset","firewall rules modified — inbound restrictions lowered","ransomware detected — encryption in progress on shares","logs tampered with — security events wiped from SIEM","kerberos ticket forged — golden ticket minted","privilege escalated — service account now domain admin","cloud keys leaked — S3 buckets set world-readable","MFA bypassed — session token replayed from proxy","C2 beacon live — implant checking in every 30s"],Ol=["DevLog: npm audit flags high-severity vuln in transitive dep","DevLog: CI pipeline pulling from untrusted registry","DevLog: SSH key rotation overdue — legacy keys still active","DevLog: hardcoded secrets found in public repo","DevLog: container image signed by unknown publisher","DevLog: API keys exposed in client-side JavaScript","DevLog: anomalous traffic spike from dev environment","DevLog: failed logins from unusual geolocation","DevLog: dependency confusion attack suspected","DevLog: build artifacts modified post-compilation","DevLog: staging DB reachable from public subnet","DevLog: debug endpoint left enabled in prod","DevLog: TLS cert expired — clients falling back to plaintext","DevLog: verbose stack traces leaking to end users","DevLog: cron job running as root with world-writable script"],Kg=["TRACE INITIATED — diagnostic locking onto source","back-trace in progress — reconstructing entry vector","counter-intrusion daemon spawned at registry","connection fingerprint matched — narrowing origin","ICE deployed — crawling your captured nodes","log correlation complete — they know your entry point","signature broadcast upstream — origin resolving","kill-switch arming at the entry node","hop-by-hop trace closing on your address","session token flagged — tracer following it home","they are walking your path backward, node by node","upstream provider subpoenaed — 40% to source"];function Zg(n){let t=2166136261;for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return t>>>0}function Jg(n,t,e){return n[Zg(`${t}#${e}`)%n.length]}const ee={entry:[.42,.88,.72],registry:[1,.82,.4],store:[.92,.72,.36],alarm:[.9,.4,.36],spam:[.72,.52,1],dir:[.42,.46,.56],player:[.36,.92,.64],tracer:[1,.34,.3],white:[1,1,1],dim:[.16,.17,.22]},Bl=(n,t,e)=>[n[0]+(t[0]-n[0])*e,n[1]+(t[1]-n[1])*e,n[2]+(t[2]-n[2])*e],Qg=n=>n==="ENTRY"?ee.entry:n==="REGISTRY"?ee.registry:n==="STORE"?ee.store:n==="ALARM"?ee.alarm:n==="SPAM"?ee.spam:ee.dir;function t_(n,t){const e=new Hc({canvas:n,antialias:!0});e.setPixelRatio(Math.min(window.devicePixelRatio,2)),e.setClearColor(329226,1);const i=new Gc,s=1.12,r=new ps(-1,1,1,-1,.01,100);r.position.set(0,0,4),r.lookAt(0,0,0);const o=new th(4e3,{additive:!0});i.add(o.points);const a=new Zc(e);a.addPass(new Jc(i,r)),a.addPass(new ai(new Ft(1,1),.7,.6,.2)),a.addPass(new Qc);const l="ui-monospace,SFMono-Regular,Menlo,monospace",c=_=>{const R=document.createElement("div");return R.style.cssText=_,document.body.appendChild(R),R},h=c("position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)"),u=()=>{const _=getComputedStyle(h);return{t:parseFloat(_.paddingTop)||0,r:parseFloat(_.paddingRight)||0,b:parseFloat(_.paddingBottom)||0,l:parseFloat(_.paddingLeft)||0}},d=c(`position:fixed;left:50%;bottom:calc(58px + env(safe-area-inset-bottom));transform:translateX(-50%);max-width:min(92vw,680px);font:12px ${l};color:#9a9aa6;pointer-events:none;text-align:center;line-height:1.4`),m=c(`position:fixed;left:calc(12px + env(safe-area-inset-left));bottom:calc(12px + env(safe-area-inset-bottom));font:11px ${l};color:#6a6a76;pointer-events:none;line-height:1.5`),g=c(`position:fixed;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:rgba(5,6,10,.6);font:${l};text-align:center;pointer-events:none`),x=c("position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:10px;z-index:5"),p=_=>{const R=document.createElement("button");return R.textContent=_,R.style.cssText=`all:unset;cursor:pointer;font:11px ${l};letter-spacing:.08em;color:#b6b8c4;padding:7px 12px;border:1px solid #262735;border-radius:7px;background:rgba(14,15,22,.7);-webkit-tap-highlight-color:transparent`,x.appendChild(R),R},f=p("❄ FREEZE"),E=p("✚ NUKE"),T=document.createElement("div");T.style.cssText=`position:fixed;left:calc(12px + env(safe-area-inset-left));top:calc(12px + env(safe-area-inset-top));z-index:5;width:clamp(228px,50vw,340px);background:rgba(3,10,6,.82);border:1px solid #1c4a30;border-radius:5px;box-shadow:0 0 16px rgba(20,90,50,.24),inset 0 0 24px rgba(10,40,24,.4);font:11px/1.4 ${l};color:#5fd08a;overflow:hidden;pointer-events:none`,T.innerHTML='<div style="display:flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(20,60,36,.35);border-bottom:1px solid #17402a;color:#7fe0a4;letter-spacing:.1em;font-size:9.5px"><span style="color:#2f7a4c">●●●</span>&nbsp;trace.sh — root@breach</div><pre class="cx-face" style="margin:0;padding:12px 0 7px;text-align:center;font-size:27px;line-height:.9;letter-spacing:5px;text-shadow:0 0 11px currentColor;white-space:pre"></pre><div class="cx-log" style="padding:5px 10px 8px;font-size:9.5px;line-height:1.5;height:62px;overflow:hidden;border-top:1px solid #123420;color:#3f9d68"></div>',document.body.appendChild(T);const M=T.querySelector(".cx-face"),N=T.querySelector(".cx-log"),b={scan:"#5fd08a",suspicious:"#6fb8e0",awe:"#7fd0ff",glee:"#ffd166",love:"#ff9ec7",sad:"#7f9fd0",scared:"#e0705a",angry:"#ff6b5a",worried:"#c0a0e0"};let C="scan",L=0,y=[],v=0,P=!0,G=-1,V=0,J="",tt=0;const Q=(_,R)=>{C=_,L=performance.now()+R},W=_=>{y.push(_),y.length>4&&y.shift(),P=!0},$=_=>W(Jg(_,gt.seed,v++)),rt=()=>nt.phase==="WON"?"love":nt.phase==="LOST_CRIT"?"angry":nt.phase==="LOST_SOFT"?"sad":nt.tracer?"worried":nt.capturing?"suspicious":"scan";function vt(){C="scan",L=0,y=[],v=0,P=!0,G=-1,V=0,J=nt.phase,tt=0,W("uplink established — mapping the subnet"),$(Ol)}let gt,nt,Ht=null,et=!1,lt=[],pt=1;const ft=_=>lt[_]??gt.nodes[_].pos;function it(){if(!gt)return;const _=window.innerWidth,R=window.innerHeight,w=r.right-r.left,I=r.top-r.bottom,U=de=>r.left+de/_*w,Z=de=>r.top-de/R*I,B=u(),Y=U(14+B.l),ot=U(_-14-B.r),X=Z(52+B.t),st=Z(R-108-B.b),ut=T.getBoundingClientRect(),St=U(ut.right+12),dt=Z(ut.bottom+12),Ut=[{x0:Math.max(Y,St),x1:ot,y0:st,y1:X},{x0:Y,x1:ot,y0:st,y1:Math.min(X,dt)}];let Pt=1/0,Bt=-1/0,F=1/0,xt=-1/0;for(const de of gt.nodes)Pt=Math.min(Pt,de.pos[0]),Bt=Math.max(Bt,de.pos[0]),F=Math.min(F,de.pos[1]),xt=Math.max(xt,de.pos[1]);const O=Math.max(.001,Bt-Pt),K=Math.max(.001,xt-F),at=(Pt+Bt)/2,_t=(F+xt)/2,It=.09;let $t=null;for(const de of[...Ut,{x0:Y,x1:ot,y0:st,y1:X}]){const Xi=de.x1-de.x0-2*It,nn=de.y1-de.y0-2*It;if(Xi<=0||nn<=0)continue;const ci=Math.min(Xi/O,nn/K);(!$t||ci>$t.s)&&($t={s:ci,R:de})}if(!$t)return;pt=$t.s;const Jt=($t.R.x0+$t.R.x1)/2,qt=($t.R.y0+$t.R.y1)/2,Ie=Jt-pt*at,Ve=qt-pt*_t;lt=gt.nodes.map(de=>[Ie+pt*de.pos[0],Ve+pt*de.pos[1]]),window.__traceFit={scl:pt,P:lt,cam:[r.left,r.right,r.top,r.bottom]}}function ct(_,R){gt=Bg(_,R),nt=new $g(gt,t.skill),et=!1,g.style.display="none",vt(),it(),window.__trace=nt}ct(t.difficulty,t.seed);function ht(){const _=window.innerWidth,R=window.innerHeight;e.setSize(_,R),a.setSize(_,R);const w=_/R;r.top=s,r.bottom=-s,r.left=-s*w,r.right=s*w,r.updateProjectionMatrix(),it()}window.addEventListener("resize",ht),ht();const Tt=(_,R)=>{const w=n.getBoundingClientRect();return[((_-w.left)/w.width*2-1)*r.right,(-((R-w.top)/w.height)*2+1)*r.top]},yt=(_,R,w=.12)=>{let I=-1,U=w*w;for(const Z of gt.nodes){const B=ft(Z.id),Y=(B[0]-_)**2+(B[1]-R)**2;Y<U&&(U=Y,I=Z.id)}return I};n.addEventListener("pointermove",_=>Ht=Tt(_.clientX,_.clientY)),n.addEventListener("pointerup",_=>{const[R,w]=Tt(_.clientX,_.clientY),I=yt(R,w);I<0||(nt.phase==="EXFIL"?nt.retreat(I):et?nt.nuke(I)&&(et=!1):nt.beginCapture(I))}),f.addEventListener("click",()=>nt.freeze()),E.addEventListener("click",()=>et=nt.nukes>0&&!et);const Lt=(_,R,w,I,U,Z,B=1)=>{o.dot(_,R,w[0]*B,w[1]*B,w[2]*B,Z+1.5,1);for(let Y=0;Y<I;Y++){const ot=Y/I*Math.PI*2+Y*.7,X=U*(.4+.6*(Y*7%5)/5);o.dot(_+Math.cos(ot)*X,R+Math.sin(ot)*X,w[0]*B,w[1]*B,w[2]*B,Z,.95)}},D=(_,R,w,I,U,Z,B=1,Y=0)=>{for(let ot=0;ot<U;ot++){const X=ot/U*Math.PI*2+Y;o.dot(_+Math.cos(X)*w,R+Math.sin(X)*w,I[0]*B,I[1]*B,I[2]*B,Z,.9)}},Yt=(_,R,w,I,U=1)=>{for(const[Z,B]of[[0,1],[1,0],[0,-1],[-1,0]])o.dot(_+Z*w,R+B*w,I[0]*U,I[1]*U,I[2]*U,3.2,.95)},Ot=(_,R,w,I,U=1)=>{for(let Z=-2;Z<=2;Z++)o.dot(_+Z*w*.5,R+Z*w*.5,I[0]*U,I[1]*U,I[2]*U,2.6,.9),o.dot(_+Z*w*.5,R-Z*w*.5,I[0]*U,I[1]*U,I[2]*U,2.6,.9)},zt=(_,R,w,I,U,Z)=>{const B=Math.hypot(R[0]-_[0],R[1]-_[1]),Y=Math.max(4,Math.round(B/.045));for(let ot=1;ot<Y;ot++){const X=ot/Y;let st=I;if(U){const ut=Z*.25%1,St=Math.abs(X-ut);st=I*(.5+.9*Math.exp(-(St*St)/.02))}o.dot(_[0]+(R[0]-_[0])*X,_[1]+(R[1]-_[1])*X,w[0]*st,w[1]*st,w[2]*st,2.1,.8)}};function bt(){const _=nt.result(),R=nt.phase==="WON",w=R?"◆ EXTRACTED":nt.phase==="LOST_CRIT"?"⚠ TRACED":"✕ JACKED OUT",I=R?"#8fd0b6":nt.phase==="LOST_CRIT"?"#d0605a":"#e0b070";g.innerHTML=`<div style="font-size:22px;letter-spacing:.2em;color:${I}">${w}</div><div style="font-size:12px;color:#9a9aa6">loot ${_.loot} · ${_.trips} detection(s) · margin ${_.margin}</div><div style="font-size:11px;color:#55555f;margin-top:8px">press R or tap ⟳ to run again</div>`,g.style.display="flex"}let Wt=performance.now(),At=0;function A(){const _=performance.now(),R=_/1e3,w=Math.min(.05,(_-Wt)/1e3);Wt=_,nt.tick(w);{const B=nt.capturing?nt.capturing.node:-1,Y=nt.trips>V;if(G===-1&&B>=0&&(Q("suspicious",900),$(Ol)),G>=0&&B===-1&&nt.owner[G]==="P"){const ot=gt.nodes[G];ot.type==="STORE"&&nt.loot>tt?(Q("awe",1200),$(Fl)):ot.type!=="REGISTRY"&&!Y&&(ls(ot.rating,nt.captureLevel)>=.4&&Q("awe",1500),$(Fl))}Y&&nt.phase!=="EXFIL"&&nt.phase!=="WON"&&(Q("scared",1500),$(Kg)),nt.phase==="EXFIL"&&J!=="EXFIL"&&(Q("glee",1400),W("SITREP: database exfiltrated — trace inbound, run home")),nt.phase==="WON"&&J!=="WON"?(Q("glee",2600),W("◆ EXTRACTION COMPLETE — gone before the trace closed")):nt.phase==="LOST_CRIT"&&J!=="LOST_CRIT"?(Q("angry",3e3),W("⚠ TRACED — they walked it back to your door")):nt.phase==="LOST_SOFT"&&J!=="LOST_SOFT"&&(Q("sad",3e3),W("✕ JACKED OUT — connection dropped, run aborted")),_>L&&(C=rt()),G=B,V=nt.trips,J=nt.phase,tt=nt.loot,M.textContent=jg(C,R),M.style.color=b[C]??"#5fd08a",P&&(N.innerHTML=y.map((ot,X)=>{const st=X===y.length-1,ut=(.45+.55*((X+1)/y.length)).toFixed(2);return`<div style="color:${st?"#7fe0a4":"#3f9d68"};opacity:${ut}">› ${ot}</div>`}).join(""),P=!1)}const I=Ht?yt(Ht[0],Ht[1]):-1,U=new Set(nt.phase==="EXFIL"?nt.retreatable():nt.capturable());o.begin();for(const B of gt.edges){const Y=ft(B.a),ot=ft(B.b),X=nt.owner[B.a]==="P"&&nt.owner[B.b]==="P";zt(Y,ot,X?ee.player:ee.dim,X?.5:.32,B.oneWay,R)}for(const B of gt.nodes){const Y=ft(B.id),ot=nt.owner[B.id]==="P",X=Qg(B.type),st=nt.tracer&&nt.tracer.node===B.id;let ut=ot?ee.player:Bl(X,ee.dim,.35);st&&(ut=ee.tracer);const St=U.has(B.id),dt=I===B.id&&St,Ut=St?.85+.15*Math.sin(_/220):1,Pt=(ot?1.15:B.type==="REGISTRY"||B.type==="ENTRY"?1:.7)*Ut*(dt?1.5:1),Bt=(.02+.006*B.rating)*pt;Lt(Y[0],Y[1],dt?Bl(ut,ee.white,.4):ut,3+B.rating*2,Bt,3+B.rating*.5,Pt),B.type==="REGISTRY"?D(Y[0],Y[1],.055*pt,ee.registry,12,2.4,1,_/600):B.type==="ENTRY"?D(Y[0],Y[1],.05*pt,ee.entry,10,2.2,1):B.type==="STORE"?Yt(Y[0],Y[1],.05*pt,ee.store,ot?.6:1):B.type==="ALARM"?Ot(Y[0],Y[1],.05*pt,ee.alarm):B.type==="SPAM"&&D(Y[0],Y[1],.04*pt,ee.spam,6,2.2,1,_/300),nt.fortified.has(B.id)&&D(Y[0],Y[1],.07*pt,ee.player,8,2,.7)}if(nt.capturing){const B=ft(nt.capturing.node),Y=nt.capturing.elapsed/nt.capturing.total,ot=Math.round(16*Y);for(let X=0;X<ot;X++){const st=-Math.PI/2+X/16*Math.PI*2;o.dot(B[0]+Math.cos(st)*.065*pt,B[1]+Math.sin(st)*.065*pt,ee.player[0],ee.player[1],ee.player[2],3,.95)}}if(nt.tracer){const B=ft(nt.tracer.node),Y=ft(nt.tracer.next),ot=1-Math.max(0,Math.min(1,nt.tracer.countdown/(gt.params.tracerBase||1))),X=B[0]+(Y[0]-B[0])*ot,st=B[1]+(Y[1]-B[1])*ot,ut=.7+.3*Math.sin(_/90);o.dot(X,st,ee.tracer[0]*ut,ee.tracer[1]*ut,ee.tracer[2]*ut,9),D(Y[0],Y[1],(.05*(1-ot)+.02)*pt,ee.tracer,10,2.2,ut)}if(nt.phase==="EXFIL"){const B=ft(nt.playerAt);let Y=B[0],ot=B[1];if(nt.moving){const st=ft(nt.moving.to),ut=nt.moving.elapsed/nt.moving.total;Y+=(st[0]-Y)*ut,ot+=(st[1]-ot)*ut}const X=.8+.2*Math.sin(_/120);o.dot(Y,ot,ee.white[0]*X,ee.white[1]*X,ee.white[2]*X,10),D(Y,ot,.03*pt,ee.player,8,2.4,X)}o.commit(e.getPixelRatio()),a.render();const Z=I>=0&&U.has(I)&&nt.phase!=="EXFIL"?Math.round(ls(gt.nodes[I].rating,nt.captureLevel)*100):-1;f.style.opacity=nt.freezes>0&&nt.tracer?"1":"0.4",E.style.opacity=nt.nukes>0?"1":"0.4",E.style.borderColor=et?"#6fe0b8":"#262735",f.textContent=`❄ FREEZE ${nt.freezes}`,E.textContent=`✚ NUKE ${nt.nukes}`,nt.phase==="PLAN"||nt.phase==="RUN"?d.textContent=et?"NUKE armed — click a node to capture it silently":"capture toward a REGISTRY ◇ · risk rises with rating · avoid the ✕ alarms":nt.phase==="EXFIL"&&(d.textContent="REGISTRY TAKEN — retreat to your ENTRY ◎ before the tracer traces you home"),d.style.opacity=nt.over?"0":"1",m.innerHTML=`LVL ${gt.difficulty}/5 · ${gt.seed}<br>loot ${nt.loot} · tracer ${nt.tracer?`${nt.tracerHopsToEntry()} hops out`:"dormant"}`+(Z>=0?`<br><span style="color:#e0b070">detect ${Z}%</span>`:""),x.style.display=nt.over?"none":"flex",nt.over&&g.style.display==="none"&&bt(),At=requestAnimationFrame(A)}return A(),{regenerate:(_,R)=>ct(_,R),outcome:()=>nt.phase==="WON"?"won":nt.over?"lost":"pending",dispose(){cancelAnimationFrame(At),window.removeEventListener("resize",ht),o.dispose(),a.dispose(),[d,m,g,x,T,h].forEach(_=>_.remove()),e.dispose()}}}const $r=(n,t)=>{const e=Math.sin(n*12.9898+t*78.233)*43758.5453;return e-Math.floor(e)},e_=(n,t)=>Math.atan2(Math.sin(n-t),Math.cos(n-t)),kl=(n,t)=>[n[0]-t[0],n[1]-t[1],n[2]-t[2]],n_=(n,t)=>[n[1]*t[2]-n[2]*t[1],n[2]*t[0]-n[0]*t[2],n[0]*t[1]-n[1]*t[0]],eh=(n,t)=>n[0]*t[0]+n[1]*t[1]+n[2]*t[2],nh=n=>{const t=Math.hypot(n[0],n[1],n[2])||1e-6;return[n[0]/t,n[1]/t,n[2]/t]};function i_(n,t){return t.map(e=>{let i=nh(n_(kl(n[e[1]],n[e[0]]),kl(n[e[2]],n[e[0]]))),s=eh(i,n[e[0]]);return s<0&&(i=[-i[0],-i[1],-i[2]],s=-s),{n:i,d:s}})}const s_=n=>t=>{const e=nh(t);let i=1/0;for(const s of n){const r=eh(e,s.n);if(r>1e-6){const o=s.d/r;o<i&&(i=o)}}return[e[0]*i,e[1]*i,e[2]*i]};function r_(n,t,e){const i=[],s=n[t[0]];for(let r=1;r<t.length-1;r++){const o=n[t[r]],a=n[t[r+1]];for(let l=0;l<=e;l++)for(let c=0;c<=e-l;c++){const h=l/e,u=c/e,d=1-h-u;i.push([s[0]*d+o[0]*h+a[0]*u,s[1]*d+o[1]*h+a[1]*u,s[2]*d+o[2]*h+a[2]*u])}}return i}function o_(n){const t=[],e=[];for(let i=0;i<n;i++)e.push(-1+2*i/(n-1));for(const i of[-1,1])for(const s of e)for(const r of e)t.push([i,s,r]),t.push([s,i,r]),t.push([s,r,i]);return t}const a_=n=>{const t=Math.max(Math.abs(n[0]),Math.abs(n[1]),Math.abs(n[2]))||1e-6;return[n[0]/t,n[1]/t,n[2]/t]},ih=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],sh=[[0,2,4],[0,2,5],[0,3,4],[0,3,5],[1,2,4],[1,2,5],[1,3,4],[1,3,5]],l_=s_(i_(ih,sh)),c_=o_(4),h_=sh.flatMap(n=>r_(ih,n,4));function u_(n,t,e,i){const s=2*t*e+i,r=n%s,o=new Array(t).fill(0);let a=-1;if(r<2*t*e){const l=Math.floor(r/e),c=(r-l*e)/e,h=1-(1-Math.min(1,c/.7))**3;if(l<t){for(let u=0;u<l;u++)o[u]=1;o[l]=h,a=l}else{const u=2*t-1-l;for(let d=0;d<u;d++)o[d]=1;o[u]=1-h,a=u}}return{amount:o,active:a}}function d_(n){const t=[-1,-.3333333333333333,.3333333333333333],e=[];for(let i=0;i<n;i++){const s=Math.min(2,Math.floor($r(i,2.3)*3)),r=t[Math.min(2,Math.floor($r(i,5.9)*3))],o=$r(i,7.7)<.5?1:-1;e.push({axis:s,lo:r,hi:r+2/3+1e-4,ang:o*Math.PI/2})}return e}const zl=d_(12);function f_(n,t){let[e,i,s]=n,r=!1;for(let o=0;o<zl.length;o++){if(t.amount[o]<=0)continue;const a=zl[o],l=a.axis===0?e:a.axis===1?i:s;if(l<a.lo||l>=a.hi)continue;o===t.active&&(r=!0);const c=a.ang*t.amount[o],h=Math.cos(c),u=Math.sin(c);if(a.axis===0){const d=i*h-s*u;s=i*u+s*h,i=d}else if(a.axis===1){const d=e*h+s*u;s=-e*u+s*h,e=d}else{const d=e*h-i*u;i=e*u+i*h,e=d}}return[e,i,s,r]}const rh=(n,t)=>{const e=Math.sin(t),i=Math.cos(t),s=Math.sin(n),r=Math.cos(n);return(o,a,l)=>{const c=o*r+l*s,h=-o*s+l*r,u=a*i-h*e,d=a*e+h*i;return[c,u,d]}},oh=n=>n==="cube"?1:1.7,p_=n=>n==="cube"?a_:l_;function m_(n,t){const e=p_(n),i=oh(n),s=.5,r=t*s,o=rh(r,.4+.06*Math.sin(t*.35)),a=t*(s+(1.7-s)*4.08),l=10,c=18,h=[];for(let u=0;u<=l;u++){const d=-Math.PI/2+u/l*Math.PI,m=Math.cos(d),g=Math.sin(d),x=Math.max(1,Math.round(Math.abs(m)*c));for(let p=0;p<x;p++){const f=p/x*2*Math.PI,E=e([m*Math.cos(f),g,m*Math.sin(f)]),[T,M,N]=o(E[0],E[1],E[2]),b=e_(f+r,a),C=Math.exp(-(b*b)/.18)*Math.max(0,N);h.push({x:T*i,y:M*i,depth:(N+1)/2,scan:Math.min(1,C)})}}return h}function g_(n,t){const e=n==="cube"?c_:h_,i=oh(n),s=rh(t*.5,.5+.1*Math.sin(t*.9)),r=u_(t,12,.42,1.2),o=[];for(const a of e){const[l,c,h,u]=f_(a,r),[d,m,g]=s(l,c,h);o.push({x:d*i,y:m*i,depth:(g+1)/2,scan:u?1:0})}return o}const Qe=(n,t)=>{const e=Math.sin(n*12.9898+t*78.233)*43758.5453;return e-Math.floor(e)},__=(n,t)=>Math.atan2(Math.sin(n-t),Math.cos(n-t)),x_=n=>n-Math.floor(n),Yr=(n,t,e)=>n+(t-n)*e,Hl=(n,t)=>[n[0]-t[0],n[1]-t[1],n[2]-t[2]],v_=(n,t)=>[n[1]*t[2]-n[2]*t[1],n[2]*t[0]-n[0]*t[2],n[0]*t[1]-n[1]*t[0]],ah=(n,t)=>n[0]*t[0]+n[1]*t[1]+n[2]*t[2],fr=n=>{const t=Math.hypot(n[0],n[1],n[2])||1e-6;return[n[0]/t,n[1]/t,n[2]/t]},lh=(n,t)=>{const e=Math.PI*(3-Math.sqrt(5)),i=1-2*(n+.5)/t,s=Math.sqrt(Math.max(0,1-i*i)),r=n*e;return[s*Math.cos(r),i,s*Math.sin(r)]};function qr(n,t){const e=Math.floor(n),i=Math.floor(t);let s=n-e,r=t-i;s=s*s*(3-2*s),r=r*r*(3-2*r);const o=Qe(e,i),a=Qe(e+1,i),l=Qe(e,i+1),c=Qe(e+1,i+1);return o+(a-o)*s+(l-o)*r+(o-a-l+c)*s*r}const ms=(n,t)=>{const e=Math.sin(t),i=Math.cos(t),s=Math.sin(n),r=Math.cos(n);return(o,a,l)=>{const c=o*r+l*s,h=-o*s+l*r,u=a*i-h*e,d=a*e+h*i;return[c,u,d]}};function ch(n,t){return t.map(e=>{let i=fr(v_(Hl(n[e[1]],n[e[0]]),Hl(n[e[2]],n[e[0]]))),s=ah(i,n[e[0]]);return s<0&&(i=[-i[0],-i[1],-i[2]],s=-s),{n:i,d:s}})}const hh=n=>t=>{const e=fr(t);let i=1/0;for(const s of n){const r=ah(e,s.n);if(r>1e-6){const o=s.d/r;o<i&&(i=o)}}return[e[0]*i,e[1]*i,e[2]*i]};function M_(n,t,e){const i=[],s=n[t[0]];for(let r=1;r<t.length-1;r++){const o=n[t[r]],a=n[t[r+1]];for(let l=0;l<=e;l++)for(let c=0;c<=e-l;c++){const h=l/e,u=c/e,d=1-h-u;i.push([s[0]*d+o[0]*h+a[0]*u,s[1]*d+o[1]*h+a[1]*u,s[2]*d+o[2]*h+a[2]*u])}}return i}const y_=n=>{const t=[0,0,0];for(const e of n)t[0]+=e[0],t[1]+=e[1],t[2]+=e[2];return t[0]/=n.length,t[1]/=n.length,t[2]/=n.length,n.map(e=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]])},uh=n=>{let t=1e-6;for(const e of n)t=Math.max(t,Math.hypot(e[0],e[1],e[2]));return n.map(e=>[e[0]/t,e[1]/t,e[2]/t])};function S_(n,t,e,i){const s=2*t*e+i,r=n%s,o=new Array(t).fill(0);let a=-1;if(r<2*t*e){const l=Math.floor(r/e),c=(r-l*e)/e,h=1-(1-Math.min(1,c/.7))**3;if(l<t){for(let u=0;u<l;u++)o[u]=1;o[l]=h,a=l}else{const u=2*t-1-l;for(let d=0;d<u;d++)o[d]=1;o[u]=1-h,a=u}}return{amount:o,active:a}}const Gl=(()=>{const n=[-1,-.3333333333333333,.3333333333333333],t=[];for(let e=0;e<12;e++){const i=Math.min(2,Math.floor(Qe(e,2.3)*3)),s=n[Math.min(2,Math.floor(Qe(e,5.9)*3))],r=Qe(e,7.7)<.5?1:-1;t.push({axis:i,lo:s,hi:s+2/3+1e-4,ang:r*Math.PI/2})}return t})();function E_(n,t){let[e,i,s]=n,r=!1;for(let o=0;o<Gl.length;o++){if(t.amount[o]<=0)continue;const a=Gl[o],l=a.axis===0?e:a.axis===1?i:s;if(l<a.lo||l>=a.hi)continue;o===t.active&&(r=!0);const c=a.ang*t.amount[o],h=Math.cos(c),u=Math.sin(c);if(a.axis===0){const d=i*h-s*u;s=i*u+s*h,i=d}else if(a.axis===1){const d=e*h+s*u;s=-e*u+s*h,e=d}else{const d=e*h-i*u;i=e*u+i*h,e=d}}return[e,i,s,r]}const dh=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],fh=[[0,2,4],[0,2,5],[0,3,4],[0,3,5],[1,2,4],[1,2,5],[1,3,4],[1,3,5]],T_=hh(ch(dh,fh)),b_=fh.flatMap(n=>M_(dh,n,4)),A_=y_([[0,1,0],[.85,-.7,.85],[-.85,-.7,.85],[-.85,-.7,-.85],[.85,-.7,-.85]]),w_=[[1,2,3,4],[0,1,2],[0,2,3],[0,3,4],[0,4,1]],R_=hh(ch(A_,w_)),C_=1,Vl=.42,ph=(n,t)=>{const e=C_+Vl*Math.cos(t);return[e*Math.cos(n),e*Math.sin(n),Vl*Math.sin(t)]},P_=n=>{const t=fr(n),e=Math.atan2(t[1],t[0]),i=Math.asin(Math.max(-1,Math.min(1,t[2])));return ph(e,i*2)},L_=(()=>{const n=[];for(let t=0;t<30;t++){const e=t/30*2*Math.PI;for(let i=0;i<10;i++)n.push(ph(e,i/10*2*Math.PI))}return n})(),D_=(()=>{const n=[];for(let i=0;i<20;i++){const s=i/19,r=s*Math.PI,o=Math.cos(r),a=.95*Math.sin(r)*Math.pow(s,.6);for(let l=0;l<12;l++){const c=l/12*2*Math.PI;n.push([a*Math.cos(c),o,a*Math.sin(c)])}}return uh(n)})(),jr=(n,t,e)=>{const i=n,s=e,r=t,o=i*i+2.25*s*s+r*r-1;return o*o*o-i*i*r*r*r-.1125*s*s*r*r*r},mh=n=>{const t=fr(n);let e=.1,i=jr(t[0]*e,t[1]*e,t[2]*e),s=0;for(;i<0&&e<5&&s<50;)e*=1.35,i=jr(t[0]*e,t[1]*e,t[2]*e),s++;let r=0,o=e;for(let l=0;l<20;l++){const c=(r+o)*.5;jr(t[0]*c,t[1]*c,t[2]*c)<0?r=c:o=c}const a=(r+o)*.5;return[t[0]*a,t[1]*a,t[2]*a]},I_=uh(Array.from({length:200},(n,t)=>mh(lh(t,200)))),U_={octa:{warp:T_,pts:b_,Rf:1.6},pyramid:{warp:R_,pts:[],Rf:1.3},torus:{warp:P_,pts:L_,Rf:1.25},teardrop:{pts:D_,Rf:1.5},heart:{warp:mh,pts:I_,Rf:1.55}};function N_(n,t){const e=n.warp,i=.5,s=t*i,r=ms(s,.4+.06*Math.sin(t*.35)),o=t*(i+(1.7-i)*4.08),a=[],l=12,c=26;for(let h=0;h<=l;h++){const u=-Math.PI/2+h/l*Math.PI,d=Math.cos(u),m=Math.sin(u),g=Math.max(1,Math.round(Math.abs(d)*c));for(let x=0;x<g;x++){const p=x/g*2*Math.PI,f=e([d*Math.cos(p),m,d*Math.sin(p)]),[E,T,M]=r(f[0],f[1],f[2]),N=__(p+s,o),b=Math.exp(-(N*N)/.18)*Math.max(0,M);a.push({x:E*n.Rf,y:T*n.Rf,depth:(M+1)/2,scan:Math.min(1,b),a:.5+.5*Math.min(1,b)})}}return a}function F_(n,t){const e=ms(t*.5,.5+.1*Math.sin(t*.9)),i=S_(t,12,.42,1.2),s=[];for(const r of n.pts){const[o,a,l,c]=E_(r,i),[h,u,d]=e(o,a,l);s.push({x:h*n.Rf,y:u*n.Rf,depth:(d+1)/2,scan:c?1:0,a:1})}return s}function O_(n,t){const e=n.warp,i=ms(t*.12,.35),s=22,r=[];for(let a=0;a<s;a++){const l=lh(a,s);r.push(e([l[0]+.25*(qr(a*.31+9,t*.24)-.5)*2,l[1]+.25*(qr(a*.53+27,t*.21)-.5)*2,l[2]+.25*(qr(a*.77+55,t*.27)-.5)*2]))}const o=[];for(let a=0;a<s;a++){const[l,c,h]=i(r[a][0],r[a][1],r[a][2]),u=.6+.4*(.5+.5*Math.sin(t*1.4+a*2.7));o.push({x:l*n.Rf,y:c*n.Rf,depth:(h+1)/2,scan:u,a:.85})}for(let a=0;a<5;a++){const l=Math.floor(t*.55+a*7.31),c=Math.floor(Qe(l,a*3.1+1.7)*s),h=Math.floor(Qe(l,a*5.7+4.2)*s);if(c===h)continue;const u=x_(t*.55+a*7.31),d=e([Yr(r[c][0],r[h][0],u),Yr(r[c][1],r[h][1],u),Yr(r[c][2],r[h][2],u)]),[m,g,x]=i(d[0],d[1],d[2]);o.push({x:m*n.Rf,y:g*n.Rf,depth:(x+1)/2,scan:1,a:.9})}return o}function B_(n,t){const e=n.warp,i=ms(t*.18,.32),s=1,r=0,o=0,a=.55,l=0,c=Math.cos(a),h=Math.sin(a),u=r*h-o*c,d=o*l-s*h,m=s*c-r*l,g=9,x=34,p=[];for(let f=0;f<g;f++){const E=(f-(g-1)/2)*.075,T=Math.abs(f-(g-1)/2)/Math.max(1,(g-1)/2);for(let M=0;M<x;M++){const N=M/x*2*Math.PI,b=.16*Math.sin(N*3-t*1.7+f*.22)+.07*Math.sin(N*5+t*1.1),C=E+b,L=e([s*Math.cos(N)+l*Math.sin(N)+u*C,r*Math.cos(N)+c*Math.sin(N)+d*C,o*Math.cos(N)+h*Math.sin(N)+m*C]),[y,v,P]=i(L[0],L[1],L[2]);p.push({x:y*n.Rf,y:v*n.Rf,depth:(P+1)/2,scan:(1-T)*.5,a:.4+.6*((P+1)/2)})}}return p}function pr(n,t,e,i){const s=ms(t*.3,.42),r=[];return n.pts.forEach((o,a)=>{const l=e(o,a),[c,h,u]=s(l[0],l[1],l[2]);r.push({x:c*n.Rf,y:h*n.Rf,depth:(u+1)/2,scan:i(a),a:1})}),r}const k_=(n,t)=>pr(n,t,e=>{const i=1+.14*Math.sin(3*Math.atan2(e[2],e[0])+t*3-e[1]*2);return[e[0]*i,e[1],e[2]*i]},()=>.15),z_=(n,t)=>pr(n,t,(e,i)=>{const s=Qe(i,1.3)*6.283;return[e[0]+.07*Math.sin(t*2+s),e[1]+.07*Math.cos(t*1.7+s),e[2]+.07*Math.sin(t*2.3+s)]},()=>.1),H_=(n,t)=>{const e=1+.24*Math.sin(t*3),i=1/Math.sqrt(e);return pr(n,t,s=>[s[0]*i,s[1]*e,s[2]*i],()=>.15)},G_=(n,t)=>pr(n,t,e=>e,e=>.5+.5*Math.sin(t*4+Qe(e,2.1)*6.283)),V_={searching:N_,solving:F_,connecting:O_,composing:B_,wave:k_,orbit:z_,jelly:H_,twinkle:G_};function Wl(n,t,e){return V_[n](U_[t],e)}const Xl=[{key:"amber-octa",label:"Amber Octahedron",shape:"octa",terminal:"searching",node:"solving",color:[1,.72,.26],dim:[.28,.2,.08]},{key:"purple-pyramid",label:"Purple Pyramid",shape:"pyramid",terminal:"searching",node:"connecting",color:[.7,.5,1],dim:[.18,.14,.28]},{key:"turquoise-torus",label:"Turquoise Torus",shape:"torus",terminal:"searching",node:"composing",color:[.3,.86,.82],dim:[.12,.24,.24]},{key:"darkred-teardrop",label:"Dark Red Teardrop",shape:"teardrop",terminal:"wave",node:"orbit",color:[.86,.32,.3],dim:[.26,.11,.11]},{key:"pink-heart",label:"Pink Heart",shape:"heart",terminal:"jelly",node:"twinkle",color:[1,.5,.72],dim:[.3,.14,.22]}],$l=n=>{let t=2166136261;for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return Xl[(t>>>0)%Xl.length]},tr=12,Yo=7,W_=6,Yl=4,X_=16;function $_(n){return n<=2?"naive":n<=5?"greedy":n<=7?"greedy+":"optimal-ish"}const Y_=n=>n<=2?2:n<=4?1:0;function q_(n){const t=$_(n.defender),e=t==="optimal-ish"?1:0;return{tMatch:X_,pPulses:Yl+n.attacker+e,ePulses:Math.max(2,Yl+n.defender-Y_(n.defender)),traps:Math.min(6,1+Math.round(n.defender*.6)),repeats:n.defender>=6?2:n.defender>=3?1:0,ai:t}}const Di=[{attacker:5,defender:2},{attacker:5,defender:3},{attacker:4,defender:4},{attacker:4,defender:6},{attacker:3,defender:7},{attacker:2,defender:8},{attacker:2,defender:9}];function ha(n){let t=0;for(const e of n.outcomes)e.kind==="CLAIM"?t+=1:e.kind==="REPEAT"||e.kind==="LOCK"?t+=2:e.kind==="INVERT"||e.kind==="CONVERT"?t+=.5:e.kind==="FLIP"&&(t-=1);return t}function qe(n){return n.terminals.reduce((t,e)=>t+ha(e),0)}function Kr(n){const t=new Set;for(const e of n.terminals)for(const i of e.outcomes)i.kind!=="DEAD"&&i.kind!=="SHORT"&&t.add(i.cell);return t}const rr=(n,t)=>t==="left"?n.left:n.right;function ql(n,t,e,i,s,r,o){const a=new Array(tr).fill("NEUTRAL"),l=[];let c=0;const h=(x,p,f,E)=>{const T=p.filter(M=>M.t>=0&&M.t<=o).sort((M,N)=>M.t-N.t).slice(0,f);for(const M of T){const N=x.terminals[M.terminal];if(N)for(const b of N.outcomes){if(b.kind==="DEAD")continue;const C=M.t+b.delay;if(b.kind==="REPEAT"){const L=b.repeatPeriod??2;for(let y=C;y<=o;y+=L)l.push({time:y,seq:c++,cell:b.cell,kind:"CLAIM",owner:E})}else l.push({time:C,seq:c++,cell:b.cell,kind:b.kind,owner:E})}}};h(n,e,s,"P"),h(t,i,r,"E"),l.sort((x,p)=>x.time-p.time||x.seq-p.seq);const u=new Set;for(const x of l){if(x.kind==="DEAD"||x.kind==="SHORT"||u.has(x.cell))continue;const p=x.owner,f=p==="P"?"E":"P",E=a[x.cell];x.kind==="CLAIM"?a[x.cell]=p:x.kind==="LOCK"?(a[x.cell]=p,u.add(x.cell)):x.kind==="FLIP"?a[x.cell]=f:x.kind==="CONVERT"?a[x.cell]=E===f?"NEUTRAL":p:x.kind==="INVERT"&&(a[x.cell]=E==="NEUTRAL"?p:E==="P"?"E":"P")}let d=0,m=0,g=0;for(const x of a)x==="P"?d++:x==="E"?m++:g++;return{p:d,e:m,neutral:g,owners:a}}const jl=n=>n.outcomes.filter(t=>t.kind!=="DEAD"&&t.kind!=="SHORT").map(t=>t.cell),j_=n=>Math.max(0,...n.outcomes.map(t=>t.delay));function gh(n,t){const e=[],i=new Set;for(;e.length<t;){let s=-1,r=-1;if(n.terminals.forEach((o,a)=>{if(e.includes(a))return;const l=jl(o).filter(c=>!i.has(c)).length+ha(o)*.01;l>r&&(r=l,s=a)}),s<0)break;e.push(s);for(const o of jl(n.terminals[s]))i.add(o)}return e}function K_(n,t,e){return gh(n,t).map(i=>({t:Math.max(0,e-j_(n.terminals[i])-.05),terminal:i}))}function Z_(n,t,e){return gh(n,t).map((i,s)=>({t:s*.03,terminal:i}))}function _h(n,t,e,i,s){const r=t.terminals.map((h,u)=>({i:u,v:ha(h),repeat:h.outcomes.some(d=>d.kind==="REPEAT")})).filter(h=>h.v>0);if(r.sort((h,u)=>u.v-h.v),r.length===0)return[];if(n==="naive"){const h=r.slice().sort(()=>s()-.5).slice(0,e),u=.25,d=.75;return h.map((m,g)=>({t:(u+(g+.5)/Math.max(1,h.length)*(d-u))*i,terminal:m.i}))}if(n==="greedy"){const h=r.slice(0,e);return h.map((u,d)=>({t:d/Math.max(1,h.length)*i*.7,terminal:u.i}))}const o=n==="optimal-ish"?r.slice().sort((h,u)=>Number(u.repeat)-Number(h.repeat)||u.v-h.v):r,a=Math.min(2,e),l=o.slice(0,Math.max(0,e-a)),c=l.map((h,u)=>({t:u/Math.max(1,l.length)*i*.6,terminal:h.i}));for(let h=0;h<a;h++)c.push({t:i*(.85+.03*h),terminal:o[h%o.length].i});return c}const He={splitChance:.35,reachMin:9,valueMin:8,ratioLo:.75,ratioHi:.95,maxBoardAttempts:60};function J_(n,t){const e=t.slice();for(let i=e.length-1;i>0;i--){const s=Math.floor(n()*(i+1));[e[i],e[s]]=[e[s],e[i]]}return e}const qn=n=>ni(n,.6,1.4);function Kl(n,t,e="legacy"){const i=J_(n,Array.from({length:12},(a,l)=>l)),s=[];for(let a=0;a<8;a++){const l=[{cell:i[a],delay:qn(n),kind:"CLAIM"}];s.push({id:a,outcomes:l})}s[0].outcomes.push({cell:i[8],delay:qn(n),kind:"CLAIM"}),s[1].outcomes.push({cell:i[9],delay:qn(n),kind:"CLAIM"});for(let a=2;a<8;a++)if(n()<He.splitChance){const l=i[(a+5)%12];s[a].outcomes.some(c=>c.cell===l)||s[a].outcomes.push({cell:l,delay:qn(n),kind:"CLAIM"})}for(let a=0;a<t.repeats;a++){const c=s[a%4].outcomes.find(h=>h.kind==="CLAIM");c&&(c.kind="REPEAT",c.repeatPeriod=ni(n,1.8,2.6))}let r=t.traps;for(const a of[7,6,5])for(let l=0;l<2&&r>0;l++){const c=n()<.5?"DEAD":"INVERT";s[a].outcomes.push({cell:i[(a+l+3)%12],delay:qn(n),kind:c}),r--}let o;if(e==="full"){const a=s[0].outcomes.find(p=>p.kind==="CLAIM");a&&(a.kind="LOCK");const c=s[7].outcomes.find(p=>p.kind==="DEAD"||p.kind==="INVERT");c&&(c.kind="FLIP");const u=s[6].outcomes.find(p=>p.kind==="DEAD");u&&(u.kind="SHORT");const d=s[5],m=i[12%12];if(!d.outcomes.some(p=>p.cell===m))d.outcomes.push({cell:m,delay:qn(n),kind:"CONVERT"});else{const p=i[3];d.outcomes.some(f=>f.cell===p)||d.outcomes.push({cell:p,delay:qn(n),kind:"CONVERT"})}const g=s[1].outcomes.find((p,f)=>f>0&&p.kind==="CLAIM"),x=s[2].outcomes.find(p=>p.kind==="CLAIM");g&&x&&(g.cell=x.cell,o=[1,2]);for(const p of s)for(const f of p.outcomes)f.kind==="INVERT"&&(f.kind="CONVERT")}return{layer:{terminals:s},joinerPair:o}}const Q_=n=>n.terminals.find(t=>t.outcomes.some(e=>e.kind==="CLAIM")),tx=n=>{for(const t of n.terminals)for(const e of t.outcomes)if(e.kind==="DEAD")return e};function ex(n,t){for(let e=0;e<30;e++){const i=qe(t)/qe(n);if(i>He.ratioHi){const r=Q_(t)?.outcomes.find(o=>o.kind==="CLAIM");if(r)r.kind="DEAD";else break}else if(i<He.ratioLo){const s=tx(t);if(s)s.kind="CLAIM";else break}else return}}function nx(n,t,e={}){const i=q_(n),s=e.elements??"legacy",r=Rn(`${t}:transfer:${n.attacker}:${n.defender}`),o=n.defender>=3;for(let a=1;a<=He.maxBoardAttempts;a++){const l=Kl(r,i,s),c=Kl(r,i,s),h=l.layer,u=c.layer;if(Kr(h).size<He.reachMin||Kr(u).size<He.reachMin||qe(h)<He.valueMin||qe(u)<He.valueMin)continue;const d=qe(h)>=qe(u)?h:u,m=d===h?u:h;if(ex(d,m),qe(m)<He.valueMin||Kr(m).size<He.reachMin)continue;const g=qe(m)/qe(d);if(g<He.ratioLo||g>He.ratioHi)continue;const x=Rn(`${t}:ai:${n.defender}:${a}`),p=_h(i.ai,m,i.ePulses,i.tMatch,x);if(ql(d,m,K_(d,i.pPulses,i.tMatch),p,i.pPulses,i.ePulses,i.tMatch).p<Yo||o&&ql(d,m,Z_(d,i.pPulses,i.tMatch),p,i.pPulses,i.ePulses,i.tMatch).p>=Yo)continue;const E=h,T=u,M=[];return l.joinerPair&&M.push(l.joinerPair),c.joinerPair&&M.push(c.joinerPair),{seed:t,spec:n,params:i,left:E,right:T,better:d===E?"left":"right",genStats:{boardAttempts:a,qLeft:qe(E),qRight:qe(T)},...M.length>0?{joiners:M}:{}}}return null}function ix(n,t,e={}){for(let i=n.defender;i>=1;i--){const s=nx({attacker:n.attacker,defender:i},t,e);if(s)return s}throw new Error(`transfer generateBoard: no valid board even at defender 1 (seed=${t}, attacker=${n.attacker})`)}class sx{board;playerSide=null;owners=new Array(tr).fill("NEUTRAL");pBudget;eBudget;timeLeft;matchElapsed=0;pulses=[];claimFlash=new Float32Array(tr);phase="PLAN";result=null;locked=new Set;guns=[];eSchedule=[];eFired=[];aiRng;constructor(t){this.board=t,this.pBudget=t.params.pPulses,this.eBudget=t.params.ePulses,this.timeLeft=t.params.tMatch,this.aiRng=Rn(`${t.seed}:liveai:${t.spec.defender}`)}enemySide(){return this.playerSide==="left"?"right":this.playerSide==="right"?"left":null}chooseSide(t){if(this.phase!=="PLAN")return;this.playerSide=t;const e=t==="left"?"right":"left";this.eSchedule=_h(this.board.params.ai,rr(this.board,e),this.eBudget,this.board.params.tMatch,this.aiRng).slice().sort((i,s)=>i.t-s.t),this.eFired=this.eSchedule.map(()=>!1),this.phase="RUN"}firePlayer(t){return this.phase!=="RUN"||!this.playerSide||this.pBudget<=0||this.timeLeft<=0?!1:(this.spawn(this.playerSide,"P",t),this.pBudget--,!0)}spawn(t,e,i){const s=rr(this.board,t).terminals[i];if(s)for(const r of s.outcomes)this.pulses.push({side:t,owner:e,terminalId:i,cell:r.cell,kind:r.kind,delay:r.delay,elapsed:0,repeatPeriod:r.repeatPeriod??2})}resolve(t){if(t.kind==="DEAD"||t.kind==="SHORT"||this.locked.has(t.cell))return;const e=t.owner==="P"?"P":"E",i=e==="P"?"E":"P",s=this.owners[t.cell];t.kind==="CLAIM"?this.owners[t.cell]=e:t.kind==="LOCK"?(this.owners[t.cell]=e,this.locked.add(t.cell)):t.kind==="FLIP"?this.owners[t.cell]=i:t.kind==="CONVERT"?this.owners[t.cell]=s===i?"NEUTRAL":e:t.kind==="INVERT"?this.owners[t.cell]=s==="NEUTRAL"?e:s==="P"?"E":"P":t.kind==="REPEAT"&&(this.owners[t.cell]=e,this.guns.push({cell:t.cell,period:t.repeatPeriod,nextAt:this.matchElapsed+t.repeatPeriod,owner:t.owner})),this.claimFlash[t.cell]=.35}tick(t){if(this.phase!=="RUN")return;this.matchElapsed+=t,this.timeLeft=Math.max(0,this.board.params.tMatch-this.matchElapsed);const e=this.enemySide();if(e)for(let s=0;s<this.eSchedule.length;s++)!this.eFired[s]&&this.eSchedule[s].t<=this.matchElapsed&&this.eBudget>0&&this.timeLeft>0&&(this.eFired[s]=!0,this.spawn(e,"E",this.eSchedule[s].terminal),this.eBudget--);const i=[];for(const s of this.pulses)s.elapsed+=t,s.elapsed>=s.delay?this.resolve(s):i.push(s);this.pulses=i;for(const s of this.guns)for(;this.matchElapsed>=s.nextAt&&s.nextAt<=this.board.params.tMatch&&!this.locked.has(s.cell);)this.owners[s.cell]=s.owner,this.claimFlash[s.cell]=.35,s.nextAt+=s.period;for(let s=0;s<tr;s++)this.claimFlash[s]>0&&(this.claimFlash[s]=Math.max(0,this.claimFlash[s]-t));this.timeLeft<=0&&this.pulses.length===0&&this.finish()}finish(){let t=0;for(const e of this.owners)e==="P"&&t++;this.result={p:t,e:this.owners.filter(e=>e==="E").length},this.phase=t>=Yo?"WON":t===W_?"DEADLOCK":"LOST"}counts(){let t=0,e=0,i=0;for(const s of this.owners)s==="P"?t++:s==="E"?e++:i++;return{p:t,e,n:i}}}let mr=1;const rx=n=>{mr=n},Zl=()=>mr,ox=n=>Math.max(1,Math.min(3.2,.72*n/.82)),qo=n=>[0,(.86-n*(1.72/11))*mr],jo=(n,t)=>[n==="left"?-1.32:1.32,(.82-t*(1.64/7))*mr];function ax(n,t,e,i=.028){const[s,r]=jo(n,t),o=s*(.72-t*.045),[,a]=qo(e),l=s>0?.16:-.16,c=[[s,r],[o,r],[o,a],[l,a],[0,a]];let h=0;const u=[];for(let g=1;g<c.length;g++){const x=Math.hypot(c[g][0]-c[g-1][0],c[g][1]-c[g-1][1]);u.push(x),h+=x}const d=[];let m=0;for(let g=1;g<c.length;g++){const[x,p]=c[g-1],[f,E]=c[g],T=u[g-1],M=Math.max(1,Math.round(T/i));for(let N=0;N<M;N++){const b=N/M;d.push({x:x+(f-x)*b,y:p+(E-p)*b,u:h>0?(m+b*T)/h:0})}m+=T}return d.push({x:c[c.length-1][0],y:c[c.length-1][1],u:1}),d}const Jl=(n,t,e)=>[n[0]+(t[0]-n[0])*e,n[1]+(t[1]-n[1])*e,n[2]+(t[2]-n[2])*e],Zr=.012,lx=(n,t)=>{const e=n[Math.max(0,t-1)],i=n[Math.min(n.length-1,t+1)];let s=i.x-e.x,r=i.y-e.y;const o=Math.hypot(s,r)||1;return s/=o,r/=o,[s,r,-r,s]},cx=(n,t)=>{let e=0;for(;e<n.length-2&&n[e+1].u<t;)e++;const i=n[e],s=n[Math.min(e+1,n.length-1)],r=Math.max(0,Math.min(1,(t-i.u)/(s.u-i.u||1)));let o=s.x-i.x,a=s.y-i.y;const l=Math.hypot(o,a)||1;return o/=l,a/=l,{x:i.x+(s.x-i.x)*r,y:i.y+(s.y-i.y)*r,nx:-a,ny:o}};function hx(n,t,e,i,s,r,o,a,l=!0){const c=[e[0]*.7,e[1]*.7,e[2]*.7];for(let u=0;u<t.length;u++){const d=t[u];if(d.u>r)break;const[,,m,g]=lx(t,u),{b:x,col:p}=s(d.u),f=.16*Math.max(0,Math.sin((d.u*2.2-o*.09+a)*Math.PI*2)),E=Jl(e,p,Math.min(1,x)),T=.45+f+.85*x;n.dot(d.x,d.y,E[0]*T,E[1]*T,E[2]*T,2.3+x*3.6,.95);for(const M of[1,-1]){const N=Jl(c,p,Math.min(1,x*.8)),b=.3+f*.7+.6*x;n.dot(d.x+m*M*Zr,d.y+g*M*Zr,N[0]*b,N[1]*b,N[2]*b,1.6+x*2.2,.85)}}if(!l)return;const h=5;for(let u=0;u<h;u++){const d=(o*.13+u/h+a*.13)%1;for(let m=0;m<5;m++){const g=d-m*.022;if(g<=.005||g>r)continue;const x=cx(t,g),p=Math.sin(g*24+o*2.2+a)*Zr,f=(1-m/5)*.85;n.dot(x.x+x.nx*p,x.y+x.ny*p,i[0]*f,i[1]*f,i[2]*f,2.8-m*.4,.92)}}}const ze=[.4,.95,.7],Oe=[.95,.4,.36],ve=[.95,.78,.4],Jr=[1,.82,.4],bi=[1,.6,.3];function Nt(n,t,e,i,s){return{x:n,y:t,r:e,col:i,a:s}}function ux(n){return[Nt(0,0,.38,ze,1),Nt(0,0,.6,ze,.18)]}function dx(n){return[Nt(0,-.75,.15,ze,.9),Nt(0,-.45,.15,ze,.85),Nt(0,-.15,.15,ze,.8),Nt(0,.1,.2,ze,1),Nt(-.3,.42,.14,ze,.85),Nt(-.55,.7,.14,ze,.8),Nt(-.7,.9,.18,ze,.9),Nt(.3,.42,.14,ze,.85),Nt(.55,.7,.14,ze,.8),Nt(.7,.9,.18,ze,.9)]}function fx(n){const t=[];for(let r=0;r<8;r++){const o=r/8*Math.PI*2+n*.4,a=Math.cos(o)*.65,l=Math.sin(o)*.65;t.push(Nt(a,l,.15,Jr,.9))}t.push(Nt(0,0,.22,Jr,1));const s=4;for(let r=0;r<s;r++){const o=r/s*Math.PI*2+Math.PI/4;t.push(Nt(Math.cos(o)*.33,Math.sin(o)*.33,.11,Jr,.75))}return t}function px(n){return[Nt(-.7,.85,.16,ve,.85),Nt(-.5,.55,.14,ve,.8),Nt(-.28,.3,.14,ve,.8),Nt(.7,.85,.16,ve,.85),Nt(.5,.55,.14,ve,.8),Nt(.28,.3,.14,ve,.8),Nt(0,.05,.22,ve,1),Nt(0,-.25,.15,ve,.9),Nt(0,-.55,.15,ve,.85),Nt(0,-.82,.18,ve,.9)]}function mx(n){return[Nt(0,-.85,.14,Oe,.7),Nt(0,-.55,.14,Oe,.75),Nt(0,-.25,.16,Oe,.8),Nt(-.28,.1,.14,Oe,.9),Nt(-.55,.35,.16,Oe,1),Nt(.28,.1,.14,Oe,.9),Nt(.55,.35,.16,Oe,1),Nt(-.28,.6,.14,Oe,.9),Nt(-.55,.85,.16,Oe,1),Nt(.28,.6,.14,Oe,.9),Nt(.55,.85,.16,Oe,1),Nt(0,.35,.18,Oe,.85)]}function gx(n){const t=.75+Math.sin(n*6)*.25;return[Nt(-.9,0,.13,ve,.8),Nt(-.65,0,.13,ve,.8),Nt(-.4,0,.13,ve,.8),Nt(.4,0,.13,ve,.8),Nt(.65,0,.13,ve,.8),Nt(.9,0,.13,ve,.8),Nt(-.2,-.3,.14,bi,t),Nt(-.05,0,.16,bi,t),Nt(.1,.3,.14,bi,t),Nt(.05,0,.15,bi,t*.8),Nt(.2,-.3,.13,bi,t),Nt(0,0,.2,bi,t)]}function _x(n){const t=[];for(let i=0;i<4;i++)for(let s=0;s<4;s++){const r=-.7+s/3*1.4,o=-.7+i/3*1.4;t.push(Nt(r,o,.16,Oe,.88))}return t}function xx(n){const t=[];for(let i=0;i<4;i++)for(let s=0;s<4;s++){const r=-.7+s/3*1.4,o=-.7+i/3*1.4,a=s<2;t.push(Nt(r,o,a?.16:.1,ve,a?.9:.3))}return t}const vx={CLAIM:ux,SPLIT:dx,LOCK:fx,JOINER:px,DEAD:mx,SHORT:gx,FLIP:_x,CONVERT:xx};function xh(n,t){return vx[n](t)}const is=[{kind:"CLAIM",name:"Claim",meaning:"Captures the cell for the firing side.",tag:"good"},{kind:"SPLIT",name:"Split",meaning:"One pulse becomes two, claiming the cell twice.",tag:"good"},{kind:"LOCK",name:"Lock",meaning:"Claims and freezes the cell — enemy pulses cannot change its owner.",tag:"good"},{kind:"JOINER",name:"Joiner",meaning:"Two incoming pulses merge into one outgoing pulse.",tag:"tool"},{kind:"DEAD",name:"Dead End",meaning:"Pulse is absorbed — no ownership change.",tag:"bad"},{kind:"SHORT",name:"Short",meaning:"Circuit shorts out — pulse is lost with a spark, no effect.",tag:"bad"},{kind:"FLIP",name:"Flip",meaning:"Inverts ownership: your pulse gives the cell to your opponent.",tag:"bad"},{kind:"CONVERT",name:"Convert",meaning:"Converts the cell one step toward neutral, then toward the firing side.",tag:"tool"}],ae={cellN:[.22,.22,.28],p:[.88,.92,1],litP:[1.1,1.12,1.2],dead:[.7,.34,.32],white:[1,1,1],offDim:[.16,.17,.2],offGlyph:[.42,.44,.5]},Ai=(n,t,e)=>[n[0]+(t[0]-n[0])*e,n[1]+(t[1]-n[1])*e,n[2]+(t[2]-n[2])*e],Qr=(n,t)=>[n[0]*t,n[1]*t,n[2]*t],Ql=[[.86,.9,1],[1,1,1],[.68,.74,.92]],tc=n=>{const t=[93,202,165],e=[224,176,112],i=[208,96,90],s=(r,o,a)=>`rgb(${Math.round(r[0]+(o[0]-r[0])*a)},${Math.round(r[1]+(o[1]-r[1])*a)},${Math.round(r[2]+(o[2]-r[2])*a)})`;return n>.5?s(t,e,(1-n)/.5):s(e,i,Math.max(0,(.5-n)/.5))},ec=n=>{switch(n){case"CLAIM":return"CLAIM";case"LOCK":return"LOCK";case"DEAD":return"DEAD";case"SHORT":return"SHORT";case"FLIP":return"FLIP";case"CONVERT":return"CONVERT";case"REPEAT":return"CLAIM";case"INVERT":return"CONVERT";default:return"CLAIM"}},Mx=n=>n==="DEAD"?.66:.5,nc=n=>n==="DEAD"?.66:n==="SHORT"?.55:1;function yx(n,t){const e=new Hc({canvas:n,antialias:!0});e.setPixelRatio(Math.min(window.devicePixelRatio,2)),e.setClearColor(329226,1);const i=new Gc,s=1.46,r=1.04,o=new ps(-1,1,1,-1,.01,100);o.position.set(0,0,4),o.lookAt(0,0,0);const a=new th(9e3,{additive:!0});i.add(a.points);const l=new Zc(e);l.addPass(new Jc(i,o)),l.addPass(new ai(new Ft(1,1),.6,.5,.22)),l.addPass(new Qc);const c="http://www.w3.org/2000/svg",h="ui-monospace,SFMono-Regular,Menlo,monospace",u=it=>{const ct=document.createElement("div");return ct.style.cssText=it,document.body.appendChild(ct),ct},d=document.createElementNS(c,"svg");d.setAttribute("viewBox","0 0 48 48"),d.style.cssText="position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top));transform:translateX(-50%);width:44px;height:44px;pointer-events:none";const m=document.createElementNS(c,"circle");m.setAttribute("cx","24"),m.setAttribute("cy","24"),m.setAttribute("r","21"),m.setAttribute("fill","none"),m.setAttribute("stroke",tc(1)),m.setAttribute("stroke-width","1.6"),d.appendChild(m),document.body.appendChild(d);const g=u(`position:fixed;left:50%;top:calc(64px + env(safe-area-inset-top));transform:translateX(-50%);max-width:min(92vw,560px);font:12px ${h};color:#9a9aa6;pointer-events:none;text-align:center;line-height:1.45`),x=u(`position:fixed;left:calc(12px + env(safe-area-inset-left));bottom:calc(12px + env(safe-area-inset-bottom));max-width:46vw;font:11px ${h};color:#55555f;pointer-events:none`),p=u(`position:fixed;right:calc(12px + env(safe-area-inset-right));bottom:calc(12px + env(safe-area-inset-bottom));max-width:46vw;font:11px ${h};color:#6a6a76;pointer-events:none;text-align:right`),f=Object.fromEntries(is.map(it=>[it.kind,it.tag==="bad"?"#f26660":it.tag==="tool"?"#f0c766":"#66f0b0"]));p.innerHTML=is.map(it=>`<span style="color:${f[it.kind]}">${it.name.toLowerCase()}</span>`).join(" · ");const E=u(`position:fixed;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:rgba(5,6,10,.55);font:${h};text-align:center;pointer-events:none`),T=u(`position:fixed;display:none;z-index:2147483647;max-width:236px;padding:8px 11px;border:1px solid #2a2a38;border-radius:8px;background:rgba(10,11,17,.95);font:11px/1.5 ${h};color:#c7c9d4;pointer-events:none;box-shadow:0 8px 26px rgba(0,0,0,.55)`),M=new Map(is.map(it=>[it.kind,it]));let N,b,C=[],L=new Map,y=[],v=null,P=[0,0],G=$l(t.seed);const V=()=>Ai(G.color,ae.white,.28);function J(){C=[],L=new Map;for(const it of["left","right"])rr(N,it).terminals.forEach((ct,ht)=>{const Tt=ct.outcomes.length>=2;ct.outcomes.forEach((yt,Lt)=>{const D=ax(it,ht,yt.cell);C.push({side:it,term:ht,cell:yt.cell,kind:yt.kind,dots:D,fork:Tt,primary:Lt===0}),L.set(`${it}:${ht}:${yt.cell}`,D)})})}function tt(it,ct){N=ix(it,ct,{elements:"full"}),b=new sx(N),G=$l(ct),y=N.joiners??[],J(),E.style.display="none"}tt(t.spec,t.seed);function Q(){const it=window.innerWidth,ct=window.innerHeight;e.setSize(it,ct),l.setSize(it,ct);const ht=it/ct,Tt=Math.max(r,s/ht);o.top=Tt,o.bottom=-Tt,o.right=Tt*ht,o.left=-Tt*ht,o.updateProjectionMatrix(),rx(ox(Tt)),J()}window.addEventListener("resize",Q),Q();const W=(it,ct)=>{const ht=n.getBoundingClientRect();return[((it-ht.left)/ht.width*2-1)*o.right,(-((ct-ht.top)/ht.height)*2+1)*o.top]},$=(it,ct,ht)=>{let Tt=-1,yt=.22;for(let Lt=0;Lt<8;Lt++){const[D,Yt]=jo(it,Lt),Ot=Math.hypot(ct-D,ht-Yt);Ot<yt&&(yt=Ot,Tt=Lt)}return Tt};n.addEventListener("pointermove",it=>{v=W(it.clientX,it.clientY),P=[it.clientX,it.clientY]}),n.addEventListener("pointerup",it=>{const[ct,ht]=W(it.clientX,it.clientY);if(b.phase==="PLAN")b.chooseSide(ct<0?"left":"right");else if(b.phase==="RUN"&&b.playerSide){const Tt=$(b.playerSide,ct,ht);Tt>=0&&b.firePlayer(Tt)}});const rt=(it,ct,ht,Tt,yt,Lt)=>{for(const D of it){const Yt=(.3+.7*D.depth+D.scan*.7)*Lt;a.dot(ct+D.x*Tt,ht+D.y*Tt,yt[0]*Yt,yt[1]*Yt,yt[2]*Yt,1.4+2.2*D.depth+D.scan*2.6,.95)}},vt=(it,ct,ht,Tt,yt,Lt)=>{for(const D of it){const Yt=(.3+.7*D.depth+D.scan*.7)*Lt;a.dot(ct+D.x*Tt,ht+D.y*Tt,yt[0]*Yt,yt[1]*Yt,yt[2]*Yt,1.4+2.2*D.depth+D.scan*2.6,Math.min(1,D.a))}},gt=(it,ct)=>{let ht=0,Tt=9;for(let yt=0;yt<it.length;yt++){const Lt=Math.abs(it[yt].u-ct);Lt<Tt&&(Tt=Lt,ht=yt)}return it[ht]},nt=(it,ct,ht,Tt,yt,Lt)=>{for(let D=0;D<8;D++){const Yt=D/8*Math.PI*2;a.dot(it+Math.cos(Yt)*ht,ct+Math.sin(Yt)*ht,Tt[0]*Lt,Tt[1]*Lt,Tt[2]*Lt,yt,.9)}},Ht=(it,ct,ht,Tt,yt,Lt,D,Yt=0)=>{const Ot=Math.cos(Yt),zt=Math.sin(Yt);for(const bt of xh(it,Tt)){const Wt=D??bt.col,At=yt*bt.a,A=bt.x*Ot-bt.y*zt,_=bt.x*zt+bt.y*Ot;a.dot(ct+A*Lt,ht+_*Lt,Wt[0]*At,Wt[1]*At,Wt[2]*At,1.4+bt.r*6,Math.min(1,bt.a))}};function et(){const it=b.counts(),ct=b.phase==="DEADLOCK",ht=b.phase==="WON",Tt=ht?"◆ COMPLETE":ct?"⟳ DEADLOCK · 6–6 replays":"✕ REJECTED",yt=ht?"#8fd0b6":ct?"#e0b070":"#d0605a";E.innerHTML=`<div style="font-size:22px;letter-spacing:.2em;color:${yt}">${Tt}</div>`+(ct?'<div style="font-size:12px;color:#9a9aa6">6–6 — the battle replays</div>':`<div style="font-size:12px;color:#9a9aa6">you ${it.p} · host ${it.e} · neutral ${it.n}</div>`)+'<div style="font-size:11px;color:#55555f;margin-top:8px">press R or tap ⟳ to run again</div>',E.style.display="flex"}let lt=performance.now(),pt=0;function ft(){const it=performance.now(),ct=it/1e3,ht=Math.min(.05,(it-lt)/1e3);lt=it,b.tick(ht);const Tt=b.phase!=="PLAN",yt=new Map;for(const w of b.pulses){const I=`${w.side}:${w.terminalId}:${w.cell}`,U=yt.get(I)??[];U.push({p:w.elapsed/w.delay,owner:w.owner,kind:w.kind}),yt.set(I,U)}let Lt=-1;const D=b.phase==="RUN"?b.playerSide:v?v[0]<0?"left":"right":null;v&&D&&(Lt=$(D,v[0],v[1]));const Yt=Lt>=0&&D;a.begin();for(const w of C){const I=b.playerSide?w.side===b.playerSide?"P":"E":"N";let U,Z;if(!Tt)U=ae.offDim,Z=ae.offDim;else if(I==="E"){const dt=.8+.2*(w.term%2);U=Qr(G.dim,dt),Z=Qr(G.color,dt)}else{const dt=Ql[w.term%Ql.length];U=Qr(dt,I==="N"?.24:.2),Z=dt}const B=Yt&&w.side===D&&w.term===Lt,Y=yt.get(`${w.side}:${w.term}:${w.cell}`),ot=nc(w.kind);hx(a,w.dots,U,Z,dt=>{let Ut=B?.42:0,Pt=ae.white;if(Y)for(const Bt of Y){const F=dt<=Bt.p?Math.exp(-(Bt.p-dt)/.12):Math.exp(-(dt-Bt.p)/.025);F>Ut&&(Ut=F,Pt=Bt.kind==="DEAD"?ae.dead:Bt.owner==="P"?ae.litP:V())}return{b:Ut,col:Pt}},ot,ct,w.term*.6+(w.side==="left"?0:1.7),Tt);const X=(B?1:.7)*(Tt?1:.85),st=Tt?void 0:ae.offGlyph,ut=ec(w.kind),St=gt(w.dots,Mx(w.kind));if(Ht(ut,St.x,St.y,ct,X,.03,st),w.fork&&w.primary){const dt=gt(w.dots,.22);let Ut=0,Pt=0;for(const F of C){if(F.side!==w.side||F.term!==w.term)continue;const[xt,O]=qo(F.cell);Ut+=xt-dt.x,Pt+=O-dt.y}const Bt=Math.atan2(Pt,Ut)-Math.PI/2;Ht("SPLIT",dt.x,dt.y,ct,X*.85,.026,st,Bt)}}for(const[w,I]of y)for(const U of["left","right"]){const Z=rr(N,U),B=new Set(Z.terminals[w]?.outcomes.map(ot=>ot.cell)??[]),Y=Z.terminals[I]?.outcomes.find(ot=>B.has(ot.cell))?.cell;for(const ot of[w,I]){const X=C.find(St=>St.side===U&&St.term===ot&&St.kind==="CLAIM"&&(Y===void 0||St.cell===Y));if(!X)continue;const st=Tt?void 0:ae.offGlyph,ut=gt(X.dots,.82);Ht("JOINER",ut.x,ut.y,ct,.75*(Tt?1:.85),.026,st)}}for(const w of b.pulses){const I=L.get(`${w.side}:${w.terminalId}:${w.cell}`);if(!I)continue;const U=nc(w.kind),Z=Math.min(U,w.elapsed/w.delay),B=gt(I,Z),Y=w.kind==="DEAD"||w.kind==="SHORT"?ae.dead:Ai(w.owner==="P"?ae.litP:V(),ae.white,.4);a.dot(B.x,B.y,Y[0],Y[1],Y[2],9)}const Ot=b.playerSide?b.playerSide==="left"?"right":"left":null,zt=w=>w==="P"?b.playerSide:w==="E"?Ot:null,bt=new Map;if(Yt)for(const w of C)w.side===D&&w.term===Lt&&w.kind!=="DEAD"&&bt.set(w.cell,w.kind);const Wt=Math.min(1.5,.92+.16*Zl());for(let w=0;w<12;w++){const[I,U]=qo(w),Z=b.owners[w],B=b.claimFlash[w]/.35,Y=zt(Z);if(Y&&Z==="E"){const X=Ai(G.color,ae.white,B*.5);vt(Wl(G.node,G.shape,ct+w*.5),I,U,.052*Wt,X,.95+B)}else if(Y){const X=Y==="left"?"octa":"cube",st=Ai(ae.p,ae.white,B*.6);rt(g_(X,ct+w*.5),I,U,.05*Wt,st,.95+B)}else{const X=.03*Wt,st=Ai(ae.cellN,ae.white,B*.7);for(let ut=-1;ut<=1;ut++)for(let St=-1;St<=1;St++)a.dot(I+ut*X,U+St*X,st[0],st[1],st[2],5)}const ot=bt.get(w);ot&&nt(I,U,.066*Wt,Sx(ot),3,.9)}const At=.064*Wt;for(const w of["left","right"]){const I=w==="left"?"octa":"cube",U=b.playerSide?w===b.playerSide?"P":"E":"N",Z=U==="P"?ae.p:U==="E"?G.color:ae.cellN;for(let B=0;B<8;B++){const[Y,ot]=jo(w,B),X=D===w&&Lt===B&&(b.phase==="PLAN"||w===b.playerSide),st=X?1.6:b.phase==="PLAN"?.7+.35*Math.sin(it/240+B):1,ut=X?Ai(Z,ae.white,.4):Z;U==="E"?vt(Wl(G.terminal,G.shape,ct+B*.7),Y,ot,At,ut,st):rt(m_(I,ct+B*.7),Y,ot,At,ut,st)}}const A=.99*Zl();for(let w=0;w<b.pBudget;w++)a.dot(-.24+w*.05,-A,ae.p[0],ae.p[1],ae.p[2],5);a.commit(e.getPixelRatio()),l.render();const _=Math.max(0,b.timeLeft/N.params.tMatch);m.setAttribute("r",String(3+18*_)),m.setAttribute("stroke",tc(_));const R=b.counts();if(x.textContent=`you c${N.spec.attacker} vs ${G.label} c${N.spec.defender} · you ${R.p}/12 · need 7`,b.phase==="PLAN"?(g.textContent="READ BOTH CIRCUITS (unpowered) — hover a terminal to preview its reach, then click a side to power it up",g.style.opacity="1"):b.phase==="RUN"?(g.textContent="fire your terminals · dead/short waste a pulse · later light wins the cell",g.style.opacity="0.7"):g.style.opacity="0",(b.phase==="WON"||b.phase==="LOST"||b.phase==="DEADLOCK")&&E.style.display==="none"&&et(),Yt&&D&&(b.phase==="PLAN"||b.phase==="RUN")){const w=[];let I=!1;for(const Z of C){if(Z.side!==D||Z.term!==Lt)continue;Z.fork&&(I=!0);const B=ec(Z.kind);w.includes(B)||w.push(B)}I&&!w.includes("SPLIT")&&w.unshift("SPLIT"),y.some(([Z,B])=>Z===Lt||B===Lt)&&!w.includes("JOINER")&&w.push("JOINER");const U=w.map(Z=>{const B=M.get(Z);return B?`<div style="margin:2px 0"><b style="color:${f[Z]}">${B.name}</b> — ${B.meaning}</div>`:""}).join("");T.innerHTML=U,T.style.left=`${Math.min(P[0]+16,window.innerWidth-248)}px`,T.style.top=`${Math.min(P[1]+16,window.innerHeight-96)}px`,T.style.display="block"}else T.style.display="none";pt=requestAnimationFrame(ft)}return ft(),{regenerate:(it,ct)=>tt(it,ct),chooseSide:it=>b.chooseSide(it),fire:it=>b.firePlayer(it),game:()=>b,dispose(){cancelAnimationFrame(pt),window.removeEventListener("resize",Q),a.dispose(),l.dispose(),[d,g,x,p,E,T].forEach(it=>it.remove()),e.dispose()}}}const Sx=n=>{const t=(()=>{switch(n){case"CLAIM":case"REPEAT":return"CLAIM";case"LOCK":return"LOCK";case"DEAD":return"DEAD";case"SHORT":return"SHORT";case"FLIP":return"FLIP";default:return"CONVERT"}})(),e=is.find(i=>i.kind===t);return e?.tag==="bad"?[.95,.4,.36]:e?.tag==="tool"?[.95,.78,.4]:[.4,.95,.7]},Ex="Five games. CONSTELLATION, TRANSFER, CIRCUIT, SHAPES, and TUBES — the read-the-circuit model: wires are dotted tubes carrying visible elements (invert / repeat / dead), and you hover a terminal to preview its reach. Reading the two circuits to pick the better side is the skill. Press 1–5; R reseeds.",Tx=[{build:"live",date:"2026-08-11",title:"TUBES (game 5) — the read-the-circuit model",added:["Wires are thin dotted tubes (a cut-and-straightened torus: lit round core + dim walls).","Every terminal is legible: a fork is two tubes, and each tube carries a visible element — an INVERT ring, a REPEAT node, or a DEAD stub that never reaches a cell.","Hover a terminal to preview its reach (its tubes light up and the cells it reaches are ringed by element colour). Reading both circuits to pick the better side is the skill.","Terminals are the searching primitives from SHAPES (octahedra left, cubes right); a very slow ambient band drifts along every tube so the circuit is always gently alive. Mechanics reuse TRANSFER."]},{build:null,date:"2026-08-11",title:"SHAPES (game 4, experimental) — Modes × Primitives",added:["Terminals are Braille-Lab “searching” primitives — octahedra on the left, cubes on the right (lat/long lattice + scan meridian).","A claimed cell resolves into the “solving” (rubik) primitive of the side that took it, in that side’s colour.","Ported the searching + solving modes and the cube/octahedron warps into src/render/primitives.ts; kept the lit angular traces + bloom.","Reuses TRANSFER’s mechanics. Press 4."]},{build:null,date:"2026-08-11",title:"CIRCUIT (game 3) — lit circuit board",added:["A separate tab (press 3): the Paradroid duel rendered as a real circuit — right-angle traces routed through per-terminal vertical buses into the cell strip.","Light flows through the traces as pulses travel: a bright head with a trailing glow that lights each trace segment it passes, plus a bloom pass for the “deeper light”.","Reuses TRANSFER’s verified mechanics; the renderer (angular routing + additive dots + UnrealBloom) is the whole difference."]},{build:null,date:"2026-08-11",title:"TRANSFER (game 2) — playable",added:["The circuit renders as a flat dot-field: a central 12-cell strip flanked by two 8-terminal wiring layers, wires threading terminal → cell.","PLAN: click a side to take it. RUN: click your terminals to fire pulses that travel the wires (with tails) and claim cells — later pulse wins.","Owner colour (you teal / host coral), claim flash, REPEAT guns, the enemy AI firing back, shrinking timer ring, budget dots, win/lose.","Built on the logic core (deterministic sim + solution-first generator, verified across 200 boards). 6-6 rematch still TODO."]},{build:null,date:"2026-08-11",title:"CONSTELLATION: feel + content pass",added:["Extraction magnetism (cursor grabs the nearest glyph point) + reticle snap + extract-pop.","Glyph bank grown to 15 (min Hamming 8).","Timer is a hollow thin ring that shrinks and shifts teal → amber → red."]},{build:null,date:"2026-08-11",title:"Phase 2 — extraction, sweep, win/lose",added:["Click the glyph’s points while aligned to extract them; all points → lock solved, all locks → win.","TRIP hazards cost a strike + 10% of the timer (3 strikes = alarm); NOISE clicks are duds.","A scan wavefront sweeps the cloud; a pass caught mid-extraction while misaligned wipes a point back. Axis drift on D4+.","HUD: depleting timer, strike pips, extraction progress; win / alarm / timeout end screens with margin + extracted keys."]},{build:null,date:"2026-08-11",title:"Phase 1 polish",added:["θ_lock soft-snap with hysteresis (magnetic assist, hands-off).","Coherence → per-point brightness; the noise dims as a lock forms so the glyph reads cleanly.","A gold “found” shine (color tint + bloom) fires the moment a lock completes.","Diegetic dotted-arc coherence meter."]},{build:null,date:"2026-08-11",title:"Board wired into the renderer",added:["A generated CONSTELLATION board renders as a halftone point cloud.","Orbit-to-align: as your view nears a hidden axis, that lock’s signal contracts and the glyph resolves out of the noise.","R to reseed; this dev-log panel on the version badge."]},{build:null,date:"2026-08-11",title:"CONSTELLATION generator",added:["Solution-first, seeded board generator (spec §6): hidden axis, back-projected key glyph, TRIP hazards in the margin ring, noise fill.","Rigid-Procrustes coherence metric (fits the whole signal set to the glyph) — also the gameplay alignment cue.","False-constellation uniqueness check: verified across 1000 boards, zero spurious, all first-try.","Dependency-free vec3 math so the logic runs headless in Node for testing."]},{build:null,date:"2026-08-11",title:"Shared glyph bank",added:["10× 5×7 key glyphs (CONSTELLATION) + 6× 2×4 braille symbols (BREACH) — one cross-game visual language.","Distinctness verified numerically (min Hamming 9 and 4).","Helpers: back-projection points, the 1-dot TRIP margin ring, Hamming distance."]},{build:"e059300d",date:"2026-08-11",title:"Scaffold, renderer & cache-busting",added:["TypeScript + Vite + Three.js project.","Dotted-halftone look as a GPU point shader (depth → grayscale + size), ported from the Braille PoC.","Seeded RNG (mulberry32) + the shared session contract.","Cache-busting toolkit wired into the build (this badge)."]}],bx=[{phase:"Now",note:"CONSTELLATION full loop",items:[{label:"Board renders + resolves on alignment",done:!0},{label:"θ_lock soft-snap; coherence → brightness; found-shine",done:!0},{label:"Extraction, sweep + axis drift, TRIP strikes, win/lose + scoring",done:!0},{label:"Trace-stroke extraction variant + audio (coherence tone, ticks)"},{label:"SKILL modifiers (hint band, TRIP shimmer) + OVERRIDE + exfil rule"}]},{phase:"Next",note:"Harden + present",items:[{label:"Difficulty/skill/seed selector UI (PLAN screen)"},{label:"Feel tuning pass (extraction radius, sweep pressure, drift)"},{label:"Deterministic replay (seed + input log) as an acceptance test"}]},{phase:"Later",note:"The rest of the series",items:[{label:"Braille dot-matrix renderer (second render target)"},{label:"TRANSFER (Paradroid duel), TRACE (node capture), BREACH (matrix)"},{label:"Write the 4 missing specs (deduction, flow-routing, timing, crosslink)"},{label:"Host integration + deploy"}]}],Te={entry:[.42,.88,.72],registry:[1,.82,.4],store:[.92,.72,.36],alarm:[.9,.4,.36],spam:[.72,.52,1],dir:[.5,.54,.64],tracer:[1,.34,.3]},Xs=(n,t,e,i,s=.13,r=1)=>{for(let o=0;o<e;o++){const a=o/e*Math.PI*2;n.push({x:Math.cos(a)*t,y:Math.sin(a)*t,r:s,col:i,a:r})}};function Ax(n,t){const e=[];if(n==="ENTRY")Xs(e,.62,10,Te.entry),e.push({x:0,y:0,r:.18,col:Te.entry,a:1});else if(n==="REGISTRY")Xs(e,.72,12,Te.registry),Xs(e,.38,7,Te.registry),e.push({x:0,y:0,r:.18,col:Te.registry,a:1});else if(n==="DIR"){for(let i=0;i<6;i++){const s=i/6*Math.PI*2+.6,r=.26+.1*(i%2);e.push({x:Math.cos(s)*r,y:Math.sin(s)*r,r:.14,col:Te.dir,a:.9})}e.push({x:0,y:0,r:.16,col:Te.dir,a:1})}else if(n==="STORE"){for(const[i,s]of[[0,1],[1,0],[0,-1],[-1,0]])e.push({x:i*.6,y:s*.6,r:.16,col:Te.store,a:1});e.push({x:0,y:0,r:.16,col:Te.store,a:.9})}else if(n==="ALARM")for(let i=-2;i<=2;i++)e.push({x:i*.28,y:i*.28,r:.14,col:Te.alarm,a:1}),e.push({x:i*.28,y:-i*.28,r:.14,col:Te.alarm,a:1});else if(n==="SPAM")Xs(e,.5,6,Te.spam),e.push({x:0,y:0,r:.15,col:Te.spam,a:.85});else{e.push({x:.35,y:0,r:.28,col:Te.tracer,a:1});for(let i=1;i<=4;i++)e.push({x:.35-i*.22,y:0,r:.18-i*.02,col:Te.tracer,a:.9-i*.18})}return e}const wx=[{kind:"ENTRY",name:"Entry",meaning:"Your way in and out. If the tracer reaches it, you are traced — critical loss.",tag:"good"},{kind:"REGISTRY",name:"Registry",meaning:"The goal. Capture one to grab the data — which trips the alarm and starts the race home.",tag:"good"},{kind:"DIR",name:"Node",meaning:"A plain stepping-stone. Its rating sets the capture time and detection risk.",tag:"tool"},{kind:"STORE",name:"Store",meaning:"Off-path loot. Grab it for bonus, but every extra capture raises your detection odds.",tag:"tool"},{kind:"ALARM",name:"Alarm",meaning:"Hazard. A failed capture here speeds the tracer up for the rest of the run.",tag:"bad"},{kind:"SPAM",name:"Spam",meaning:"Capturing it slows the tracer, but detection is guaranteed — a deliberate speed bump.",tag:"bad"},{kind:"TRACER",name:"Tracer",meaning:"The counter-process. On detection it crawls your captured nodes back toward Entry.",tag:"bad"}],Rx=is.map(n=>({...n,source:"circuit"})),Cx=wx.map(n=>({...n,source:"trace"})),ss=[{name:"CONSTELLATION",status:"playable",fantasy:"An encrypted datastructure hangs in space as a cloud of noise. From exactly one viewpoint the noise collapses into a key. Find the angle, read the key, extract it without touching the tripwires.",how:["Press 1. Orbit the cloud (drag). One hidden viewing angle makes the scattered thinking-orbs snap into a glyph.","As you near that angle the signal dots contract and brighten; within tolerance the view soft-snaps and the glyph is legible. The dotted arc fills toward a lock.","While aligned, click every glyph point to extract it (they light up). All points solves the lock; a gold shine confirms the key.","A NOISE click is a dud (small time cost); a TRIP dot — just outside the glyph outline — is a hazard hit. Harder boards hide several glyphs on different axes; solve them in any order."],fail:["Critical: 3 TRIP hits trips the alarm.","Soft: the run timer expires — attempt lost, retry allowed. You can jack out any time.","Pressure: a scan wavefront sweeps the cloud; caught mid-extraction while misaligned, it wipes a recovered point. Top tiers slowly drift the axis."],note:"Playable end to end. Still to come: trace-stroke variant, audio, and SKILL/OVERRIDE modifiers."},{name:"TRACE",status:"playable",fantasy:"You breach a network at an I/O port (your ENTRY) and spread across its nodes toward a REGISTRY. Grabbing the registry trips the alarm — now a tracer races your captured territory back to your entry. Get the data and get out before it traces you home.",how:["Press 2. You start owning only your ENTRY ◎ (green). Click any node touching your territory to capture it — capture takes a moment, then rolls a detection chance shown on hover (higher-rated nodes are slower and riskier).","Push toward a REGISTRY ◈ along the low-rated nodes. Detour to a STORE ◇ for loot if you dare — every capture is another detection roll, so greed wakes the tracer early.","Grabbing a registry ALWAYS trips the alarm: the tracer spawns and crawls, node by node, back toward your ENTRY. Now retreat — click your own captured nodes to hop home before it arrives.","Tools: ❄ FREEZE halts the tracer for a few seconds; ✚ NUKE captures one node silently (no roll). Read the node glossary below — ✕ ALARM and ◌ SPAM nodes bite."],fail:["Win: reach your ENTRY on the way out after taking the registry.","Critical: the tracer reaches your ENTRY first — you are traced.","Greed tax: extra STORE captures raise detection, so the tracer wakes earlier and the exfil is harder."],note:"Game 2: a graph capture-vs-tracer race (Deus Ex / Uplink / Invisible Inc). Still to come: fog + one-way edges at higher tiers, fortify, and the accelerating-tracer audio tick.",glossary:Cx},{name:"HDT",status:"playable",fantasy:"HanDouTai (半導体 — semiconductor). A takeover duel over 12 registers: you and the host each drive one side of a circuit. Read the dead board, take the better side, and out-claim the processor for control.",how:["Press 3. PLAN: the board is unpowered — read both circuits and each wire’s element (see the glossary below), then click a side to power it on and take it. The host drives the other side.","RUN: click your terminals to fire a limited stock of pulses. Each travels its wire to an element that claims (or wastes, or flips) the register it reaches; later light wins a contested cell — so hold some back to overwrite the host late.","Read the wires: SPLIT claims two at once, LOCK freezes a register for good; DEAD-END, SHORT and the filled ■ transformer (FLIP) waste the pulse or feed the host — avoid them.","Win rule (1985 Paradroid): ≥ 7 of 12 registers yours → Complete. Exactly 6 → Deadlock, replay the same board. ≤ 5 → Rejected."],fail:["Critical: hold fewer than 6 registers when the clock runs out → Rejected.","Wasted pulses: a DEAD-END or SHORT absorbs your pulse; the filled ■ transformer (FLIP) hands the register to the host.","Deadlock (6–6) replays the exact same board — no win, no loss, just another try."],note:"Game 3: the read-the-circuit takeover duel with the full Paradroid wire vocabulary and an unpowered→powered read. The host ramps up over the ladder (slower + fewer pulses on the low rungs).",glossary:Rx},{name:"BREACH",status:"planned",fantasy:"A code matrix scrolls before you. You have a tiny buffer. Chain one path through the grid that smuggles every daemon in at once. (Cyberpunk 2077 Breach Protocol.)",how:["Pick glyphs into a small buffer; picks alternate axis — row, then column, then row…","Complete each daemon (a target sub-sequence) as a contiguous run in the buffer; overlap them so one path completes several.","Avoid the WORM hazard cell, which wastes a slot and speeds the clock."],fail:["Soft: timer or buffer runs out with zero daemons completed. Margin = spare buffer + time."]}],vh=()=>(document.querySelector('meta[name="cb"]')?.getAttribute("content")||"").replace(/#.*$/,"")||"——",le=n=>n.replace(/[&<>]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;"})[t]),Px=n=>n.build==="live"?vh():n.build??"—";function Lx(){const n=Tx.map(e=>{const i=e.added.map(s=>`<li>${le(s)}</li>`).join("");return`
      <div class="cx-ms">
        <div class="cx-ms-h"><span class="cx-tok">${le(Px(e))}</span>
          <span class="cx-ms-t">${le(e.title)}</span><span class="cx-date">${le(e.date)}</span></div>
        <ul>${i}</ul>
      </div>`}).join(""),t=bx.map(e=>{const i=e.items.map(s=>`<li class="${s.done?"done":""}">${s.done?"✓":"○"} ${le(s.label)}</li>`).join("");return`
      <div class="cx-rm">
        <div class="cx-rm-h">${le(e.phase)}${e.note?` <span class="cx-note">— ${le(e.note)}</span>`:""}</div>
        <ul>${i}</ul>
      </div>`}).join("");return`
    <div class="cx-status">${le(Ex)}</div>
    <div class="cx-scroll">
      <div class="cx-sec">Changelog</div>${n}
      <div class="cx-sec">Roadmap</div>${t}
    </div>`}function Dx(n){return`<div class="cx-lbl">Wire vocabulary</div><div class="cx-glossary">${n.map(e=>{const i=`cx-gtag cx-gtag-${e.tag}`;return`
      <div class="cx-grow">
        <canvas class="cx-gcanvas" data-kind="${le(e.kind)}" data-source="${le(e.source)}" width="40" height="40" aria-hidden="true"></canvas>
        <div class="cx-ginfo">
          <span class="cx-gname">${le(e.name)}</span>
          <span class="cx-gmeaning">${le(e.meaning)}</span>
          <span class="${i}">${le(e.tag)}</span>
        </div>
      </div>`}).join("")}</div>`}function Ix(n){const t=n.how.map(r=>`<li>${le(r)}</li>`).join(""),e=n.fail.map(r=>`<li>${le(r)}</li>`).join(""),i=n.note?`<div class="cx-gnote">${le(n.note)}</div>`:"",s=n.glossary?Dx(n.glossary):"";return`
    <div class="cx-game">
      <div class="cx-game-h"><span class="cx-game-n">${le(n.name)}</span>
        <span class="cx-badge cx-${n.status.replace(/\s/g,"")}">${le(n.status)}</span></div>
      <div class="cx-fantasy">${le(n.fantasy)}</div>
      <div class="cx-lbl">How to play</div><ul>${t}</ul>
      <div class="cx-lbl">Failure</div><ul class="cx-fail">${e}</ul>
      ${i}
      ${s}
    </div>`}function Ux(n){const t=ss.map(i=>`<button class="cx-rtab ${i.name===n?"on":""}" data-rules-game="${le(i.name)}">${le(i.name)}</button>`).join(""),e=ss.find(i=>i.name===n)??ss[0];return`<div class="cx-rtabs">${t}</div><div class="cx-scroll">${Ix(e)}</div>`}function Nx(n,t){return`
    <div class="cx-head">
      <div>
        <div class="cx-title">hacking-mini-games</div>
        <div class="cx-sub">build <b>${le(vh())}</b></div>
      </div>
      <button class="cx-close" aria-label="close">✕</button>
    </div>
    <div class="cx-tabs">
      <button class="cx-tab ${n==="log"?"on":""}" data-tab="log">Dev Log</button>
      <button class="cx-tab ${n==="rules"?"on":""}" data-tab="rules">Rules</button>
    </div>
    ${n==="log"?Lx():Ux(t)}`}function Fx(n){const t=Math.min(2,devicePixelRatio||1),e=40,i=e*t,s=e/2,r=e/2,o=16;n.querySelectorAll("canvas.cx-gcanvas").forEach(a=>{const l=a.dataset.kind;if(!l)return;a.width=i,a.height=i,a.style.width=`${e}px`,a.style.height=`${e}px`;const c=a.getContext("2d");if(!c)return;c.scale(t,t),c.fillStyle="#0a0a10",c.fillRect(0,0,e,e);const h=a.dataset.source==="trace"?Ax(l):xh(l,.7);for(const u of h){const d=s+u.x*o,m=r+u.y*o,g=Math.max(.6,u.r*o*.5),[x,p,f]=u.col;c.beginPath(),c.arc(d,m,g,0,Math.PI*2),c.fillStyle=`rgba(${Math.round(x*255)},${Math.round(p*255)},${Math.round(f*255)},${u.a})`,c.fill()}})}const Ox=`
  #cx-panel{position:fixed;right:8px;bottom:44px;width:min(410px,calc(100vw - 16px));
    max-height:min(76vh,660px);display:none;flex-direction:column;z-index:2147483646;
    background:#0d0d12;border:1px solid #2a2a34;border-radius:10px;overflow:hidden;
    box-shadow:0 12px 40px rgba(0,0,0,.6);color:#c7c7cf;
    font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace}
  #cx-panel.open{display:flex}
  #cx-panel .cx-head{display:flex;justify-content:space-between;align-items:flex-start;
    padding:12px 14px 10px;border-bottom:1px solid #20202a}
  #cx-panel .cx-title{color:#e6e6ee;font-weight:600}
  #cx-panel .cx-sub{color:#6f6f7a;margin-top:2px}
  #cx-panel .cx-sub b{color:#8fd0b6;font-weight:600}
  #cx-panel .cx-close{background:none;border:none;color:#777;cursor:pointer;font-size:14px;padding:2px 4px}
  #cx-panel .cx-close:hover{color:#ccc}
  #cx-panel .cx-tabs{display:flex;gap:4px;padding:8px 10px 0;border-bottom:1px solid #20202a}
  #cx-panel .cx-tab{background:none;border:none;border-bottom:2px solid transparent;color:#777;
    cursor:pointer;padding:6px 10px;font:inherit}
  #cx-panel .cx-tab.on{color:#e6e6ee;border-bottom-color:#8fd0b6}
  #cx-panel .cx-rtabs{display:flex;gap:5px;flex-wrap:wrap;padding:9px 12px 2px}
  #cx-panel .cx-rtab{background:#13131b;border:1px solid #20202a;border-radius:5px;color:#8a8a96;
    cursor:pointer;padding:4px 9px;font:11px/1 ui-monospace,Menlo,monospace;letter-spacing:.05em}
  #cx-panel .cx-rtab.on{background:#23233a;color:#e6e6ee;border-color:#3a3a52}
  #cx-panel .cx-rtab:hover:not(.on){color:#c7c7cf}
  #cx-panel .cx-status{padding:10px 14px;color:#9a9aa6;border-bottom:1px solid #20202a}
  #cx-panel .cx-scroll{overflow:auto;padding:8px 14px 14px}
  #cx-panel .cx-sec{color:#7a7a86;text-transform:uppercase;letter-spacing:.08em;font-size:10px;margin:12px 0 6px}
  #cx-panel .cx-ms{margin:0 0 12px;padding:8px 10px;background:#111119;border:1px solid #1e1e28;border-radius:7px}
  #cx-panel .cx-ms-h{display:flex;align-items:baseline;gap:8px;margin-bottom:4px}
  #cx-panel .cx-tok{color:#8fd0b6;font-size:11px}
  #cx-panel .cx-ms-t{color:#e0e0e8;font-weight:600;flex:1}
  #cx-panel .cx-date{color:#5a5a64;font-size:10px}
  #cx-panel ul{margin:0;padding-left:16px}
  #cx-panel .cx-ms li{margin:2px 0;color:#a7a7b2}
  #cx-panel .cx-rm{margin:0 0 10px}
  #cx-panel .cx-rm-h{color:#c9c9d3;font-weight:600;margin-bottom:3px}
  #cx-panel .cx-note{color:#6f6f7a;font-weight:400}
  #cx-panel .cx-rm ul{list-style:none;padding-left:2px}
  #cx-panel .cx-rm li{margin:2px 0;color:#9a9aa6}
  #cx-panel .cx-rm li.done{color:#8fd0b6}
  #cx-panel .cx-game{margin:0 0 14px;padding:10px 12px;background:#111119;border:1px solid #1e1e28;border-radius:7px}
  #cx-panel .cx-game-h{display:flex;align-items:center;gap:8px;margin-bottom:6px}
  #cx-panel .cx-game-n{color:#e6e6ee;font-weight:700;letter-spacing:.06em;flex:1}
  #cx-panel .cx-badge{font-size:9px;text-transform:uppercase;letter-spacing:.08em;padding:2px 6px;border-radius:4px;
    background:#20202a;color:#8a8a96}
  #cx-panel .cx-phase1{background:#20321f;color:#8fd0a0}
  #cx-panel .cx-playable{background:#20321f;color:#8fd0a0}
  #cx-panel .cx-fantasy{color:#9a9aa6;font-style:italic;margin-bottom:8px}
  #cx-panel .cx-lbl{color:#7a7a86;text-transform:uppercase;letter-spacing:.06em;font-size:9px;margin:8px 0 3px}
  #cx-panel .cx-game li{margin:2px 0;color:#a7a7b2}
  #cx-panel .cx-fail li{color:#c9a0a0}
  #cx-panel .cx-gnote{margin-top:8px;padding-top:7px;border-top:1px solid #20202a;color:#6f6f7a}
  #cx-panel .cx-glossary{display:flex;flex-direction:column;gap:6px;margin-bottom:4px}
  #cx-panel .cx-grow{display:flex;align-items:center;gap:10px;padding:4px 0}
  #cx-panel .cx-gcanvas{flex:0 0 40px;height:40px;border-radius:5px;background:#0a0a10;display:block}
  #cx-panel .cx-ginfo{display:flex;flex-direction:column;gap:2px;min-width:0}
  #cx-panel .cx-gname{color:#e0e0e8;font-weight:700;font-size:11px}
  #cx-panel .cx-gmeaning{color:#8a8a96;font-size:10px;line-height:1.4}
  #cx-panel .cx-gtag{font-size:8px;text-transform:uppercase;letter-spacing:.08em;padding:1px 5px;border-radius:3px;
    background:#20202a;color:#8a8a96;align-self:flex-start}
  #cx-panel .cx-gtag-good{background:#1a2e20;color:#6fe0b8}
  #cx-panel .cx-gtag-bad{background:#2e1a1a;color:#d0605a}
  #cx-panel .cx-gtag-tool{background:#2c2414;color:#e0b070}
`;function Bx(){const n=document.createElement("style");n.textContent=Ox,document.head.appendChild(n);const t=document.createElement("div");t.id="cx-panel",document.body.appendChild(t);let e="log",i=ss[0].name;const s=()=>{t.innerHTML=Nx(e,i),t.querySelector(".cx-close")?.addEventListener("click",()=>r(!1)),t.querySelectorAll(".cx-tab").forEach(l=>{l.addEventListener("click",()=>{e=l.dataset.tab??"log",s()})}),t.querySelectorAll(".cx-rtab").forEach(l=>{l.addEventListener("click",()=>{i=l.dataset.rulesGame??i,s()})}),e==="rules"&&Fx(t)},r=l=>{l&&s(),t.classList.toggle("open",l)};let o=0;const a=()=>{const l=document.getElementById("cb-badge");if(l){l.title="click for dev log · token copied too",l.addEventListener("click",()=>r(!t.classList.contains("open")));return}o++<100&&setTimeout(a,50)};return a(),window.addEventListener("keydown",l=>{l.key==="Escape"&&r(!1)}),{openRules(l){e="rules",ss.some(c=>c.name===l)&&(i=l),r(!0)}}}const kx=[{game:"constellation-orbs",slot:"01",name:"CONSTELLATION",desc:"Orbit a cloud of thinking-orbs until one hidden angle snaps the scatter into a glyph, then extract it before the sweep.",accent:"#6fe0b8",tint:[.44,.88,.72],motif:"globe"},{game:"trace",slot:"02",name:"TRACE",desc:"Capture a path across the network to a registry, then race your own tracer back to the entry before it traces you home.",accent:"#e0b070",tint:[.95,.72,.4],motif:"network"},{game:"circuit-duel-2",slot:"03",name:"HDT",desc:"Read an unpowered circuit, take the better side, and fire pulses so your light claims 7 of 12 registers — dead ends, short-circuits and color-traps waste a pulse.",accent:"#8aa0ff",tint:[.58,.68,1],motif:"tube"}];function zx(n,t){const e="ui-monospace,SFMono-Regular,Menlo,monospace",i=window.matchMedia("(prefers-reduced-motion: reduce)").matches,s=Math.min(2,window.devicePixelRatio||1),r=document.createElement("div");r.style.cssText="position:fixed;inset:0;z-index:2147483644;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.4rem;padding:2rem;background:#07070c;overflow:auto";const o=document.createElement("div");o.style.cssText="text-align:center",o.innerHTML=`<div style="font:11px ${e};letter-spacing:.3em;text-transform:uppercase;color:#5a5c6a">dotted-halftone intrusion puzzles</div><h1 style="margin:.7rem 0 0;font:400 24px/1.2 ${e};letter-spacing:.16em;color:#dfe1ea">HACKING&nbsp;MINI-GAMES</h1>`,r.appendChild(o);const a=document.createElement("div");a.style.cssText="display:flex;gap:20px;flex-wrap:wrap;justify-content:center;max-width:600px",r.appendChild(a);const l=document.createElement("div");l.style.cssText=`font:11px ${e};letter-spacing:.05em;color:#3f414d;text-align:center`,l.textContent="press 1–3 anytime · more games soon",r.appendChild(l);const c=[];for(const E of kx){const T=document.createElement("div");T.setAttribute("role","button"),T.setAttribute("tabindex","0"),T.setAttribute("aria-label",`play ${E.name}`),T.style.cssText="box-sizing:border-box;cursor:pointer;width:258px;background:#0e0f16;border:1px solid #1c1d29;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;transition:border-color .18s,transform .18s;-webkit-tap-highlight-color:transparent;outline:none";const M=document.createElement("div");M.style.cssText="position:relative;height:132px;background:#090a10;display:flex;align-items:center;justify-content:center";const N=document.createElement("canvas");N.style.cssText="display:block",N.width=Math.round(258*s),N.height=Math.round(132*s),N.style.width="258px",N.style.height="132px",M.appendChild(N);const b=document.createElement("div");b.textContent=E.slot,b.style.cssText=`position:absolute;top:8px;left:12px;font:300 26px ${e};letter-spacing:.05em;color:${E.accent};opacity:.55`,M.appendChild(b),T.appendChild(M);const C=document.createElement("div");C.style.cssText="padding:.9rem 1.1rem 1.1rem;text-align:left",C.innerHTML=`<div style="font:500 15px ${e};letter-spacing:.14em;color:#e6e8f0">${E.name}</div><div style="margin-top:.5rem;font:12px/1.6 ${e};color:#71737f">${E.desc}</div>`;const L=document.createElement("div");L.style.cssText="margin-top:.9rem;display:flex;align-items:center;gap:1rem",L.innerHTML=`<span style="font:11px ${e};letter-spacing:.14em;color:${E.accent}">PLAY →</span>`;const y=document.createElement("button");y.type="button",y.textContent="Rules",y.style.cssText=`all:unset;cursor:pointer;font:11px ${e};letter-spacing:.1em;color:#6a6c7a;border-bottom:1px solid transparent`,y.addEventListener("mouseenter",()=>y.style.color="#c7c9d4"),y.addEventListener("mouseleave",()=>y.style.color="#6a6c7a"),y.addEventListener("click",v=>{v.stopPropagation(),t(E.name)}),L.appendChild(y),C.appendChild(L),T.appendChild(C),T.addEventListener("mouseenter",()=>{T.style.borderColor=E.accent,T.style.transform="translateY(-2px)"}),T.addEventListener("mouseleave",()=>{T.style.borderColor="#1c1d29",T.style.transform="none"}),T.addEventListener("focus",()=>T.style.borderColor=E.accent),T.addEventListener("blur",()=>T.style.borderColor="#1c1d29"),T.addEventListener("click",()=>n(E.game)),T.addEventListener("keydown",v=>{(v.key==="Enter"||v.key===" ")&&(v.preventDefault(),n(E.game))}),a.appendChild(T),c.push({canvas:N,ctx:N.getContext("2d"),spec:E})}document.body.appendChild(r);function h(E,T,M,N,b){const C=T/2,L=M/2,y=T*.78,v=34,P=G=>Math.sin(G*3.1+N*.6)*9+Math.sin(G*6.7-N*.9)*4;for(let G=0;G<=v;G++){const V=G/v,J=C-y/2+V*y,tt=L+P(V),Q=60;E.fillStyle=`rgba(${Math.round(Q*b[0])},${Math.round(Q*b[1])},${Math.round(Q*b[2])},0.9)`,E.beginPath(),E.arc(J,tt,1.5,0,Math.PI*2),E.fill()}for(let G=0;G<3;G++){const V=(N*.13+G/3)%1;for(let J=0;J<6;J++){const tt=V-J*.03;if(tt<0||tt>1)continue;const Q=C-y/2+tt*y,W=L+P(tt),$=(1-J/6)*.95;E.fillStyle=`rgba(${Math.round(210*b[0]+45)},${Math.round(210*b[1]+45)},${Math.round(210*b[2]+45)},${$})`,E.beginPath(),E.arc(Q,W,2.4-J*.25,0,Math.PI*2),E.fill()}}}function u(E,T,M,N,b){const C=T/2,L=M/2,y=7,v=[];for(let rt=0;rt<y;rt++){const vt=rt/y*Math.PI*2+.6,gt=34+10*Math.sin(rt*2.3);v.push([C+Math.cos(vt)*gt*1.6,L+Math.sin(vt)*gt])}const P=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[0,3],[2,5]],G=rt=>`rgba(${Math.round(210*b[0]+30)},${Math.round(210*b[1]+30)},${Math.round(210*b[2]+30)},${rt})`;for(const[rt,vt]of P){const[gt,nt]=v[rt],[Ht,et]=v[vt],lt=8;for(let pt=1;pt<lt;pt++){const ft=pt/lt;E.fillStyle=G(.28),E.beginPath(),E.arc(gt+(Ht-gt)*ft,nt+(et-nt)*ft,1,0,Math.PI*2),E.fill()}}const V=[v[0],v[3],v[4],v[5]],J=N*.5%(V.length-1),tt=Math.floor(J),Q=J-tt,W=V[tt],$=V[tt+1];E.fillStyle=G(1),E.beginPath(),E.arc(W[0]+($[0]-W[0])*Q,W[1]+($[1]-W[1])*Q,3,0,Math.PI*2),E.fill();for(let rt=0;rt<y;rt++){const vt=rt<=tt;E.fillStyle=G(vt?.9:.5),E.beginPath(),E.arc(v[rt][0],v[rt][1],vt?2.6:2,0,Math.PI*2),E.fill()}}function d(E,T){E.ctx.setTransform(s,0,0,s,0,0),E.ctx.clearRect(0,0,258,132),E.spec.motif==="globe"?jc(E.ctx,"searching",258/2,132/2,42,T*1.4,E.spec.tint,1):E.spec.motif==="network"?u(E.ctx,258,132,T,E.spec.tint):h(E.ctx,258,132,T,E.spec.tint)}let m=0,g=!1;function x(){const E=performance.now()/1e3;for(const T of c)d(T,E);g&&(m=requestAnimationFrame(x))}function p(){if(!g){if(i){for(const E of c)d(E,.8);return}g=!0,m=requestAnimationFrame(x)}}function f(){g=!1,cancelAnimationFrame(m)}return{show(){r.style.display="flex",p()},hide(){r.style.display="none",f()},dispose(){f(),r.remove()}}}const Hx=Bx(),to={difficulty:2,skill:2},Mh=new Set(["circuit-duel-2"]);let kn=0;const Gx=1,Vx=5,Jn={"constellation-orbs":1,trace:1,"circuit-duel-2":1},rs=document.createElement("div");rs.style.cssText="position:fixed;top:38%;left:50%;transform:translateX(-50%);z-index:2147483646;pointer-events:none;font:600 15px ui-monospace,Menlo,monospace;letter-spacing:.14em;padding:8px 16px;border-radius:8px;background:rgba(10,11,18,.72);border:1px solid #2c2c38;opacity:0;transition:opacity .35s;white-space:nowrap";document.body.appendChild(rs);let ic=0;function Wx(n,t){const e=t==="up";rs.innerHTML=`<span style="color:${e?"#8fd0b6":"#e0b070"}">LEVEL ${n} ${e?"▲ harder":"▼ easier"}</span>`,rs.style.opacity="1",clearTimeout(ic),ic=window.setTimeout(()=>rs.style.opacity="0",1600)}function yh(n){const t=document.createElement("div");t.style.cssText="position:fixed;top:12px;left:12px;right:12px;padding:10px 14px;z-index:2147483645;background:#2a0f12;border:1px solid #5a2a2f;border-radius:8px;color:#e6a6a6;font:12px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap",t.textContent=`game failed to start:
${n instanceof Error?n.stack??n.message:String(n)}`,document.body.appendChild(t)}const cs=["constellation-orbs","trace","circuit-duel-2"],or="./";let Ze=null,rn="constellation-orbs",es=0;function Xx(){document.getElementById("scene")?.remove();const n=document.createElement("canvas");return n.id="scene",document.getElementById("app").appendChild(n),n}function ua(n){Ze?.dispose(),es=0,rn=n,fa.hide(),da(!0),history.replaceState(null,"",`${or}${cs.indexOf(n)+1}`);const t=Xx(),e=i=>({spec:Di[kn],seed:i,skill:to.skill});try{Ze=n==="circuit-duel-2"?yx(t,e("hdt")):n==="trace"?t_(t,{...to,difficulty:Jn[n],seed:"net"}):Sg(t,{...to,difficulty:Jn[n],seed:"orbs"}),window.__cx=Ze}catch(i){console.error(i),yh(i)}Ko()}function Sh(){if(Ze)try{if(Mh.has(rn)){const n=Ze.game();if(n.phase==="DEADLOCK"){Ze.regenerate(Di[kn],n.board.seed),Ko();return}es+=1;let t="";n.phase==="WON"?(kn<Di.length-1&&kn++,t="up"):n.phase==="LOST"&&n.result&&n.result.p<n.result.e&&(kn=0,t="down"),Ze.regenerate(Di[kn],`${rn}-${es}`),Ko(t)}else{const n=Ze,t=n.outcome();let e="";const i=Jn[rn];t==="won"&&i<Vx?(Jn[rn]=i+1,e="up"):t==="lost"&&i>Gx&&(Jn[rn]=i-1,e="down"),es+=1,n.regenerate(Jn[rn],`${rn}-${es}`),e&&Wx(Jn[rn],e)}}catch(n){console.error(n),yh(n)}}const Vi=document.createElement("button");Vi.textContent="⟳";Vi.setAttribute("aria-label","reset / reseed");Vi.style.cssText="position:fixed;top:calc(8px + env(safe-area-inset-top));right:calc(10px + env(safe-area-inset-right));z-index:2147483646;width:44px;height:44px;border-radius:50%;border:1px solid #2c2c38;background:rgba(12,13,20,.6);color:#9a9aa6;font:20px/44px ui-monospace,Menlo,monospace;text-align:center;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent;touch-action:manipulation";Vi.addEventListener("click",Sh);document.body.appendChild(Vi);const Wi=document.createElement("button");Wi.textContent="⌂";Wi.setAttribute("aria-label","back to game picker");Wi.style.cssText="position:fixed;top:calc(8px + env(safe-area-inset-top));right:calc(60px + env(safe-area-inset-right));z-index:2147483646;width:44px;height:44px;border-radius:50%;border:1px solid #2c2c38;background:rgba(12,13,20,.6);color:#9a9aa6;font:18px/44px ui-monospace,Menlo,monospace;text-align:center;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent;touch-action:manipulation";Wi.addEventListener("click",Eh);document.body.appendChild(Wi);function da(n){Vi.style.display=n?"block":"none",Wi.style.display=n?"block":"none"}function Eh(){Ze?.dispose(),Ze=null,window.__cx=null,da(!1),Ii.style.display="none",history.replaceState(null,"",or),fa.show()}const Ii=document.createElement("div");Ii.style.cssText="position:fixed;top:calc(9px + env(safe-area-inset-top));left:calc(12px + env(safe-area-inset-left));z-index:2147483646;pointer-events:none;font:11px/1.5 ui-monospace,Menlo,monospace;color:#8a8a96";document.body.appendChild(Ii);function Ko(n=""){if(!Mh.has(rn)){Ii.style.display="none";return}Ii.style.display="block";const t=Di[kn],e=n==="up"?' <span style="color:#8fd0b6">▲ climbed</span>':n==="down"?' <span style="color:#d0605a">▼ reset</span>':"";Ii.innerHTML=`<span style="color:#c2c2ce">LADDER ${kn+1}/${Di.length}</span>${e}<br>you c${t.attacker} · host c${t.defender}<br><span style="color:#5a5a64">win → climb · lose → reset</span>`}const fa=zx(n=>ua(n),n=>Hx.openRules(n)),$x=location.pathname.startsWith(or)?location.pathname.slice(or.length):location.pathname.replace(/^\//,""),eo=parseInt($x.replace(/\D/g,""),10);eo>=1&&eo<=cs.length?ua(cs[eo-1]):(da(!1),fa.show());window.addEventListener("keydown",n=>{const t=parseInt(n.key,10);t>=1&&t<=cs.length?ua(cs[t-1]):n.key==="Escape"?Eh():(n.key==="r"||n.key==="R")&&Ze&&Sh()});
//# sourceMappingURL=index-CzKnWn5n.js.map
