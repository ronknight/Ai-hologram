## 1. Descriptor foundation
- [ ] 1.1 Add `AvatarDescriptor`, `IdleJoint`, and the `face` discriminated union to `types.ts`
- [ ] 1.2 Create `services/avatarDescriptor.ts` with `validateDescriptor()` and typed validation errors
- [ ] 1.3 Author `defaultAvatarDescriptor` reproducing the current hologram: model path, `25_`/`26_`/`27_` material rules, bone map, `scale: 1.5`, camera offset `[0, 0, 5.5]`, `disabledJoints: ['leftElbow','rightElbow']`, `face.kind: 'emissive'`
- [ ] 1.4 Extend `Settings` in `types.ts` with `avatars: AvatarDescriptor[]` and `selectedAvatarId`
- [ ] 1.5 Wire descriptor state and setters through `context/SettingsContext.tsx`, confirming the existing defaults merge covers pre-upgrade saved settings

## 2. Renderer refactor
- [ ] 2.1 Change `HologramModel` to take a descriptor prop and load from `descriptor.source`
- [ ] 2.2 Replace the hardcoded bone regex table (`Hologram.tsx:50-64`) with resolution against `descriptor.boneMap`
- [ ] 2.3 Replace the hardcoded material logic (`Hologram.tsx:95-120`) with iteration over `descriptor.materials.rules`
- [ ] 2.4 Drive scale, camera offset, and idle amplitudes from `descriptor.presentation`
- [ ] 2.5 Honour `descriptor.disabledJoints` in the idle animation loop
- [ ] 2.6 Branch face animation setup on `face.kind`; implement emissive-mesh resolution and viseme morph-target resolution
- [ ] 2.7 Dispose geometries, materials, and textures on avatar switch
- [ ] 2.8 Verify pixel parity against the current build before proceeding

## 3. VRM support
- [ ] 3.1 Add `@pixiv/three-vrm`
- [ ] 3.2 Load `format: 'vrm'` descriptors through the VRM loader plugin
- [ ] 3.3 Resolve joints from the VRM humanoid map when no `boneMap` is present
- [ ] 3.4 Map VRM expression presets (`aa`, `ih`, `ou`, `ee`, `oh`) into the viseme face mode

## 4. Import pipeline
- [ ] 4.1 Create `services/avatarImport.ts` with the provider interface and a registry
- [ ] 4.2 Implement local file import for `.glb` and `.vrm`, including rejection of other types
- [ ] 4.3 Implement rig capability detection: traverse for morph targets, match against ARKit / Oculus / VRM viseme names, detect skin presence
- [ ] 4.4 Generate a descriptor from detection results, defaulting to `face.kind: 'emissive'` when no morph targets are found
- [ ] 4.5 Implement one conversion provider adapter behind the interface
- [ ] 4.6 Handle in-progress, cancelled, failed, and unconfigured-provider states

## 5. Settings UI
- [ ] 5.1 Add an avatar section to `components/SettingsModal.tsx`: list, select, delete
- [ ] 5.2 Add image upload and local file import controls, with the likeness/consent note at the point of upload
- [ ] 5.3 Surface conversion progress, validation errors, and capability warnings
- [ ] 5.4 Show per-avatar lip-sync capability so the `emissive` fallback is visible before selection

## 6. Verification
- [ ] 6.1 Default avatar renders unchanged after refactor
- [ ] 6.2 Local `.glb` import, selection, and runtime switching
- [ ] 6.3 Local `.vrm` import resolves humanoid joints with no `boneMap`
- [ ] 6.4 Morph-target-free model imports and is reported as `emissive`
- [ ] 6.5 Malformed descriptor and unreachable model URL both fall back without a blank scene
- [ ] 6.6 Repeated avatar switching does not grow GPU memory
- [ ] 6.7 Load and switch avatars on a mobile browser
