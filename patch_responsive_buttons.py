import re

with open("src/components/TeacherDashboard.tsx", "r") as f:
    content = f.read()

# Replace the buttons div in TeacherDashboard.tsx
old_buttons = """<div className="flex items-center gap-2">
          <button onClick={handleDownloadPdf} className="flex items-center gap-2 bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 font-medium text-sm transition print:hidden">
            <Printer size={16} />
            <span>พิมพ์ / PDF</span>
          </button>
          <button onClick={exportToCSV} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 hover:bg-emerald-100 font-medium text-sm transition print:hidden">
            <Download size={16} />
            <span>ส่งออก CSV</span>
          </button>
          <div className="flex items-center gap-2 bg-indigo-50 px-3 md:px-4 py-1.5 rounded-full border border-indigo-100 text-indigo-700 font-medium text-xs md:text-sm shrink-0 print:hidden">
            <Users size={16} className="hidden sm:block" />
            <span>ทั้งหมด: {results.length} คน</span>
          </div>
        </div>"""

new_buttons = """<div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto no-scrollbar py-1">
          <button onClick={handleDownloadPdf} className="flex items-center gap-1.5 md:gap-2 bg-slate-50 text-slate-700 px-2.5 md:px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 font-medium text-xs md:text-sm transition print:hidden whitespace-nowrap shrink-0">
            <Printer size={14} className="md:w-4 md:h-4 shrink-0" />
            <span className="hidden sm:inline">พิมพ์ / PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
          <button onClick={exportToCSV} className="flex items-center gap-1.5 md:gap-2 bg-emerald-50 text-emerald-700 px-2.5 md:px-3 py-1.5 rounded-full border border-emerald-200 hover:bg-emerald-100 font-medium text-xs md:text-sm transition print:hidden whitespace-nowrap shrink-0">
            <Download size={14} className="md:w-4 md:h-4 shrink-0" />
            <span className="hidden sm:inline">ส่งออก CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
          <div className="flex items-center gap-1.5 md:gap-2 bg-indigo-50 px-2.5 md:px-4 py-1.5 rounded-full border border-indigo-100 text-indigo-700 font-medium text-xs md:text-sm shrink-0 print:hidden whitespace-nowrap">
            <Users size={14} className="hidden sm:block md:w-4 md:h-4 shrink-0" />
            <span className="hidden sm:inline">ทั้งหมด: {results.length} คน</span>
            <span className="sm:hidden">{results.length}</span>
          </div>
        </div>"""

content = content.replace(old_buttons, new_buttons)

with open("src/components/TeacherDashboard.tsx", "w") as f:
    f.write(content)

