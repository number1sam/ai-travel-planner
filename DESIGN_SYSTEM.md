# 💅 AI Travel Planner Design System

## Brand Colors
- **Primary Green**: `#0E7F76` (brand-green)
- **Secondary Seafoam**: `#A3C6AD` (brand-seafoam)
- **Background Gradient**: `from-blue-50 via-white to-green-50`
- **Card Background**: `bg-white/80 backdrop-blur-sm`
- **Text Primary**: `text-gray-900`
- **Text Secondary**: `text-gray-600`

## Typography
- **Font Family**: Inter (Google Fonts)
- **Headings**: `font-bold` with appropriate text sizes
- **Body Text**: `font-medium` or `font-normal`
- **Small Text**: `text-sm text-gray-600`

## Layout Patterns

### Page Structure
```css
/* Main container */
.page-container {
  min-height: 100vh;
  background: linear-gradient(to bottom right, #eff6ff, #ffffff, #f0fdf4);
}

/* Content wrapper */
.content-wrapper {
  max-width: 1280px; /* max-w-7xl */
  margin: 0 auto;
  padding: 1.5rem; /* px-6 */
}
```

### Header Pattern
```css
/* Sticky header */
.header {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 50;
}
```

### Card Pattern
```css
/* Standard card */
.card {
  background: white;
  border-radius: 1.5rem; /* rounded-2xl */
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); /* shadow-2xl */
  border: 1px solid #e5e7eb;
  padding: 2rem; /* p-8 */
}

/* Glass card */
.glass-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 0.75rem; /* rounded-xl */
  padding: 1.5rem; /* p-6 */
}
```

## Button Styles

### Primary Button
```css
.btn-primary {
  background: linear-gradient(to right, #0E7F76, #A3C6AD);
  color: white;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.9; }
```

### Secondary Button
```css
.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  transition: background-color 0.2s;
}
.btn-secondary:hover { background: #e5e7eb; }
```

## Animation Standards
- **Hover Scale**: `whileHover={{ scale: 1.05 }}`
- **Tap Scale**: `whileTap={{ scale: 0.95 }}`
- **Page Entrance**: `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`
- **Transition Duration**: `transition={{ duration: 0.6 }}`

## Responsive Breakpoints
- **Mobile**: `sm:` (640px+)
- **Tablet**: `md:` (768px+) 
- **Desktop**: `lg:` (1024px+)
- **Large Desktop**: `xl:` (1280px+)

## Component Patterns

### Logo Component
```jsx
<div className="w-10 h-10 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-xl flex items-center justify-center">
  <span className="text-white font-bold text-lg">AI</span>
</div>
```

### Loading Spinner
```jsx
<div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
```

### User Avatar
```jsx
<div className="w-10 h-10 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-full flex items-center justify-center">
  <span className="text-white font-medium text-sm">
    {user.name.split(' ').map(n => n[0]).join('')}
  </span>
</div>
```

## Form Styling

### Input Fields
```jsx
<input 
  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none transition-colors duration-300"
  style={{ height: '50px' }}
/>
```

### Form Labels
```jsx
<label className="block text-sm font-medium text-gray-700 mb-2">
  Field Label
</label>
```

## Page-Specific Guidelines

### Authentication Pages
- Centered card layout (500px width, 640px min-height)
- Gradient background
- Rounded corners (28px border-radius)
- Subtle shadow with backdrop blur

### Homepage/Dashboard  
- Full-width gradient background
- Sticky header with backdrop blur
- Main content in max-w-7xl container
- Cards with glass effect for features

### Planning Interface
- Two-column layout (60/40 split on desktop)
- Chat interface on left, preview on right
- Sticky context bar showing trip details
- Action buttons aligned to right

### Settings/Help Pages
- Clean white background with subtle patterns
- Consistent header with back navigation
- Content in max-w-4xl container
- Section cards with proper spacing

## Accessibility
- High contrast ratios (4.5:1 minimum)
- Focus indicators on all interactive elements
- Semantic HTML structure
- Screen reader friendly labels
- Keyboard navigation support

## Animation Guidelines
- Subtle, purposeful animations
- 0.2-0.6 second durations
- Ease-in-out timing functions
- Respect prefers-reduced-motion
- Loading states for all async operations

## Icons
- Lucide React icon library
- 16px (w-4 h-4) or 20px (w-5 h-5) sizes
- Consistent stroke width
- Color matches surrounding text

## Implementation Checklist
- [ ] All pages use brand color palette
- [ ] Typography scale is consistent
- [ ] Button styles are standardized
- [ ] Form elements follow design system
- [ ] Loading states are implemented
- [ ] Animations are subtle and consistent
- [ ] Mobile responsiveness verified
- [ ] Accessibility standards met
- [ ] Icons are properly sized and colored
- [ ] Error states follow design patterns