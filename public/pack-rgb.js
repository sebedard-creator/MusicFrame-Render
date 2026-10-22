// Drop only the unused opaque alpha byte. RGB samples are copied bit-for-bit.
export function packRGB(rgba,rgb){
 const input=new Uint32Array(rgba.buffer,rgba.byteOffset,rgba.byteLength/4),output=new Uint32Array(rgb.buffer,rgb.byteOffset,rgb.byteLength/4);
 for(let i=0,j=0;i<input.length;i+=4,j+=3){const a=input[i],b=input[i+1],c=input[i+2],d=input[i+3];output[j]=(a&0xffffff)|((b&255)<<24);output[j+1]=((b>>>8)&65535)|((c&65535)<<16);output[j+2]=(c>>>16&255)|(d<<8);}
 return rgb;
}
