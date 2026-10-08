---
name: threejs-shaders
description: Create or modify Three.js GLSL shaders, uniforms, vertex effects, and material shader patches. Use for custom rendered effects, not ordinary CSS or UI changes.
---

# Three.js Shaders

Apply the project's [AGENTS.md](../../../AGENTS.md). Use this skill for the rendering concern described above; ordinary note management and unrelated UI changes do not require it. Read only the relevant reference sections, not the whole example collection.

## Project use

For 星云 effects, inspect the affected material and its caller. Current entry points include `apps/web/src/galaxy/vendor/render/shaders.ts`, `AggregateRenderer.ts` in the same directory, and `apps/web/src/galaxy/nebulaBackdrop.js`.

- Material setup and shader inputs: [ShaderMaterial vs RawShaderMaterial](references/examples.md#shadermaterial-vs-rawshadermaterial), [Uniforms](references/examples.md#uniforms), and [Varyings](references/examples.md#varyings).
- Noise, glow, or vertex effects: [Common Shader Patterns](references/examples.md#common-shader-patterns).
- Patching an existing material: [Extending Built-in Materials](references/examples.md#extending-built-in-materials); verify injection points against installed shader chunks.
- Compilation and visual diagnosis: [Debugging Shaders](references/examples.md#debugging-shaders).

Use a shader when it serves the requested effect; existing material parameters, geometry, CSS, or other approaches remain valid. Check coordinate spaces, GLSL version, blending, and depth behavior for the affected effect. Review visibility in the actual page, including selected states and reduced motion when relevant.

## Example compatibility

Check `apps/web/package.json` and the installed Three.js API before adapting a snippet. Examples are options, not required implementation choices; they do not authorize dependency upgrades or renderer migrations. Validate the changed behavior at the level needed for the task. The reference collection is not a guarantee of browser rendering or performance.

Source: [CloudAI-X/threejs-shaders](https://github.com/CloudAI-X/threejs-skills/tree/main/skills/threejs-shaders), with local scope and reference organization adjustments.
