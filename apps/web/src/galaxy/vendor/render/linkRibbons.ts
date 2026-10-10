import {READING_FLOW, READING_INK} from '../../../motion/reading-flow.js';
import {
	type BufferAttribute,
	BufferAttribute as Attribute,
	DoubleSide,
	Color,
	type BufferGeometry,
	InstancedBufferGeometry,
	InstancedInterleavedBuffer,
	InterleavedBufferAttribute,
	Mesh,
	NormalBlending,
	ShaderMaterial,
	Vector2,
} from 'three';

// 引用线的屏幕空间光带：原生线宽固定 1px，远近一样细，空间显得扁平。
// 光带复用 LineSegments 的逐段顶点数据（每段两个端点），每段画成一个四边形：
// 近处更宽更亮、远处收细变淡，横截面柔和衰减；入场动画期间仍由原线层绘制。

const VERTEX = /* glsl */ `
attribute vec3 aStart;
attribute vec3 aEnd;
attribute vec4 aColorStart;
attribute vec4 aColorEnd;
attribute float aAlongStart;
attribute float aAlongEnd;
attribute float aExtraStart;
attribute float aExtraEnd;
attribute float aSpan;
uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uWidth;
uniform float uMinWidth;
uniform float uMaxWidth;
uniform float uDepthCenter;
uniform float uDepthRadius;
varying vec4 vColor;
varying float vAlong;
varying float vExtra;
varying float vSide;
varying float vWidth;
varying float vFront;
varying float vSpan;

void main() {
	vec4 mvA = modelViewMatrix * vec4(aStart, 1.0);
	vec4 mvB = modelViewMatrix * vec4(aEnd, 1.0);
	// 相机穿入星团时，越过近裁剪面的线段直接丢弃，避免投影翻转成满屏长条。
	if (mvA.z > -0.1 || mvB.z > -0.1) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
	vec4 clipA = projectionMatrix * mvA;
	vec4 clipB = projectionMatrix * mvB;
	vec2 screenA = clipA.xy / clipA.w * uResolution;
	vec2 screenB = clipB.xy / clipB.w * uResolution;
	vec2 delta = screenB - screenA;
	vec2 dir = length(delta) > 0.0001 ? normalize(delta) : vec2(1.0, 0.0);
	vec2 normal = vec2(-dir.y, dir.x);
	float t = position.x;
	vec4 clip = mix(clipA, clipB, t);
	float depth = mix(-mvA.z, -mvB.z, t);
	// 远近主要由明暗表达，宽度仅缓慢变化，阅读拉近时仍保持细线。
	float perspective = sqrt(max(uDepthCenter, 1.0) / max(depth, 0.001));
	float width = clamp(uWidth * perspective, uMinWidth, uMaxWidth) * uPixelRatio;
	float extent = width * 0.5 + 1.0; // 多留 1px 做抗锯齿
#ifdef READING_BEAM
	extent += 3.0 * uPixelRatio;
#endif
	clip.xy += normal * position.y * extent / uResolution * 2.0 * clip.w;
	gl_Position = clip;
	vColor = mix(aColorStart, aColorEnd, t);
	vAlong = mix(aAlongStart, aAlongEnd, t);
	vExtra = mix(aExtraStart, aExtraEnd, t);
	vSide = position.y * extent;
	vWidth = width;
	vFront = 1.0 - smoothstep(uDepthCenter - uDepthRadius, uDepthCenter + uDepthRadius, depth);
	vSpan = aSpan / max(uDepthRadius, 1.0);
}
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uOpacity;
uniform float uAmbientTime;
uniform float uFlowStrength;
uniform float uDepthStrength;
uniform float uFlowCount;
uniform float uReadingTime;
uniform float uReadingActive;
uniform vec3 uReadingInk;
uniform vec3 uReadingCore;
uniform vec3 uReadingAura;
uniform float uPixelRatio;
varying vec4 vColor;
varying float vAlong;
varying float vExtra;
varying float vSide;
varying float vWidth;
varying float vFront;
varying float vSpan;

void main() {
	float d = abs(vSide);
	float halfWidth = vWidth * 0.5;
	// 宽于 1px 时按覆盖率抗锯齿；更细时用透明度模拟亚像素线宽。
	float coverage = clamp(halfWidth + 0.5 - d, 0.0, 1.0) * min(vWidth, 1.0);
	float soft = exp(-d * d / max(halfWidth * halfWidth * 1.6, 0.25));
	float profile = max(coverage, soft * 0.55);
	vec3 color = vColor.rgb;
	float alpha = vColor.a * uOpacity * profile;
`;

