# Change: Metadata-Driven Avatars with Image Import

## Why

Every fact about the current avatar is hardcoded inside the renderer. `components/Hologram.tsx` embeds the model path (`Hologram.tsx:41`), a hand-written bone-name regex table (`Hologram.tsx:50-64`), material layering rules keyed to the asset's `25_`/`26_`/`27_` prefixes (`Hologram.tsx:95-120`), a fixed scale and camera offset, and a workaround for a skin-weighting defect specific to this GLB (`Hologram.tsx:166-172`). Pointing the app at any other avatar means editing the component.

The asset itself is also a dead end for facial animation: `public/models/hologram.glb` has 12 meshes with **0 morph targets**, no jaw or mouth bones, and a visor in place of a face. Lip-sync has nothing to drive, and there is no way for a user to supply an avatar that does.

## What Changes

- Add an `AvatarDescriptor` type: a serializable record that fully specifies how an avatar is loaded, posed, animated, and voiced, so the renderer holds no asset-specific knowledge.
- Refactor `components/Hologram.tsx` to consume a descriptor instead of hardcoded constants. The existing hologram becomes a built-in default descriptor, rendering identically to today.
- Add an avatar import service: convert a user-supplied image into a rigged 3D avatar via a pluggable provider, or import a local `.glb`/`.vrm` file directly.
- Detect rig capability at import time (morph targets, skeleton, viseme naming) and record the result in the descriptor, so an avatar that cannot lip-sync is identified on import rather than failing silently at render.
- Support VRM alongside GLB, using VRM's standardized humanoid bone map and viseme expressions in place of a hand-written bone table.
- Extend the settings panel to select, import, and delete avatars.
- Persist descriptors in the existing `ai-chat-settings` localStorage record.

No breaking changes: absent descriptor state resolves to the built-in default.

## Impact

- Affected specs: `avatar-descriptor` (new), `avatar-import` (new), `hologram-display` (new requirement)
- Affected code: `components/Hologram.tsx`, `components/SettingsModal.tsx`, `context/SettingsContext.tsx`, `types.ts`, new `services/avatarImport.ts`, new `services/avatarDescriptor.ts`
- New dependency: `@pixiv/three-vrm` (VRM loading for three.js)
- Conflicts with pending change `fix-hologram-gold-display`, which edits the same material logic in `components/Hologram.tsx`. That change should land and be archived first; this proposal moves its rules into descriptor data rather than replacing them.
- Out of scope: the TTS engine swap and the lip-sync animation itself. This change defines and populates the `face` and `voice` descriptor fields; a follow-on change consumes them.
