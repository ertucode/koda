- Highlighted matches, do not filter the directory(ESC remembers last match, and n, N moves between matches?)
- Initialize per directory data when manipulation command is called
- Sync selection.last with cursor column
- Do we have separate vim view?
  - Yes
    - We just define one columns
    - We could define specific column on str mode
    - Supporting this kind of workflow could be useful later on
    - It's slightly less performant
  - No
    - I dont know how to do without duplicating columns
- On insert mode, we just show an input on a specific column
- Let's not use ciw, C for now.
- Aggregated save data:
  - Just diff the state with the initial state.
- Do not allow settings, sorting to change while there is modifications
  - Show a warning with current changes and allow to cancel

# Optional

- Have a way to show the undo history in the ui with buttons for undoing
