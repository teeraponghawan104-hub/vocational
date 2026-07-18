import re

with open("src/components/TeacherDashboard.tsx", "r") as f:
    content = f.read()
    
# Remove line-clamp-1 from h1
content = content.replace(
    '<h1 className="text-base md:text-lg font-semibold tracking-tight text-slate-800 line-clamp-1">',
    '<h1 className="text-base md:text-lg font-semibold tracking-tight text-slate-800 whitespace-nowrap">'
)

with open("src/components/TeacherDashboard.tsx", "w") as f:
    f.write(content)

with open("src/components/ResultDashboard.tsx", "r") as f:
    content = f.read()
    
content = content.replace(
    '<h1 className="text-base md:text-lg font-semibold tracking-tight text-slate-800 line-clamp-1">',
    '<h1 className="text-base md:text-lg font-semibold tracking-tight text-slate-800 whitespace-nowrap">'
)

with open("src/components/ResultDashboard.tsx", "w") as f:
    f.write(content)

