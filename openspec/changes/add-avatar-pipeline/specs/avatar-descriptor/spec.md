## ADDED Requirements

### Requirement: Avatar Descriptor Schema
The system SHALL define a serializable `AvatarDescriptor` record that fully specifies how an avatar is loaded, posed, animated, and voiced. Renderer code SHALL NOT contain asset-specific constants; every such value SHALL be supplied by a descriptor.

#### Scenario: Descriptor supplies the model source
- **WHEN** the application renders an avatar
- **THEN** the model URL and format (`glb` or `vrm`) SHALL be read from the active descriptor
- **AND** no model path SHALL be hardcoded in renderer code

#### Scenario: Descriptor supplies the joint mapping
- **WHEN** a descriptor for a plain GLB avatar declares a `boneMap`
- **THEN** procedural idle animation SHALL resolve joints through that map
- **AND** joints listed in `disabledJoints` SHALL NOT be animated

#### Scenario: VRM humanoid map replaces an explicit bone map
- **WHEN** a descriptor references a model with format `vrm` and declares no `boneMap`
- **THEN** the system SHALL resolve joints through the VRM humanoid bone mapping
- **AND** the descriptor SHALL remain valid without a `boneMap`

#### Scenario: Descriptor declares the face animation mode
- **WHEN** a descriptor is loaded
- **THEN** it SHALL declare `face.kind` as either `emissive` or `visemes`
- **AND** the renderer SHALL select its face animation path from that value alone

### Requirement: Descriptor Persistence
The system SHALL persist avatar descriptors alongside existing user settings and restore the selected avatar across sessions.

#### Scenario: Selection survives a reload
- **WHEN** a user selects an avatar and reloads the application
- **THEN** the previously selected avatar SHALL be restored

#### Scenario: Existing installation upgrades without migration
- **WHEN** the application loads settings saved before this change, containing no descriptor state
- **THEN** the built-in default descriptor SHALL be applied
- **AND** the avatar SHALL render identically to the previous release

### Requirement: Descriptor Validation and Fallback
The system SHALL validate descriptors before use and SHALL degrade to a working avatar rather than rendering an empty scene.

#### Scenario: Malformed descriptor is rejected
- **WHEN** a descriptor is missing required fields or declares an unknown `face.kind`
- **THEN** the descriptor SHALL be rejected with a message identifying the invalid field
- **AND** the previously active descriptor SHALL remain in use

#### Scenario: Model fails to load
- **WHEN** a descriptor's model URL is unreachable or fails to parse
- **THEN** an error SHALL be surfaced to the user
- **AND** the system SHALL fall back to the built-in default descriptor

#### Scenario: Descriptor references absent bones or materials
- **WHEN** a descriptor names joints or material patterns that the loaded model does not contain
- **THEN** the unmatched entries SHALL be skipped and reported as warnings
- **AND** the avatar SHALL still render using the entries that did resolve
