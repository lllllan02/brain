// 节点 = 单次 draw call 的 THREE.Points + 星光 shader。
// 暗色：细小亮核、连续衰减的光晕与短星芒；浅色：墨水圆盘 + 深色 rim。
// aDim: 聚焦模式下非邻居淡出（0.12..1）

import { CURVE_BOW } from './linkCurves';
import { REVEAL_ACTIVE_SPAN, REVEAL_DELAY_SPAN } from './reveal';

const REVEAL_POSITION_GLSL = /* glsl */ `
vec3 revealPosition(vec3 targetPosition) {
	if (uRevealActive < 0.5) return targetPosition;
	float delay = (length(targetPosition) / max(uRevealMaxRadius, 0.0001)) * ${REVEAL_DELAY_SPAN.toFixed(2)};
	float localProgress = clamp((uRevealProgress - delay) / ${REVEAL_ACTIVE_SPAN.toFixed(2)}, 0.0, 1.0);
	float scale = 1.0 - pow(1.0 - localProgress, 3.0);
	return targetPosition * scale;
}
`;

export const NODE_VERTEX_SHADER = /* glsl */ `
attribute float aSize;
attribute float aGhost;
attribute float aInbox;
attribute float aReading;
attribute float aDim;
attribute float aActive;
attribute float aPreview;
varying vec3 vColor;
varying float vGhost;
varying float vInbox;
varying float vReading;
varying float vDim;
varying float vPointSize;
varying float vActive;
varying float vPreview;
uniform float uPreviewPulse;
uniform float uPixelScale; // drawingBufferHeight / (2·tan(fov/2))
uniform float uSizeMul; // 控制面板「节点大小」倍率
uniform float uMaxPoint; // 设备像素钳制：穿行星团时防满屏大精灵打爆填充率（M3）
uniform float uMinPoint; // 文档星点最小屏幕尺寸，避免与背景尘埃混淆
uniform float uLightMode;
uniform float uRevealActive;
uniform float uRevealProgress;
uniform float uRevealMaxRadius;

${REVEAL_POSITION_GLSL}

void main() {
	vColor = color;
	vGhost = aGhost;
	vInbox = aInbox;
	vReading = aReading;
	vDim = mix(aDim, 1.0, max(aActive, aPreview));
	vActive = aActive;
	vPreview = aPreview;
	vec4 mv = modelViewMatrix * vec4(revealPosition(position), 1.0);
	// 给光晕和星芒留出空间，亮核仍比原来的圆盘小；浅色模式维持原尺寸。
	float projectedSize = aSize * uSizeMul * uPixelScale / max(-mv.z, 1.0) * mix(1.6, 1.0, uLightMode);
	vPointSize = min(max(projectedSize, uMinPoint * (1.0 - uLightMode)) * mix(1.0, 0.90, aInbox) * max(mix(1.0, 1.6, aActive), 1.0 + aPreview * (0.55 + uPreviewPulse * 0.65)), uMaxPoint);
	gl_PointSize = vPointSize;
	gl_Position = projectionMatrix * mv;
}
`;

