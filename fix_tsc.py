import re

with open("src/components/TeacherDashboard.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "const sortedDpt = Object.entries(r.part2Score).sort((a, b) => b[1] - a[1]);",
    "const sortedDpt = Object.entries(r.part2Score).sort((a, b) => (b[1] as number) - (a[1] as number));"
)

with open("src/components/TeacherDashboard.tsx", "w") as f:
    f.write(content)

