# DM Issue Repository — Plant Ngoro Final 17

Critical save/update fix.

The Lesson Learned / Guidance textbox had been removed, but the New Issue
create/update handlers still referenced `$("lesson").value`. Since that
element no longer exists, JavaScript stopped before `save()`.

Final 17 removes only those stale New Issue references:
- New Issue create/save works again.
- Existing issue Edit/Update works again.
- Issue Repository receives newly created issues immediately.
- Existing dashboard, filters, charts, Lesson Learned, and other functions are
  otherwise unchanged.
