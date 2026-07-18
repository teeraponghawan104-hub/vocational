import re

with open("src/components/ResultDashboard.tsx", "r") as f:
    content = f.read()

old_buttons = """<div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
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

new_buttons = """<div className="flex items-center gap-1.5 md:gap-2">
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 md:gap-2 bg-indigo-600 text-white px-2.5 md:px-4 py-1.5 rounded-lg hover:bg-indigo-700 font-semibold text-xs md:text-sm transition print:hidden whitespace-nowrap shrink-0"
          >
            <Printer size={14} className="shrink-0" />
            <span className="hidden sm:inline">พิมพ์ / PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
          <button 
             onClick={onRestart}
             className="inline-flex items-center gap-1.5 md:gap-2 bg-white border border-slate-200 text-slate-600 px-2.5 md:px-4 py-1.5 rounded-lg hover:bg-slate-50 font-semibold text-xs md:text-sm transition print:hidden whitespace-nowrap shrink-0"
          >
            {isTeacherView ? (
              <span>ปิด</span>
            ) : (
              <><RefreshCw size={14} className="shrink-0" /><span className="hidden sm:inline">ทำใหม่</span><span className="sm:hidden">ทำใหม่</span></>
            )}
          </button>
        </div>"""

content = content.replace(old_buttons, new_buttons)

with open("src/components/ResultDashboard.tsx", "w") as f:
    f.write(content)

