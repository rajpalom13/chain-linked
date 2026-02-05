# ChainLinked Development Rules

## Workflow Process

### One Task, One Commit Rule

For each task:

1. **Start Task**
   - Mark task as "In Progress" in TASKS.md
   - Read and understand requirements fully
   - Plan implementation approach

2. **Implement**
   - Write code following CLAUDE.md standards
   - Add JSDoc documentation
   - Handle loading and error states
   - Ensure TypeScript compliance

3. **Self-Review**
   - Run `npm run build` - must pass
   - Check for console errors
   - Test functionality manually
   - Verify responsive design
   - Check dark mode compatibility

4. **Commit**
   - Stage only relevant files
   - Use conventional commit format: `type(scope): description`
   - Include Co-Authored-By line

5. **Update Task Status**
   - Mark task as "Completed" in TASKS.md
   - Document any follow-up items

6. **Proceed to Next Task**
   - Only after commit is successful

---

## Task Completion Checklist

Before marking a task complete:

- [ ] Code builds without errors
- [ ] No TypeScript errors
- [ ] Loading states work correctly
- [ ] Error states are handled
- [ ] Responsive design verified
- [ ] Dark mode works
- [ ] No console errors/warnings
- [ ] Code reviewed and approved
- [ ] Committed to repository

---

## Commit Message Format

```
type(scope): short description

Longer description if needed.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples:
```
feat(loading): add partial loading with skeleton placeholders
fix(login): add Chrome extension install prompt
refactor(hooks): improve error handling in useTeamPosts
```

---

## Code Quality Standards

### Required for All Code:

1. **JSDoc Documentation**
   ```typescript
   /**
    * Component description
    * @param props - Component props
    * @returns JSX element
    */
   ```

2. **TypeScript Strict Mode**
   - No `any` types
   - All props typed
   - Proper interfaces/types

3. **Error Handling**
   - Try-catch for async operations
   - User-friendly error messages via toast
   - Graceful degradation

4. **Loading States**
   - Skeleton placeholders
   - Spinner indicators
   - Progressive loading

5. **Accessibility**
   - Focus states
   - Aria labels
   - Keyboard navigation

---

## Review Criteria

A task is considered "reviewed" when:

1. **Build passes**: `npm run build` succeeds
2. **No console errors**: Browser console is clean
3. **Functionality works**: Feature performs as specified
4. **UI is correct**: Matches design expectations
5. **Code quality**: Follows all standards in CLAUDE.md

---

*Last Updated: 2026-02-05*
