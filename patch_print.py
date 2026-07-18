import re

with open("src/components/ResultDashboard.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "import { CheckCircle2, User, RefreshCw, BookOpen, Briefcase, GraduationCap } from 'lucide-react';",
    "import { CheckCircle2, User, RefreshCw, BookOpen, Briefcase, GraduationCap, Printer } from 'lucide-react';"
)

content = content.replace(
    '<div className="flex flex-col h-screen w-full bg-[#FDFDFF] text-slate-900 overflow-y-auto font-sans">',
    '<div className="flex flex-col h-screen print:h-auto print:overflow-visible w-full bg-[#FDFDFF] text-slate-900 overflow-y-auto font-sans">'
)

content = content.replace(
    '<header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm z-10 sticky top-0">',
    '<header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm z-10 sticky top-0 print:hidden">'
)

button_replacement = """<div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 font-semibold text-sm transition print:hidden"
          >
            <Printer size={14} />
            พิมพ์ / PDF
          </button>
          <button 
             onClick={onRestart}
             className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-1.5 rounded-lg hover:bg-slate-50 font-semibold text-sm transition print:hidden"
          >
            {isTeacherView ? (
              <>ปิด</>
            ) : (
              <><RefreshCw size={14} />ทำใหม่</>
            )}
          </button>
        </div>"""

# Replace the single button with the new button group
content = re.sub(
    r'<button\s*onClick=\{onRestart\}\s*className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-1\.5 rounded-lg hover:bg-slate-50 font-semibold text-sm transition"\s*>\s*\{isTeacherView \? \(\s*<>ปิด</>\s*\) : \(\s*<><RefreshCw size=\{14\} />ทำใหม่</>\s*\)\}\s*</button>',
    button_replacement,
    content
)

with open("src/components/ResultDashboard.tsx", "w") as f:
    f.write(content)

