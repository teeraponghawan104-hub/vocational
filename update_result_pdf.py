import re

with open("src/components/ResultDashboard.tsx", "r") as f:
    content = f.read()

# Add import html2pdf from 'html2pdf.js'
if "html2pdf.js" not in content:
    content = content.replace("import { CheckCircle2,", "import html2pdf from 'html2pdf.js';\nimport { CheckCircle2,")

# Add handleDownloadPdf inside ResultDashboard
handler = """
  const handleDownloadPdf = () => {
    const element = document.getElementById('pdf-content');
    const opt = {
      margin:       [0.2, 0.2, 0.2, 0.2],
      filename:     `ผลการทดสอบ_${student.firstName}_${student.lastName}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };
"""

content = content.replace(
    "const dominantDpt = dptInterpretations[highestDptKey];",
    "const dominantDpt = dptInterpretations[highestDptKey];\n" + handler
)

content = content.replace(
    '<div className="flex flex-col h-screen print:h-auto print:overflow-visible w-full bg-[#FDFDFF] text-slate-900 overflow-y-auto font-sans">',
    '<div className="flex flex-col h-screen print:h-auto print:overflow-visible w-full bg-[#FDFDFF] text-slate-900 overflow-y-auto font-sans" id="pdf-content">'
)

content = content.replace(
    'onClick={() => window.print()}',
    'onClick={handleDownloadPdf}'
)

with open("src/components/ResultDashboard.tsx", "w") as f:
    f.write(content)