export const NODE_FRAGMENT_SHADER = /* glsl */ `
varying vec3 vColor;
varying float vGhost;
varying float vInbox;
varying float vReading;
varying float vDim;
varying float vPointSize;
varying float vActive;
varying float vPreview;
uniform float uPreviewPulse;
uniform float uLightMode; // 0 = 深空（白热核心），1 = 晨昼（墨水圆盘 + rim）

void main() {
	vec2 uv = gl_PointCoord - 0.5;
	float d = length(uv);

	// 以设备像素为下限，远处的小星点和关闭 bloom 的窄屏也保留可见亮核。
	float pixel = 1.0 / max(vPointSize, 1.0);
	// 菱形轮廓专属于可阅读的文档，背景星仍是无轮廓的小光点。
	float coreWidth = mix(0.11, 0.13, vActive) * mix(1.0, 0.90, vInbox);
	float core = 1.0 - smoothstep(coreWidth - pixel, coreWidth + pixel, abs(uv.x) + abs(uv.y));
	float halo = exp(-dot(uv, uv) * mix(42.0, 30.0, vActive)) * mix(mix(0.08, 0.22, vDim), 0.42, vActive);
	halo += vPreview * exp(-dot(uv, uv) * 25.0) * (0.3 + uPreviewPulse * 0.65);
	float rayWidth = max(0.014, pixel * 0.65);
	// 远景仍是一颗星；靠近后外部导读的横向衍射光稍长。
	float detail = smoothstep(10.0, 32.0, vPointSize);
	float rays = exp(-abs(uv.x) / rayWidth - abs(uv.y) * 5.0)
		+ exp(-abs(uv.y) / rayWidth - abs(uv.x) * mix(5.5, 3.8, vReading * mix(0.5, 1.0, detail)));
	float edge = 1.0 - smoothstep(0.38, 0.5, d);
	float glow = halo * mix(1.0, 0.75, vInbox)
		+ rays * mix(mix(0.22, 0.65, vDim), 0.85, vActive) * mix(1.0, 0.70, vInbox);
	// 阅读聚焦沿用原有明暗权重，整颗星一起淡出；通过光芒比例保留星形。
	float starAlpha = clamp((core + glow) * edge, 0.0, 1.0) * vDim;
	vec3 starTint = mix(vColor, vec3(0.94, 0.97, 1.0), vActive * 0.65);
	starTint = mix(starTint, vec3(0.88, 0.94, 1.0), vPreview * 0.55);
	// 在线性空间中保留足够色差，避免白核和 bloom 将目录色冲成白光。
	// 目录色覆盖星核边缘及星芒，最外层仍渐变回分类色。
	vec3 collectionTint = mix(vec3(0.90, 0.76, 0.56), vec3(0.36, 0.56, 0.82), vInbox);
	collectionTint = mix(collectionTint, vec3(0.40, 0.72, 0.69), vReading);
	float collectionMask = 1.0 - smoothstep(0.28, 0.48, d);
	starTint = mix(starTint, collectionTint, collectionMask * mix(0.94, 1.0, detail));
	// 白光仅留在中心小点，选中时靠尺寸和光晕强调，避免整颗褪色。
	vec3 starColor = mix(starTint, vec3(1.0), exp(-d * d * 650.0) * 0.72 * (1.0 - vGhost));

	// 晨昼保留纸面圆点；所有 smoothstep 使用递增边界，避免未定义行为。
	float disk = 1.0 - smoothstep(0.42, 0.5, d);
	float rim = smoothstep(0.40, 0.46, d) * (1.0 - smoothstep(0.46, 0.5, d));
	vec3 col = mix(starColor, vColor * (1.0 - rim * 0.28), uLightMode);
	float alpha = mix(clamp(starAlpha, 0.0, 1.0), disk * vDim, uLightMode) * mix(1.0, 0.45, vGhost);
	if (alpha < 0.002) discard;
	gl_FragColor = vec4(col, alpha);
}
`;

const REVEAL_LINK_VERTEX_DECLARATIONS = /* glsl */ `
attribute vec3 aSourcePosition;
attribute vec3 aTargetPosition;
attribute float aCurveT;
uniform float uLinkCurvature;
uniform float uRevealActive;
uniform float uRevealProgress;
uniform float uRevealMaxRadius;

${REVEAL_POSITION_GLSL}
`;

const REVEAL_LINK_BEGIN_VERTEX = /* glsl */ `
	vec3 source = revealPosition(aSourcePosition);
	vec3 target = revealPosition(aTargetPosition);
	vec3 midpoint = (source + target) * 0.5;
	vec3 edge = target - source;
	float edgeLength = length(edge);
	float midpointRadius = length(midpoint);
	vec3 direction;
	if (midpointRadius > 0.001) {
		direction = midpoint / midpointRadius;
	} else {
		float perpendicularLength = length(vec2(edge.z, edge.x));
		direction = perpendicularLength > 0.000001
			? vec3(edge.z / perpendicularLength, 0.0, -edge.x / perpendicularLength)
			: vec3(1.0, 0.0, 0.0);
	}
	vec3 control = midpoint + direction * (uLinkCurvature * ${CURVE_BOW.toFixed(2)} * edgeLength);
	float inverseT = 1.0 - aCurveT;
	vec3 curvePosition =
		inverseT * inverseT * source +
		2.0 * inverseT * aCurveT * control +
		aCurveT * aCurveT * target;
	vec3 transformed = curvePosition;
`;

export interface RevealLineShader {
	uniforms: Record<string, { value: unknown }>;
	vertexShader: string;
	fragmentShader: string;
}

export interface RevealLineUniforms {
	uLinkCurvature: { value: number };
	uRevealActive: { value: number };
	uRevealProgress: { value: number };
	uRevealMaxRadius: { value: number };
}

/**
 * 仅替换 Three r184 原生线材质的顶点位置入口。颜色、透明度、虚线、雾、
 * tone mapping 与 output colorspace 全部留在 LineBasic/LineDashedMaterial 原管线中，
 * 因而动画结束切回普通材质时没有色彩跳变。
 */
export function patchRevealLineShader(shader: RevealLineShader, uniforms: RevealLineUniforms): void {
	const mainAnchor = 'void main() {';
	const positionAnchor = '#include <begin_vertex>';
	if (!shader.vertexShader.includes(mainAnchor) || !shader.vertexShader.includes(positionAnchor)) {
		throw new Error('Three line shader anchors changed; reveal patch cannot be applied safely');
	}
	Object.assign(shader.uniforms, uniforms);
	shader.vertexShader = shader.vertexShader
		.replace(mainAnchor, `${REVEAL_LINK_VERTEX_DECLARATIONS}\n${mainAnchor}`)
		.replace(positionAnchor, REVEAL_LINK_BEGIN_VERTEX);
}
