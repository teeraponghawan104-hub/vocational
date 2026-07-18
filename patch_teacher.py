import re

with open("src/components/TeacherDashboard.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "import { ArrowLeft, Search, Filter, BarChart3, Users, Trash2, X } from 'lucide-react';",
    "import { ArrowLeft, Search, Filter, BarChart3, Users, Trash2, X, Download } from 'lucide-react';"
)

export_func = """
  const exportToCSV = () => {
    const headers = ['รหัสนักเรียน', 'ชื่อ', 'นามสกุล', 'ชั้น', 'เลขที่', 'RIASEC เด่น', 'DPT เด่น', 'ความมั่นใจ(%)', 'วันที่'];
    
    const rows = filteredResults.map(r => {
      const recommendations = getCareerRecommendations(r.part1Score);
      const sortedDpt = Object.entries(r.part2Score).sort((a, b) => b[1] - a[1]);
      const date = new Date(r.timestamp).toLocaleString('th-TH');
      return [
        r.student.studentNumber, // could use ID if available, but using number here
        r.student.firstName,
        r.student.lastName,
        r.student.room,
        r.student.studentNumber,
        recommendations.type,
        sortedDpt[0][0],
        r.part3ConsistencyPercentage,
        date
      ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\\uFEFF" + [headers.join(','), ...rows].join('\\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
"""

content = content.replace("  const confirmDelete = async (id: string) => {", export_func + "\n  const confirmDelete = async (id: string) => {")

button_replacement = """<div className="flex items-center gap-2">
          <button onClick={exportToCSV} className="hidden md:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 hover:bg-emerald-100 font-medium text-sm transition">
            <Download size={16} />
            <span>ส่งออก CSV</span>
          </button>
          <div className="flex items-center gap-2 bg-indigo-50 px-3 md:px-4 py-1.5 rounded-full border border-indigo-100 text-indigo-700 font-medium text-xs md:text-sm shrink-0">
            <Users size={16} className="hidden sm:block" />
            <span>ทั้งหมด: {results.length} คน</span>
          </div>
        </div>"""

content = re.sub(
    r'<div className="flex items-center gap-2 bg-indigo-50 px-3 md:px-4 py-1\.5 rounded-full border border-indigo-100 text-indigo-700 font-medium text-xs md:text-sm shrink-0">\s*<Users size=\{16\} className="hidden sm:block" />\s*<span>ทั้งหมด: \{results.length\} คน</span>\s*</div>',
    button_replacement,
    content
)

with open("src/components/TeacherDashboard.tsx", "w") as f:
    f.write(content)

