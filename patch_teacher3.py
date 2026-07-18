import re

with open("src/components/TeacherDashboard.tsx", "r") as f:
    content = f.read()

content = content.replace(
    '<div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 justify-between">',
    '<div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 justify-between print:hidden">'
)

content = content.replace(
    '<div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">',
    '<div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 print:hidden">'
)

content = content.replace(
    '<div className="mb-8 hidden md:grid grid-cols-1 md:grid-cols-3 gap-6">',
    '<div className="mb-8 hidden md:grid grid-cols-1 md:grid-cols-3 gap-6 print:grid">'
)

with open("src/components/TeacherDashboard.tsx", "w") as f:
    f.write(content)

