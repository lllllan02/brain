---
name: threejs-fundamentals
description: Set up or modify Three.js scenes, cameras, renderer lifecycle, object hierarchies, and coordinate transforms. Use for 3D scene work, not unrelated website edits.
---

# Three.js Fundamentals

Apply the project's [AGENTS.md](../../../AGENTS.md). Use this skill for the rendering concern described above; ordinary note management and unrelated UI changes do not require it. Read only the relevant reference sections, not the whole example collection.

## Project use

Start with `apps/web/src/galaxy/scene.js` for scene lifecycle and interactions; inspect `vendor/interactions/CameraDirector.ts` or `vendor/render/AggregateRenderer.ts` under that directory when changing cameras or rendering. These are current entry points, not a prescribed architecture.

- Scene, camera, or object setup: [Core Classes](references/examples.md#core-classes).
- Position and rotation: [Coordinate System](references/examples.md#coordinate-system) and [Math Utilities](references/examples.md#math-utilities).
- Cleanup, resize, and animation timing: [Common Patterns](references/examples.md#common-patterns).
- Performance questions: [Performance Tips](references/examples.md#performance-tips); verify the relevant bottleneck before applying an optimization.

Integrate into the existing lifecycle instead of copying a second renderer or animation loop from a standalone example. Check disposal and resize behavior when the change affects them.

## Example compatibility

Check `apps/web/package.json` and the installed Three.js API before adapting a snippet. Examples are options, not required implementation choices; they do not authorize dependency upgrades or renderer migrations. Validate the changed behavior at the level needed for the task. The reference collection is not a guarantee of browser rendering or performance.

Source: [CloudAI-X/threejs-fundamentals](https://github.com/CloudAI-X/threejs-skills/tree/main/skills/threejs-fundamentals), with local scope and reference organization adjustments.
