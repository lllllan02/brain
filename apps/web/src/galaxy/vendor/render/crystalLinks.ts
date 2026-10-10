import {BufferAttribute, type BufferGeometry, type LineBasicMaterial} from 'three';

// 首页引用分主次：同一分类内部的引用是骨架，跨分类引用压成远处的细丝，
// 核心文档靠星点大小识别；其连线按密度收敛，避免中心叠成亮团。
export function linkImportance(
  links: readonly ({source: number; target: number} | undefined)[],
  nodes: readonly ({folderTop?: string; degree?: number} | undefined)[],
): Float32Array {
  const degrees = nodes.map(node => node?.degree ?? 0).sort((a, b) => a - b);
  const rank = (degree: number) => degrees.length > 1 ? degrees.findLastIndex(d => d <= degree) / (degrees.length - 1) : .5;
  return Float32Array.from(links, link => {
    if (!link) return 0;
    const a = nodes[link.source], b = nodes[link.target];
    const hub = Math.max(rank(a?.degree ?? 0), rank(b?.degree ?? 0));
    const density = 1 / Math.sqrt(1 + Math.max(a?.degree ?? 0, b?.degree ?? 0) * .08);
    return (a?.folderTop && a.folderTop === b?.folderTop ? .72 + hub * .2 : .16 + hub * .08) * density;
  });
}

export function crystalLinkAttributes(geometry: BufferGeometry, count: number, segments: number, importance?: Float32Array): void {
  const along = new Float32Array(count * segments * 2);
  const gain = new Float32Array(along.length);
  for (let i = 0; i < count; i++) {
    // Keep a narrow brightness range; no isolated white-hot edges.
    const seed = ((Math.imul(i + 1, 2654435761) >>> 0) % 1000) / 1000;
    for (let v = 0; v < segments * 2; v++) {
      const offset = i * segments * 2 + v;
      along[offset] = (Math.floor(v / 2) + v % 2) / segments;
      gain[offset] = importance ? importance[i] * (.9 + seed * .2) : .55 + seed * .3;
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