/** 普通引用：两端柔化，前侧清晰、后侧渐暗并偏向冷暗色，长距离连线减弱。 */
const BASE_FRAGMENT = FRAGMENT_HEAD + /* glsl */ `
	float strand = mix(1.0, 0.45 + 0.55 * sin(vAlong * 3.14159265), uDepthStrength);
	float depthCue = mix(1.0, mix(0.18, 1.05, vFront * vFront), uDepthStrength);
	float spanFade = mix(1.0, 0.12, smoothstep(0.5, 1.4, vSpan) * uDepthStrength);
	alpha *= strand * depthCue * spanFade * mix(1.0, vExtra, uDepthStrength);
	color = mix(color * vec3(0.62, 0.70, 0.86), color, mix(1.0, vFront, uDepthStrength));
	if (alpha < 0.002) discard;
	gl_FragColor = vec4(color, alpha);
	#include <colorspace_fragment>
}
`;

/** Reading flow converges at the selected star before the SVG fan departs. */
const FLOW_FRAGMENT = FRAGMENT_HEAD + /* glsl */ `
	float taper = smoothstep(0.0, 0.08, vAlong) * (1.0 - smoothstep(0.94, 1.0, vAlong));
	float cycle = floor(uReadingTime / ${READING_FLOW.period.toFixed(1)});
	float phase = mod(uReadingTime, ${READING_FLOW.period.toFixed(1)}) / ${READING_FLOW.travel.toFixed(1)};
	float p = clamp(phase, 0.0, 1.0);
	float slot = mod(vExtra - cycle * ${READING_FLOW.batch.toFixed(1)}, max(uFlowCount, 1.0));
	float enabled = step(0.0, vExtra) * (1.0 - step(${READING_FLOW.batch.toFixed(1)}, slot));
	float tail = 0.1 + 0.3 * p * p;
	float head = (1.0 + tail) * p * p;
	float beam = smoothstep(head - tail, head - tail + 0.07, vAlong)
		* (1.0 - smoothstep(head - 0.035, head, vAlong));
	float envelope = 0.65 * smoothstep(0.0, 0.18, p) * (1.0 - smoothstep(0.88, 1.0, p));
	float glow = exp(-d * d / (${((READING_INK.auraWidth / 3.5) ** 2).toFixed(4)} * uPixelRatio * uPixelRatio));
	float traffic = beam * envelope * enabled * uFlowStrength;
	float context = mix(1.0, 0.16, uReadingActive * (1.0 - step(0.0, vExtra)));
	float base = alpha * ${(READING_INK.opacity / .85).toFixed(6)} * context;
	float core = exp(-d * d / (${((READING_INK.coreWidth * .5) ** 2 * 1.6).toFixed(4)} * uPixelRatio * uPixelRatio));
	float light = (core * 0.9 + glow * 0.28) * traffic * vColor.a * uOpacity;
	alpha = (base + light) * mix(0.2, 1.0, taper);
	vec3 beamColor = mix(uReadingAura, uReadingCore, core);
	color = mix(uReadingInk, beamColor, light / max(base + light, 0.001));
	if (alpha < 0.002) discard;
	gl_FragColor = vec4(color, alpha);
	#include <colorspace_fragment>
}
`;

export interface RibbonUniforms {
	uResolution: { value: Vector2 };
	uPixelRatio: { value: number };
	uDepthCenter: { value: number };
	uDepthRadius: { value: number };
	uDepthStrength: { value: number };
	uAmbientTime: { value: number };
	uFlowStrength: { value: number };
	uFlowCount: { value: number };
	uReadingTime: { value: number };
	uReadingActive: { value: number };
}

