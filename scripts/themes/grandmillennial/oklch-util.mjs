const lin=v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;
const gam=v=>v<=0.0031308?12.92*v:1.055*v**(1/2.4)-0.055;
export function toOk(hex){const n=parseInt(hex.slice(1),16);const [r,g,b]=[(n>>16)&255,(n>>8)&255,n&255].map(v=>lin(v/255));
const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
const L=.2104542553*l+.793617785*m-.0040720468*s,A=1.9779984951*l-2.428592205*m+.4505937099*s,B=.0259040371*l+.7827717662*m-.808675766*s;return {L,C:Math.hypot(A,B),h:Math.atan2(B,A)*180/Math.PI}}
export function fromOk({L,C,h}){const A=C*Math.cos(h*Math.PI/180),B=C*Math.sin(h*Math.PI/180);
const l=(L+.3963377774*A+.2158037573*B)**3,m=(L-.1055613458*A-.0638541728*B)**3,s=(L-.0894841775*A-1.291485548*B)**3;
const r=4.0767416621*l-3.3077115913*m+.2309699292*s,g=-1.2684380046*l+2.6097574011*m-.3413193965*s,b=-.0041960863*l-.7034186147*m+1.707614701*s;
return '#'+[r,g,b].map(v=>Math.round(Math.min(1,Math.max(0,gam(v)))*255).toString(16).padStart(2,'0')).join('')}
export const lum=hex=>{const n=parseInt(hex.slice(1),16);const [r,g,b]=[(n>>16)&255,(n>>8)&255,n&255].map(v=>lin(v/255));return .2126*r+.7152*g+.0722*b};
export const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
