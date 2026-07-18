import re

with open("src/components/TeacherDashboard.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "import { ArrowLeft, Search, Filter, BarChart3, Users, Trash2, X, Download } from 'lucide-react';",
    "import { ArrowLeft, Search, Filter, BarChart3, Users, Trash2, X, Download, Printer } from 'lucide-react';"
)

button_replacement = """<div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="hidden md:flex items-center gap-2 bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 font-medium text-sm transition print:hidden">
            <Printer size={16} />
            <span>พิมพ์ / PDF</span>
          </button>
          <button onClick={exportToCSV} className="hidden md:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 hover:bg-emerald-100 font-medium text-sm transition print:hidden">
            <Download size={16} />
            <span>ส่งออก CSV</span>
          </button>
          <div className="flex items-center gap-2 bg-indigo-50 px-3 md:px-4 py-1.5 rounded-full border border-indigo-100 text-indigo-700 font-medium text-xs md:text-sm shrink-0 print:hidden">
            <Users size={16} className="hidden sm:block" />
            <span>ทั้งหมด: {results.length} คน</span>
          </div>
        </div>"""

content = re.sub(
    r'<div className="flex items-center gap-2">\s*<button onClick=\{exportToCSV\} className="hidden md:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1\.5 rounded-full border border-emerald-200 hover:bg-emerald-100 font-medium text-sm transition">\s*<Download size=\{16\} />\s*<span>ส่งออก CSV</span>\s*</button>\s*<div className="flex items-center gap-2 bg-indigo-50 px-3 md:px-4 py-1\.5 rounded-full border border-indigo-100 text-indigo-700 font-medium text-xs md:text-sm shrink-0">\s*<Users size=\{16\} className="hidden sm:block" />\s*<span>ทั้งหมด: \{results.length\} คน</span>\s*</div>\s*</div>',
    button_replacement,
    content
)

# And make sure the top container isn't fixed height on print
content = content.replace(
    '<div className="min-h-screen bg-slate-50 text-slate-900 pb-12 animate-in fade-in duration-300 font-sans">',
    '<div className="min-h-screen print:h-auto print:bg-white bg-slate-50 text-slate-900 pb-12 animate-in fade-in duration-300 font-sans">'
)

content = content.replace(
    '<header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm z-10 sticky top-0">',
    '<header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm z-10 sticky top-0 print:hidden">'
)

with open("src/components/TeacherDashboard.tsx", "w") as f:
    f.write(content)

