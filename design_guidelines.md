# Sarvatra AI Desktop Application Design Guidelines

## Design Approach
**Selected Approach**: Design System - Material Design 3 with desktop adaptations
**Justification**: This is a productivity-focused desktop application requiring consistency, efficiency, and professional appearance. Material Design 3 provides excellent desktop patterns while maintaining modern aesthetics.

## Core Design Elements

### A. Color Palette
**Primary Colors:**
- Light Mode: 219 91% 60% (modern blue)
- Dark Mode: 219 91% 70% (lighter blue for contrast)

**Surface Colors:**
- Light Mode: 0 0% 98% (near white)
- Dark Mode: 220 13% 9% (dark blue-gray)

**Background Colors:**
- Light Mode: 0 0% 100% (pure white)
- Dark Mode: 220 13% 6% (deeper dark)

**Text Colors:**
- Light Mode Primary: 220 13% 18%
- Dark Mode Primary: 0 0% 95%
- Secondary text: 60% opacity of primary

### B. Typography
**Primary Font**: Inter (Google Fonts)
**Secondary Font**: JetBrains Mono (for code/commands)

**Hierarchy:**
- Headers: Inter 600 (semibold)
- Body: Inter 400 (regular)
- Captions: Inter 400 (small size)
- Code/Commands: JetBrains Mono 400

### C. Layout System
**Spacing Units**: Tailwind 2, 4, 6, 8, 12, 16
- Component padding: p-4, p-6
- Section margins: m-8, m-12
- Element spacing: gap-4, gap-6
- Large containers: p-8, p-16

### D. Component Library

**Navigation:**
- Sidebar navigation with collapsible sections
- Top app bar with user profile and settings
- Breadcrumb navigation for deep features

**Core Components:**
- Elevated cards with subtle shadows
- Rounded buttons (md border radius)
- Input fields with floating labels
- Toggle switches for settings
- Progress indicators for AI processing
- Status badges for user approval states

**Data Display:**
- List items with consistent spacing
- Table layouts for user management
- Command cards with action buttons
- Transcript displays with timestamps

**Forms:**
- Grouped form sections
- Validation feedback
- Multi-step wizards for setup
- Drag-and-drop file uploads

**Overlays:**
- Modal dialogs for confirmations
- Slide-over panels for quick actions
- Toast notifications for feedback
- Context menus (future system integration)

### E. Desktop-Specific Considerations

**Window Management:**
- Minimum window size: 1024x768
- Resizable with intelligent content reflow
- Native window controls integration
- Proper focus management

**Interaction Patterns:**
- Right-click context menus
- Keyboard shortcuts with visual indicators
- Hover states for interactive elements
- Clear loading states for AI operations

**Information Architecture:**
- Admin dashboard with user management
- User workspace with AI commands
- Settings panel with API configuration
- Activity logs with filtering

## Key Design Principles

1. **Clarity Over Cleverness**: Clear labels, obvious actions, predictable behavior
2. **Progressive Disclosure**: Advanced features accessible but not overwhelming
3. **Consistent Mental Models**: Similar actions work the same way throughout
4. **Responsive Feedback**: Immediate acknowledgment of user actions
5. **Error Prevention**: Guard rails for destructive actions, clear validation

## Accessibility Requirements
- High contrast ratios in both light and dark modes
- Keyboard navigation for all functionality
- Screen reader compatibility
- Focus indicators on all interactive elements
- Consistent dark mode across all components including forms and inputs

## Animation Guidelines
**Minimal and Purposeful:**
- Subtle micro-interactions for button presses
- Smooth transitions between states (200-300ms)
- Loading animations for AI processing
- No decorative or attention-seeking animations
- Focus on functional feedback rather than visual flair

This design system ensures a professional, efficient, and accessible desktop application that supports the complex AI workflow while maintaining usability for both admin and user roles.