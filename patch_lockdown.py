import re

with open("src/components/AssessmentLockdown.tsx", "r") as f:
    content = f.read()

content = content.replace(
    '<h1 className="text-base md:text-lg font-semibold tracking-tight text-slate-800 line-clamp-1">',
    '<h1 className="text-base md:text-lg font-semibold tracking-tight text-slate-800 whitespace-nowrap">'
)

with open("src/components/AssessmentLockdown.tsx", "w") as f:
    f.write(content)

