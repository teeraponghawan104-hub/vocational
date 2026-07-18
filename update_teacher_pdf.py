import re

with open("src/components/TeacherDashboard.tsx", "r") as f:
    content = f.read()

# Add import html2pdf from 'html2pdf.js'
if "html2pdf.js" not in content:
    content = content.replace("import { ArrowLeft", "import html2pdf from 'html2pdf.js';\nimport { ArrowLeft")

# Add handleDownloadPdf inside TeacherDashboard
handler = """
  const handleDownloadPdf = () => {
    const element = document.getElementById('pdf-teacher-content');
    const opt = {
      margin:       [0.2, 0.2, 0.2, 0.2],
      filename:     `รายงานสรุป_${Date.now()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
  };
"""

content = content.replace(
    "const confirmDelete = async (id: string) => {",
    handler + "\n  const confirmDelete = async (id: string) => {"
)

content = content.replace(
    '<div className="min-h-screen print:h-auto print:bg-white bg-slate-50 text-slate-900 pb-12 animate-in fade-in duration-300 font-sans">',
    '<div className="min-h-screen print:h-auto print:bg-white bg-slate-50 text-slate-900 pb-12 animate-in fade-in duration-300 font-sans" id="pdf-teacher-content">'
)

content = content.replace(
    'onClick={() => window.print()}',
    'onClick={handleDownloadPdf}'
)

with open("src/components/TeacherDashboard.tsx", "w") as f:
    f.write(content)

