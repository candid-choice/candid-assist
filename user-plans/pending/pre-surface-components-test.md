# pre-surface-components-test — Test Specification

## Purpose

Verify the Surface Components document correctly defines Surface Chrome (shared wrapper), header/footer/status bar specs, surface types × footers mapping, shared components, animation patterns, accessibility, and design tokens.

## Unit Tests

### Surface Chrome — Shared Wrapper
- [ ] Verify all surfaces wrapped in SurfaceChrome component
- [ ] Verify SurfaceChrome includes: title, minimize button, maximize button, close button
- [ ] Verify SurfaceChrome position: fixed/absolute overlay within main content area
- [ ] Verify SurfaceChrome header text: surface type icon + surface name
- [ ] Verify SurfaceChrome drag support for repositioning (future)
- [ ] Verify SurfaceChrome styling matches app theme (light/dark)

### Header/Footer/Status Bar Specs
- [ ] Verify SurfaceHeader shows: title, close button, status indicator
- [ ] Verify SurfaceFooter shows: action buttons, timer, status text
- [ ] Verify SurfaceStatusBar shows: connection state, surface progress
- [ ] Verify Header/Footer adapt per surface type
- [ ] Verify Header/Footer styling consistent across all surface types
- [ ] Verify Header/Footer support keyboard shortcuts (Escape to close)

### Surface Types × Footers Mapping
- [ ] Verify BrowserSurface footer: [Send], [Copy], [Clear]
- [ ] Verify CanvasSurface footer: [Send], [Export], [Clear]
- [ ] Verify ImageSurface footer: [Zoom In], [Zoom Out], [Send]
- [ ] Verify ScreenCaptureSurface footer: [Send], [Save]
- [ ] Verify CodeDiffSurface footer: [Approve], [Request Changes], [Comment]
- [ ] Verify ProcessManager footer: [View Log], [Stop], [Restart], [Close]
- [ ] Verify TerminalSurface footer: [Send to Claude], [Copy], [Re-run]
- [ ] Verify Footer hidden when surface not interactive (read-only surfaces)

### Shared Components
- [ ] Verify SurfaceOverlay: backdrop overlay for surface presentation
- [ ] Verify SurfaceBadge: small badge showing surface count/type
- [ ] Verify SurfaceList: list of active surfaces (for switching)
- [ ] Verify SurfaceError: error display component for failed surfaces
- [ ] Verify SurfaceStatus: status indicator component (loading, active, complete)
- [ ] Verify SurfaceFooter: reusable footer component
- [ ] Verify SurfaceLoading: loading state component (spinner + message)
- [ ] Verify SurfaceTimer: elapsed time display component

### Animation Patterns
- [ ] Verify surface open: slide-in from side or fade-in
- [ ] Verify surface minimize: shrink to bottom bar
- [ ] Verify surface maximize: expand to fill content area
- [ ] Verify surface close: fade-out
- [ ] Verify surface reorder: smooth transition animation
- [ ] Verify surface overlap: current pushes to background
- [ ] Verify animation duration: 200-300ms (fast but noticeable)
- [ ] Verify animations respect prefers-reduced-motion setting

### Accessibility
- [ ] Verify all surface controls have ARIA labels
- [ ] Verify all surface controls are keyboard navigable
- [ ] Verify surface focus management (tab order)
- [ ] Verify surface color contrast meets WCAG 2.1 AA
- [ ] Verify surface resize works with text scaling (200%+)
- [ ] Verify screen reader announces surface state changes

### Design Tokens
- [ ] Verify surface colors defined as tokens (--surface-bg, --surface-border, --surface-title)
- [ ] Verify surface spacing defined as tokens (--surface-padding, --surface-radius)
- [ ] Verify surface typography defined as tokens (--surface-title, --surface-body)
- [ ] Verify surface shadow/elevation defined as tokens
- [ ] Verify all colors adapt for dark mode
- [ ] Verify tokens are used consistently across all surface components

### Cross-Plan Consistency
- [ ] Verify SurfaceChrome matches pre-surface-lifecycle-states.md (surface wrapper)
- [ ] Verify SurfaceFooter matches pre-surface-render-pipeline.md (render output)
- [ ] Verify animations match pre-surface-lifecycle-states.md (transition timing)
- [ ] Verify shared components match pre-desktop-app-architecture.md (component structure)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All SurfaceChrome wrapper behaviors specified
2. [ ] All header/footer/status bar specs are complete
3. [ ] All surface type × footer mappings are accurate
4. [ ] All shared components are defined with props and behavior
5. [ ] All animation patterns described with timing
6. [ ] All accessibility requirements covered
7. [ ] All design tokens defined with dark mode support
8. [ ] No contradictions with other plans
