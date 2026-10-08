---
name: threejs-postprocessing
description: Modify Three.js post-processing chains for bloom, anti-aliasing, color, blur, or custom screen-space effects. Use when the rendering pipeline is involved, not for every visual change.
---

# Three.js Post-Processing

Apply the project's [AGENTS.md](../../../AGENTS.md). Use this skill for the rendering concern described above; ordinary note management and unrelated UI changes do not require it. Read only the relevant reference sections, not the whole example collection.

## Project use

The current 星云 WebGL chain is in `apps/web/src/galaxy/vendor/render/AggregateRenderer.ts`: `RenderPass → UnrealBloomPass → OutputPass`. Read its existing parameters and the caller before adding passes. This describes the current implementation, not a restriction on future rendering choices.

- Composer setup or bloom: [EffectComposer Setup](references/examples.md#effectcomposer-setup) and [Common Effects](references/examples.md#common-effects).
- Custom full-screen effects: [Custom ShaderPass](references/examples.md#custom-shaderpass).
- Effect ordering, render targets, and compositing: [Combining Multiple Effects](references/examples.md#combining-multiple-effects) and the following sections.
- Resolution and quality tradeoffs: [Performance Tips](references/examples.md#performance-tips) and [Handle Resize](references/examples.md#handle-resize).
- Only when evaluating a WebGPURenderer implementation: [WebGPU Post-Processing](references/examples.md#webgpu-post-processing). This is a separate renderer path, not an EffectComposer replacement to paste into the current WebGL setup.

Choose effects for the requested visual result and available frame budget. Check output color conversion, resize, cleanup, and quality tiers when affected; do not add effects solely because examples list them.

## Example compatibility

Check `apps/web/package.json` and the installed Three.js API before adapting a snippet. Examples are options, not required implementation choices; they do not authorize dependency upgrades or renderer migrations. Validate the changed behavior at the level needed for the task. The reference collection is not a guarantee of browser rendering or performance.

Source: [CloudAI-X/threejs-postprocessing](https://github.com/CloudAI-X/threejs-skills/tree/main/skills/threejs-postprocessing), with local scope and reference organization adjustments.
