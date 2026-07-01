# Contract: EditorAccessibilityV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: Visual Token Editor UI
- **Consumers**: accessibility tests, manual QA, future Studio shell

## Requirements

```text
keyboard navigation
visible focus
labels
control-associated errors
editing without mandatory drag and drop
screen-reader support
contrast
reduced motion
announcements for success, conflict and recovery
```

## Invariants

- Every control must have an accessible name.
- Every control-level error must be programmatically associated with the control.
- Preview, approval, conflict, apply success and recovery-required states must move focus or announce via
  an accessible live region.
- Token/group move must have a non-drag path, such as parent selector, path input or keyboard command.
- Focus indicators must remain visible and meet contrast requirements inherited from `009`.
- Motion must respect `prefers-reduced-motion`.
- Color, icon or swatch state must always have text alternatives.

## Exclusions

No pointer-only destructive action, no color-only error/success communication, no hidden toast as the sole
source of recovery information.
