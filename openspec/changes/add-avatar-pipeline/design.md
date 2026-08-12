## Context

The app renders one specific avatar: a Sketchfab-derived XPS conversion of an armored, visored character. The renderer was written against that asset, and the asset's quirks live in component code as comments and special cases.

Two constraints shape this design:

1. **The current asset cannot lip-sync.** Inspection of `public/models/hologram.glb` confirms 12 meshes, 0 morph targets, 1 skin, 0 animation clips, and only four head-related nodes (`head neck lower_07`, `head neck upper_08`, `head visor_09`, `head visor_end_060`). There is no jaw, no mouth, no visemes.
2. **Vendor risk in this space is demonstrated, not hypothetical.** Ready Player Me — the default recommendation for rigged avatars with ARKit/Oculus visemes — shut down its avatar creator and all public API endpoints on 2026-01-31 following its acquisition by Netflix, with no public successor. Any design that hardcodes a single avatar vendor inherits that failure mode.

## Goals / Non-Goals

**Goals**
- Renderer contains zero asset-specific constants; all of it moves into data.
- Users can supply an avatar from a photo, or from their own `.glb`/`.vrm` file.
- The system knows, per avatar, whether real viseme lip-sync is possible, and says so at import time.
- The current hologram keeps rendering exactly as it does today.

**Non-Goals**
- Swapping the TTS engine, or implementing lip-sync/audio-reactive animation. This change defines the descriptor fields those need; a follow-on change implements them.
- Authoring or editing avatars in-app. Import and select only.
- Generating facial blendshapes for meshes that lack them. That is an asset-authoring problem, not a runtime one.

## Decisions

**Decision: A sidecar descriptor, not embedded glTF `extras`.**
The descriptor is a standalone JSON record referencing the model by URL, rather than metadata baked into the GLB. Most avatars users will supply are third-party files they cannot re-export. A sidecar lets the app describe an asset it does not own.
*Alternatives:* glTF `extras` (requires re-export); a bespoke bundle format (invents a format nobody else reads).

**Decision: Prefer VRM as the interchange format; support plain GLB.**
VRM 1.0 already supplies a standardized humanoid bone map, viseme expression presets (`aa`, `ih`, `ou`, `ee`, `oh`), and a `meta` block carrying author and usage-permission data. For VRM inputs the descriptor's `boneMap` is unnecessary — the humanoid map replaces the regex table at `Hologram.tsx:50-64`. Plain GLB remains supported via an explicit `boneMap`, which is how the current asset will be described.
*Alternatives:* GLB-only (keeps hand-written bone tables forever); FBX (not web-native).

**Decision: `face` is a discriminated union, not an optional viseme map.**
`face.kind: 'emissive'` drives named meshes' emissive intensity — the correct behavior for a helmeted character, and the only option for the current asset. `face.kind: 'visemes'` drives morph targets. Making this an explicit tagged union means both avatar classes are first-class and the renderer branches on data, not on a null check.

**Decision: Providers sit behind an interface; capability detection is provider-independent.**
`services/avatarImport.ts` exposes a provider interface (`convert(image) => Promise<{ modelUrl, format }>`), with concrete adapters per vendor. Detection of morph targets and skeleton runs on the returned file regardless of provider. When a vendor disappears, the adapter is replaced and nothing else moves.

**Decision: Detect rig capability at import, persist the result.**
Traversing meshes for morph targets is cheap but not free, and the answer never changes for a given file. Detecting once at import and storing `face.kind` in the descriptor keeps the render path branch-only.

## Risks / Trade-offs

- **Cloud providers conflict with the project's local-first framing** (`openspec/project.md`, "Privacy-focused approach using local Ollama models instead of cloud APIs"). Photo-to-avatar conversion sends a user's image to a third party. → Mitigation: local file import is a first-class path, not a fallback; the provider is unset by default so no image leaves the device unless explicitly configured.
- **Photo likeness consent and provider ToS.** Converting a photograph of a person into an avatar carries consent obligations. → Mitigation: documented in the settings UI at the point of upload; out-of-scope to enforce.
- **Generative image-to-3D producing unriggable meshes.** Tools like TRELLIS, Hunyuan3D and Tripo give strong likeness but arbitrary topology, no skeleton and no blendshapes — reproducing the exact defect this change works around. → Mitigation: capability detection reports the outcome at import and the descriptor degrades to `face.kind: 'emissive'` rather than appearing broken.
- **Descriptor drift.** A descriptor can reference bones or materials that a swapped asset no longer has. → Mitigation: unmatched entries are skipped and surfaced as warnings; a descriptor that fails to resolve a model falls back to the default rather than rendering nothing.
- **Mobile payload.** Arbitrary user avatars can be far larger than the current 9 MB GLB. → Not solved here; `presentation` carries scale but no LOD strategy. Flagged as an open question.

## Migration Plan

1. Ship `defaultAvatarDescriptor` describing the existing hologram: model path, the `25_`/`26_`/`27_` material rules, the bone regex table, `scale: 1.5`, camera offset `[0, 0, 5.5]`, `disabledJoints: ['leftElbow', 'rightElbow']`, and `face.kind: 'emissive'` targeting the visor and chest-core meshes.
2. `SettingsContext` already merges persisted state over defaults (`SettingsContext.tsx:35`), so an added key is backward-compatible: existing installs pick up the default descriptor with no migration step.
3. Refactor `Hologram.tsx` to read the descriptor. Verify parity against the current render before adding any new avatar path.
4. Rollback is reverting the component; descriptor state in localStorage is ignored by the old code.

## Open Questions

- Which conversion provider to adopt first — Avaturn and Avatar SDK/MetaPerson both export GLB with ARKit blendshapes and visemes. Needs a cost and ToS decision.
- Should the visored character remain the default avatar, or become one option among several?
- Is a size budget or LOD policy needed for user-supplied avatars on mobile?
