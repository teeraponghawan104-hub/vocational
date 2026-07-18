import re

with open("src/components/TeacherDashboard.tsx", "r") as f:
    content = f.read()

content = content.replace(
    'className="hidden md:flex items-center gap-2 bg-slate-50',
    'className="flex items-center gap-2 bg-slate-50'
)

content = content.replace(
    'className="hidden md:flex items-center gap-2 bg-emerald-50',
    'className="flex items-center gap-2 bg-emerald-50'
)

with open("src/components/TeacherDashboard.tsx", "w") as f:
    f.write(content)

