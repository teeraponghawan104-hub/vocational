import os

files = [
    "src/App.tsx",
    "src/components/AssessmentLockdown.tsx",
    "src/components/ResultDashboard.tsx",
    "src/components/TeacherDashboard.tsx"
]

for filepath in files:
    with open(filepath, "r") as f:
        content = f.read()

    # App.tsx
    if "App.tsx" in filepath:
        content = content.replace(
            '<h1 className="text-xl font-bold tracking-tight">Vocational Test</h1>',
            '<h1 className="text-xl font-bold tracking-tight">โรงเรียนวรคุณอุปถัมภ์</h1>'
        )
        content = content.replace(
            '<p className="text-white/80 text-[10px] uppercase tracking-widest font-medium">แบบทดสอบความพร้อมทางอาชีพ</p>',
            '<p className="text-white/80 text-[10px] uppercase tracking-widest font-medium">แบบทดสอบความพร้อมทางอาชีพ</p>'
        )

    # AssessmentLockdown.tsx and ResultDashboard.tsx
    if "AssessmentLockdown.tsx" in filepath or "ResultDashboard.tsx" in filepath:
        content = content.replace(
            '<h1 className="text-base md:text-lg font-semibold tracking-tight text-slate-800 whitespace-nowrap">แบบทดสอบความพร้อมทางอาชีพ <span className="hidden md:inline text-slate-400 font-normal ml-2">| ออนไลน์</span></h1>',
            '<h1 className="text-base md:text-lg font-semibold tracking-tight text-slate-800 whitespace-nowrap">โรงเรียนวรคุณอุปถัมภ์ <span className="hidden md:inline text-slate-400 font-normal ml-2">| แบบทดสอบความพร้อมทางอาชีพ</span></h1>'
        )
        
    # TeacherDashboard.tsx
    if "TeacherDashboard.tsx" in filepath:
        content = content.replace(
            '<h1 className="text-base md:text-lg font-semibold tracking-tight text-slate-800 whitespace-nowrap">ระบบจัดการสำหรับครู <span className="hidden md:inline text-slate-400 font-normal ml-2">| ออนไลน์</span></h1>',
            '<h1 className="text-base md:text-lg font-semibold tracking-tight text-slate-800 whitespace-nowrap">โรงเรียนวรคุณอุปถัมภ์ <span className="hidden md:inline text-slate-400 font-normal ml-2">| ระบบจัดการสำหรับครู</span></h1>'
        )

    with open(filepath, "w") as f:
        f.write(content)

