## ADDED Requirements

### Requirement: Descriptor-Driven Rendering
The hologram renderer SHALL derive all asset-specific behavior from the active avatar descriptor. Model paths, joint names, material rules, scale, camera offset, and per-asset workarounds SHALL NOT appear as constants in renderer code.

#### Scenario: Renderer loads the model named by the descriptor
- **WHEN** the hologram mounts with an active descriptor
- **THEN** it SHALL load the model at the descriptor's source URL using the loader for the declared format

#### Scenario: Material rules come from the descriptor
- **WHEN** a descriptor declares material rules
- **THEN** each rule SHALL be applied to materials whose names match the rule's pattern
- **AND** materials matching no rule SHALL be left at their imported settings

#### Scenario: Per-asset defects are expressed as data
- **WHEN** a descriptor lists joints in `disabledJoints`
- **THEN** those joints SHALL be excluded from procedural idle animation
- **AND** the exclusion SHALL require no renderer code change to add or remove

#### Scenario: Avatar is switched at runtime
- **WHEN** the user selects a different avatar
- **THEN** the previous model's GPU resources SHALL be released
- **AND** the new avatar SHALL render without a page reload

#### Scenario: Default avatar renders unchanged
- **WHEN** the built-in default descriptor is active
- **THEN** the hologram SHALL render with the same materials, scale, camera framing, and idle motion as the previous release

### Requirement: Face Animation Mode Selection
The renderer SHALL select its facial animation path from the descriptor's `face.kind` value, supporting both avatars with visemes and avatars without a face.

#### Scenario: Emissive mode drives named meshes
- **WHEN** the active descriptor declares `face.kind: 'emissive'`
- **THEN** the renderer SHALL drive the emissive property of the meshes named in the descriptor
- **AND** SHALL NOT attempt to resolve morph targets

#### Scenario: Viseme mode drives morph targets
- **WHEN** the active descriptor declares `face.kind: 'visemes'`
- **THEN** the renderer SHALL resolve the descriptor's viseme names to morph target indices on load
- **AND** SHALL expose those targets for animation

#### Scenario: Declared visemes are absent from the model
- **WHEN** a descriptor declares `face.kind: 'visemes'` but the loaded model exposes no matching morph targets
- **THEN** the renderer SHALL fall back to emissive behavior
- **AND** SHALL report that the avatar's declared visemes could not be resolved
