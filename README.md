# DM Issue Repository — Plant Ngoro Final 16

Fixed Issue Repository > All Application.

The repository filter previously populated Application options only from
applications already present in issue records (`data.map(r=>r.application)`).
Therefore `Dashboard MES to KPI` could disappear when no issue record currently
used that application.

Final 16 populates All Application from the master `APPS` list plus any
application values already present in issue data. `Dashboard MES to KPI` is
therefore always available.

All PIC behavior, including IT, is retained.
