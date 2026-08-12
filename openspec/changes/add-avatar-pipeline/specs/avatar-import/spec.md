## ADDED Requirements

### Requirement: Image to Avatar Conversion
The system SHALL convert a user-supplied image into a rigged 3D avatar and produce a descriptor for it.

#### Scenario: Photo produces a usable avatar
- **WHEN** a user uploads an image and a conversion provider is configured
- **THEN** the system SHALL request a 3D avatar from the provider
- **AND** on success SHALL generate a descriptor referencing the returned model
- **AND** the new avatar SHALL become selectable without a reload

#### Scenario: Conversion is in progress
- **WHEN** a conversion request has been sent and no response has arrived
- **THEN** the user SHALL see that conversion is in progress
- **AND** SHALL be able to cancel the request

#### Scenario: Conversion fails
- **WHEN** the provider returns an error, times out, or is unreachable
- **THEN** the failure SHALL be surfaced with the provider's reason where available
- **AND** the currently selected avatar SHALL remain unchanged

#### Scenario: No provider configured
- **WHEN** no conversion provider is configured
- **THEN** image upload SHALL be unavailable
- **AND** the user SHALL be directed to local file import instead
- **AND** no image data SHALL leave the device

### Requirement: Conversion Provider Abstraction
The system SHALL access image-to-avatar conversion through a provider interface so that a vendor can be replaced without changes to import, descriptor, or renderer code.

#### Scenario: Provider is selected by configuration
- **WHEN** a conversion provider is configured in settings
- **THEN** import SHALL route through that provider's adapter
- **AND** the rest of the import pipeline SHALL behave identically regardless of which provider is selected

#### Scenario: Provider is discontinued
- **WHEN** a configured provider is replaced by a different one
- **THEN** only that provider's adapter SHALL require modification
- **AND** previously imported avatars SHALL continue to load from their stored model URLs

### Requirement: Local Avatar File Import
The system SHALL accept a user-supplied `.glb` or `.vrm` file directly, without contacting any external service.

#### Scenario: User imports their own model file
- **WHEN** a user supplies a `.glb` or `.vrm` file
- **THEN** the system SHALL generate a descriptor for it
- **AND** SHALL make it selectable as an avatar
- **AND** no network request SHALL be made for the conversion

#### Scenario: Unsupported file type
- **WHEN** a user supplies a file that is neither `.glb` nor `.vrm`
- **THEN** the file SHALL be rejected with a message naming the supported formats

### Requirement: Rig Capability Detection
On import, the system SHALL inspect the model for morph targets and skeletal data and SHALL record the result in the generated descriptor, so that an avatar incapable of viseme lip-sync is identified at import rather than failing silently at render.

#### Scenario: Model with visemes is detected
- **WHEN** an imported model contains morph targets matching a known viseme standard (ARKit, Oculus, or VRM)
- **THEN** the descriptor SHALL be generated with `face.kind: 'visemes'` and the detected standard
- **AND** the detected morph target names SHALL be recorded in the descriptor

#### Scenario: Model without morph targets falls back
- **WHEN** an imported model contains no morph targets
- **THEN** the descriptor SHALL be generated with `face.kind: 'emissive'`
- **AND** the user SHALL be warned that viseme lip-sync is unavailable for this avatar

#### Scenario: Model without a skeleton
- **WHEN** an imported model contains no skin or skeleton
- **THEN** the descriptor SHALL be generated with an empty `boneMap`
- **AND** procedural idle animation SHALL be skipped for that avatar without error
