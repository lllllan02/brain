import {BufferAttribute, type BufferGeometry, type LineBasicMaterial} from 'three';

export function crystalLinkAttributes(geometry: BufferGeometry, count: number, segments: number): void {
  const along = new Float32Array(count * segments * 2);
  const gain = new Float32Array(along.length);
  for (let i = 0; i < count; i++) {
    // Keep a narrow brightness range; no isolated white-hot edges.
    const seed = ((Math.imul(i + 1, 2654435761) >>> 0) % 1000) / 1000;
    for (let v = 0; v < segments * 2; v++) {
      const offset = i * segments * 2 + v;
      along[offset] = (Math.floor(v / 2) + v % 2) / segments;
      gain[offset] = .55 + seed * .3;
    }
  }
  geometry.setAttribute('aCrystalAlong', new BufferAttribute(along, 1));
  geometry.setAttribute('aCrystalGain', new BufferAttribute(gain, 1));
  geometry.setAttribute('aCrystalSpan', new BufferAttribute(new Float32Array(along.length), 1));
}

export function patchCrystalLinks(material: LineBasicMaterial, uniforms: {
  uCrystalStrength: {value:number}; uCrystalCenter: {value:number}; uCrystalRadius: {value:number};
}): void {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `attribute float aCrystalAlong;
attribute float aCrystalGain;
attribute float aCrystalSpan;
varying float vCrystalAlong;
varying float vCrystalGain;
varying float vCrystalDepth;
varying float vCrystalSpan;
${shader.vertexShader}`.replace('#include <project_vertex>', `#include <project_vertex>
vCrystalAlong = aCrystalAlong;
vCrystalGain = aCrystalGain;
vCrystalSpan = aCrystalSpan;
vCrystalDepth = -mvPosition.z;`);
    shader.fragmentShader = `uniform float uCrystalStrength;
uniform float uCrystalCenter;
uniform float uCrystalRadius;
varying float vCrystalAlong;
varying float vCrystalGain;
varying float vCrystalDepth;
varying float vCrystalSpan;
${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>
float front = 1.0 - smoothstep(uCrystalCenter - uCrystalRadius, uCrystalCenter + uCrystalRadius, vCrystalDepth);
float strand = 0.5 + 0.5 * sin(vCrystalAlong * 3.14159265);
float spanFade = mix(1.0, 0.12, smoothstep(0.65, 1.6, vCrystalSpan / uCrystalRadius));
float crystal = mix(0.18, 1.25, front * front) * strand * vCrystalGain * spanFade;
diffuseColor.a *= mix(1.0, crystal, uCrystalStrength);
`);
  };
  material.customProgramCacheKey = () => 'soft-depth-links-v3';
}