export function createRibbonUniforms(): RibbonUniforms {
	return {
		uResolution: { value: new Vector2(1, 1) },
		uPixelRatio: { value: 1 },
		uDepthCenter: { value: 1 },
		uDepthRadius: { value: 100 },
		uDepthStrength: { value: 0 },
		uAmbientTime: { value: 0 },
		uFlowStrength: { value: 1 },
		uFlowCount: { value: 0 },
		uReadingTime: { value: 0 },
		uReadingActive: { value: 0 },
	};
}

export interface RibbonOptions {
	/** 逐顶点 0..1 的沿线位置 */
	along: string;
	/** 逐顶点附加量：普通层为亮度增益，高亮层为光点相位 */
	extra: string;
	/** 逐顶点连线跨度 */
	span: string;
	flow: boolean;
	/** CSS 像素：星团中心深度处的宽度与上下限 */
	width: number;
	minWidth: number;
	maxWidth: number;
}

/** 与 LineSegments 共享同一份 Float32Array；源属性更新后调用 sync() 同步到 GPU。 */
export class LinkRibbons {
	readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
	private readonly buffers: { source: BufferAttribute; target: InstancedInterleavedBuffer; version: number }[] = [];

	constructor(source: BufferGeometry, uniforms: RibbonUniforms, options: RibbonOptions) {
		const geometry = new InstancedBufferGeometry();
		geometry.setAttribute('position', new Attribute(new Float32Array([0, -1, 0, 0, 1, 0, 1, 1, 0, 1, -1, 0]), 3));
		geometry.setIndex([0, 2, 1, 0, 3, 2]);
		const pair = (name: string, size: number, start: string, end: string) => {
			const attribute = source.getAttribute(name) as BufferAttribute;
			const buffer = new InstancedInterleavedBuffer(attribute.array as Float32Array, size * 2, 1);
			geometry.setAttribute(start, new InterleavedBufferAttribute(buffer, size, 0));
			geometry.setAttribute(end, new InterleavedBufferAttribute(buffer, size, size));
			this.buffers.push({ source: attribute, target: buffer, version: -1 });
			return buffer;
		};
		pair('position', 3, 'aStart', 'aEnd');
		pair('color', 4, 'aColorStart', 'aColorEnd');
		pair(options.along, 1, 'aAlongStart', 'aAlongEnd');
		pair(options.extra, 1, 'aExtraStart', 'aExtraEnd');
		pair(options.span, 1, 'aSpan', 'aSpanEnd');
		geometry.deleteAttribute('aSpanEnd');
		geometry.instanceCount = source.getAttribute('position').count / 2;
		const material = new ShaderMaterial({
			defines: options.flow ? {READING_BEAM: 1} : {},
			vertexShader: VERTEX,
			fragmentShader: options.flow ? FLOW_FRAGMENT : BASE_FRAGMENT,
			transparent: true,
			depthWrite: false,
			blending: NormalBlending,
			side: DoubleSide,
			uniforms: {
				...uniforms,
				uOpacity: { value: 1 },
				uReadingInk: { value: new Color(READING_INK.thread) },
				uReadingCore: { value: new Color(READING_INK.core) },
				uReadingAura: { value: new Color(READING_INK.aura) },
				uWidth: { value: options.flow ? READING_INK.width : options.width },
				uMinWidth: { value: options.flow ? READING_INK.width : options.minWidth },
				uMaxWidth: { value: options.flow ? READING_INK.width : options.maxWidth },
			},
		});
		this.mesh = new Mesh(geometry, material);
		this.mesh.frustumCulled = false;
	}

	set opacity(value: number) { this.mesh.material.uniforms['uOpacity']!.value = value; }

	sync(): void {
		for (const entry of this.buffers) {
			if (entry.source.version === entry.version) continue;
			entry.version = entry.source.version;
			entry.target.needsUpdate = true;
		}
	}

	dispose(): void {
		this.mesh.geometry.dispose();
		this.mesh.material.dispose();
	}
}
