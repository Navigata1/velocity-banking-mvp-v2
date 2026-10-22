/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');

const minimumHeight = Object.freeze({car:0.38,house:0.57,land:0.58,creditCard:0.72,studentLoan:0.50,
  medical:0.58,personal:0.56,recreation:0.71,custom:0.70,vault:0.58});

function artRegion(image, region) {
  const bounds=region ?? {left:0,top:0,right:image.width,bottom:image.height};
  const {left,top,right,bottom}=bounds;
  assert.ok([left,top,right,bottom].every(Number.isInteger) && left>=0 && top>=0 &&
    right<=image.width && bottom<=image.height && right>left && bottom>top,'invalid art region');
  return bounds;
}

function visibleBounds(image, region) {
  const art=artRegion(image,region);
  let left=art.right,top=art.bottom,right=art.left,bottom=art.top,foreground=0;
  for(let y=art.top;y<art.bottom;y++) for(let x=art.left;x<art.right;x++) {
    const i=(y*image.width+x)*image.bytesPerPixel;
    const delta=Math.abs(image.pixels[i]-image.pixels[0])+Math.abs(image.pixels[i+1]-image.pixels[1])+Math.abs(image.pixels[i+2]-image.pixels[2]);
    if(delta<=40) continue;
    foreground++; left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);
  }
  assert.ok(foreground>(art.right-art.left)*(art.bottom-art.top)*0.02,'insufficient visible geometry');
  assert.ok(left>art.left+1 && top>art.top+1 && right<art.right-1 && bottom<art.bottom-1,'model touches canvas edge');
  return {left,right,top,bottom};
}

function presentationBounds(image,id,region) {
  assert.ok(Object.hasOwn(minimumHeight,id),'unknown hero presentation domain');
  const art=artRegion(image,region),bounds=visibleBounds(image,art),height=(bounds.bottom-bounds.top)/(art.bottom-art.top);
  assert.ok(height>=minimumHeight[id],`${id} model height ${(height*100).toFixed(1)}% is below presentation minimum ${minimumHeight[id]*100}%`);
  console.log(`PASS ${id} presentation height ${(height*100).toFixed(1)}%`);
  return bounds;
}

module.exports={visibleBounds,presentationBounds,minimumHeight};
